package com.anpr.display.di

import android.content.Context
import com.anpr.display.data.local.SettingsRepository
import com.anpr.display.data.remote.ApiService
import com.anpr.display.data.remote.MockDataProvider
import com.anpr.display.service.AudioService
import com.anpr.display.service.WebSocketService

object ServiceLocator {

    private var settingsRepository: SettingsRepository? = null
    private var apiService: ApiService? = null
    private var webSocketService: WebSocketService? = null
    private var mockDataProvider: MockDataProvider? = null
    private var audioService: AudioService? = null

    fun init(context: Context) {
        settingsRepository = SettingsRepository(context.applicationContext)
        apiService = ApiService()
        webSocketService = WebSocketService()
        mockDataProvider = MockDataProvider()
        audioService = AudioService(context.applicationContext)
    }

    fun settingsRepository(): SettingsRepository {
        return settingsRepository ?: throw IllegalStateException("ServiceLocator not initialized")
    }

    fun apiService(): ApiService {
        return apiService ?: throw IllegalStateException("ServiceLocator not initialized")
    }

    fun webSocketService(): WebSocketService {
        return webSocketService ?: throw IllegalStateException("ServiceLocator not initialized")
    }

    fun mockDataProvider(): MockDataProvider {
        return mockDataProvider ?: throw IllegalStateException("ServiceLocator not initialized")
    }

    fun audioService(): AudioService {
        return audioService ?: throw IllegalStateException("ServiceLocator not initialized")
    }

    fun destroy() {
        mockDataProvider?.destroy()
        audioService?.release()
        webSocketService?.disconnect()
        settingsRepository = null
        apiService = null
        webSocketService = null
        mockDataProvider = null
        audioService = null
    }
}
