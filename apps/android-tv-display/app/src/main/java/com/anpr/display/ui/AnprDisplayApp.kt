package com.anpr.display.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.anpr.display.data.model.*
import com.anpr.display.data.remote.MockDataProvider
import com.anpr.display.di.ServiceLocator
import com.anpr.display.service.WebSocketService
import com.anpr.display.ui.screens.*
import com.anpr.display.ui.theme.DarkBackground
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest

enum class AppScreen {
    SETUP,
    WELCOME,
    QUEUE,
    SETTINGS
}

@Composable
fun AnprDisplayApp(
    initialConfig: DeviceConfig,
    onSettingsAccess: () -> Unit
) {
    var config by remember { mutableStateOf(initialConfig) }
    var currentScreen by remember {
        mutableStateOf(
            if (config.isConfigured) AppScreen.QUEUE else AppScreen.SETUP
        )
    }
    var displayEvent by remember { mutableStateOf<DisplayEvent.QueueUpdate>(DisplayEvent.QueueUpdate()) }
    var connectionState by remember { mutableStateOf(ConnectionState.DISCONNECTED) }
    var welcomeEvent by remember { mutableStateOf<DisplayEvent.CheckIn?>(null) }
    var showSettings by remember { mutableStateOf(false) }

    val webSocketService = remember { ServiceLocator.webSocketService() }
    val mockDataProvider = remember { ServiceLocator.mockDataProvider() }

    // Initialize connection when config is ready
    LaunchedEffect(config) {
        if (config.isConfigured) {
            if (config.mockMode) {
                connectionState = ConnectionState.CONNECTED
                mockDataProvider.startMockEvents(15000L)
                mockDataProvider.events.collectLatest { event ->
                    handleDisplayEvent(event, config, { displayEvent = it }, { welcomeEvent = it })
                }
            } else {
                webSocketService.connect(
                    baseUrl = config.apiBaseUrl,
                    token = config.deviceToken,
                    branchId = config.branchId,
                    screenId = config.screenId
                )
                webSocketService.connectionState.collectLatest { state ->
                    connectionState = state
                }
            }
        }
    }

    // Collect WebSocket events
    LaunchedEffect(config.mockMode) {
        if (!config.mockMode && config.isConfigured) {
            webSocketService.events.collectLatest { event ->
                handleDisplayEvent(event, config, { displayEvent = it }, { welcomeEvent = it })
            }
        }
    }

    // Display mode logic
    LaunchedEffect(config.displayMode, welcomeEvent) {
        when (config.displayMode) {
            DisplayMode.WELCOME -> {
                // Show welcome if there's an event, otherwise queue
                if (welcomeEvent != null) {
                    currentScreen = AppScreen.WELCOME
                }
            }
            DisplayMode.QUEUE -> {
                currentScreen = AppScreen.QUEUE
            }
            DisplayMode.AUTO_ROTATE -> {
                if (welcomeEvent != null) {
                    currentScreen = AppScreen.WELCOME
                    delay(config.welcomeDisplayDurationSeconds * 1000L)
                    currentScreen = AppScreen.QUEUE
                    welcomeEvent = null
                }
            }
        }
    }

    // Settings access via triple-tap or PIN
    var settingsTapCount by remember { mutableIntStateOf(0) }
    var lastTapTime by remember { mutableLongStateOf(0L) }

    // Main content
    if (showSettings) {
        SettingsScreen(
            config = config,
            onTestConnection = {
                val apiService = ServiceLocator.apiService()
                apiService.testConnection(config.apiBaseUrl, config.deviceToken)
            },
            onSaveSettings = { newConfig ->
                val repository = ServiceLocator.settingsRepository()
                repository.saveConfig(newConfig.copy(isConfigured = true))
                config = newConfig.copy(isConfigured = true)
                showSettings = false
                currentScreen = AppScreen.QUEUE
            },
            onBack = { showSettings = false }
        )
    } else {
        when (currentScreen) {
            AppScreen.SETUP -> {
                DeviceSetupScreen(
                    config = config,
                    onConfigChange = { config = it },
                    onTestConnection = {
                        val apiService = ServiceLocator.apiService()
                        apiService.testConnection(config.apiBaseUrl, config.deviceToken)
                    },
                    onSave = {
                        val repository = ServiceLocator.settingsRepository()
                        repository.saveConfig(config.copy(isConfigured = true))
                        config = config.copy(isConfigured = true)
                        currentScreen = AppScreen.QUEUE
                    }
                )
            }
            AppScreen.WELCOME -> {
                welcomeEvent?.let { event ->
                    WelcomeScreen(
                        event = event,
                        durationSeconds = config.welcomeDisplayDurationSeconds,
                        onFinished = {
                            when (config.displayMode) {
                                DisplayMode.AUTO_ROTATE -> {
                                    currentScreen = AppScreen.QUEUE
                                    welcomeEvent = null
                                }
                                DisplayMode.WELCOME -> {
                                    // Stay on welcome
                                }
                                DisplayMode.QUEUE -> {
                                    currentScreen = AppScreen.QUEUE
                                }
                            }
                        },
                        firstNameOnly = config.showFirstNameOnly
                    )
                }
            }
            AppScreen.QUEUE -> {
                QueueBoardScreen(
                    queueData = displayEvent,
                    connectionState = connectionState,
                    lastCheckIn = welcomeEvent
                )
            }
            AppScreen.SETTINGS -> {
                // Handled above
            }
        }
    }
}

private fun handleDisplayEvent(
    event: DisplayEvent,
    config: DeviceConfig,
    onQueueUpdate: (DisplayEvent.QueueUpdate) -> Unit,
    onCheckIn: (DisplayEvent.CheckIn) -> Unit
) {
    when (event) {
        is DisplayEvent.CheckIn -> {
            onCheckIn(event)
        }
        is DisplayEvent.QueueUpdate -> {
            onQueueUpdate(event)
        }
        is DisplayEvent.CallTicket -> {
            // Play call sound
            ServiceLocator.audioService().playCallSound()
        }
        is DisplayEvent.ConnectionLost -> {}
        is DisplayEvent.ConnectionRestored -> {}
    }
}
