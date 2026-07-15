package com.anpr.display.service

import com.anpr.display.data.model.ConnectionState
import com.anpr.display.data.model.DisplayEvent
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.*
import okio.ByteString
import java.util.concurrent.TimeUnit

class WebSocketService {

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    private val _events = MutableSharedFlow<DisplayEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<DisplayEvent> = _events

    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var reconnectJob: Job? = null
    private var reconnectDelay = 1000L
    private val maxReconnectDelay = 30000L
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @Volatile
    private var shouldReconnect = true

    fun connect(baseUrl: String, token: String, branchId: String, screenId: String) {
        disconnect()
        shouldReconnect = true
        reconnectDelay = 1000L
        doConnect(baseUrl, token, branchId, screenId)
    }

    private fun doConnect(baseUrl: String, token: String, branchId: String, screenId: String) {
        _connectionState.value = ConnectionState.CONNECTING

        val wsUrl = buildWsUrl(baseUrl, token, branchId, screenId)
        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connectionState.value = ConnectionState.CONNECTED
                reconnectDelay = 1000L
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                scope.launch {
                    parseEvent(text)?.let { _events.emit(it) }
                }
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                onMessage(webSocket, bytes.utf8())
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                handleDisconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                handleDisconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                handleDisconnect()
            }
        })
    }

    private fun handleDisconnect() {
        _connectionState.value = ConnectionState.DISCONNECTED
        if (shouldReconnect) {
            scheduleReconnect()
        }
    }

    private fun scheduleReconnect() {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(reconnectDelay)
            reconnectDelay = (reconnectDelay * 2).coerceAtMost(maxReconnectDelay)
            // Reconnect info is passed via connect() - stored in last params
        }
    }

    fun disconnect() {
        shouldReconnect = false
        reconnectJob?.cancel()
        webSocket?.close(1000, "Client disconnect")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    private fun buildWsUrl(baseUrl: String, token: String, branchId: String, screenId: String): String {
        val base = baseUrl.trimEnd('/')
        val wsBase = base.replace("http://", "ws://").replace("https://", "wss://")
        return "$wsBase/ws/display?token=$token&branchId=$branchId&screenId=$screenId"
    }

    private fun parseEvent(json: String): DisplayEvent? {
        return try {
            // Simple JSON parsing without full serialization dependency for WebSocket
            when {
                json.contains("\"type\":\"checkin\"") -> {
                    val name = extractField(json, "customerName")
                    val plate = extractField(json, "plateNumber")
                    val lane = extractField(json, "lane")
                    val ticket = extractField(json, "ticketNumber")
                    DisplayEvent.CheckIn(
                        customerName = name,
                        plateNumber = plate,
                        lane = lane,
                        ticketNumber = ticket
                    )
                }
                json.contains("\"type\":\"queue_update\"") -> {
                    DisplayEvent.QueueUpdate()
                }
                json.contains("\"type\":\"call_ticket\"") -> {
                    val ticket = extractField(json, "ticketNumber")
                    val name = extractField(json, "customerName")
                    val lane = extractField(json, "lane")
                    DisplayEvent.CallTicket(
                        ticketNumber = ticket,
                        customerName = name,
                        lane = lane
                    )
                }
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun extractField(json: String, field: String): String {
        val pattern = "\"$field\"\\s*:\\s*\"([^\"]*?)\""
        val regex = Regex(pattern)
        return regex.find(json)?.groupValues?.get(1) ?: ""
    }
}
