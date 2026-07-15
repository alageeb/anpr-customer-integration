package com.anpr.display.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.anpr.display.data.model.DeviceConfig
import com.anpr.display.data.model.DisplayMode
import com.anpr.display.data.model.Language
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "anpr_display_settings")

class SettingsRepository(private val context: Context) {

    private object Keys {
        val API_BASE_URL = stringPreferencesKey("api_base_url")
        val DEVICE_TOKEN = stringPreferencesKey("device_token")
        val BRANCH_ID = stringPreferencesKey("branch_id")
        val SCREEN_ID = stringPreferencesKey("screen_id")
        val DISPLAY_MODE = stringPreferencesKey("display_mode")
        val LANGUAGE = stringPreferencesKey("language")
        val MOCK_MODE = booleanPreferencesKey("mock_mode")
        val SETTINGS_PIN = stringPreferencesKey("settings_pin")
        val IS_CONFIGURED = booleanPreferencesKey("is_configured")
        val WELCOME_DURATION = intPreferencesKey("welcome_duration")
        val FIRST_NAME_ONLY = booleanPreferencesKey("first_name_only")
        val HIDE_PHONE = booleanPreferencesKey("hide_phone")
        val HIDE_PARTIAL_PLATE = booleanPreferencesKey("hide_partial_plate")
    }

    suspend fun getConfig(): DeviceConfig {
        val prefs = context.dataStore.data.first()
        return DeviceConfig(
            apiBaseUrl = prefs[Keys.API_BASE_URL] ?: "",
            deviceToken = prefs[Keys.DEVICE_TOKEN] ?: "",
            branchId = prefs[Keys.BRANCH_ID] ?: "",
            screenId = prefs[Keys.SCREEN_ID] ?: "",
            displayMode = try {
                DisplayMode.valueOf(prefs[Keys.DISPLAY_MODE] ?: "AUTO_ROTATE")
            } catch (_: Exception) {
                DisplayMode.AUTO_ROTATE
            },
            language = try {
                Language.valueOf(prefs[Keys.LANGUAGE] ?: "ARABIC")
            } catch (_: Exception) {
                Language.ARABIC
            },
            mockMode = prefs[Keys.MOCK_MODE] ?: false,
            settingsPin = prefs[Keys.SETTINGS_PIN] ?: "",
            isConfigured = prefs[Keys.IS_CONFIGURED] ?: false,
            welcomeDisplayDurationSeconds = prefs[Keys.WELCOME_DURATION] ?: 5,
            showFirstNameOnly = prefs[Keys.FIRST_NAME_ONLY] ?: true,
            hidePhone = prefs[Keys.HIDE_PHONE] ?: true,
            hidePartialPlate = prefs[Keys.HIDE_PARTIAL_PLATE] ?: false
        )
    }

    suspend fun saveConfig(config: DeviceConfig) {
        context.dataStore.edit { prefs ->
            prefs[Keys.API_BASE_URL] = config.apiBaseUrl
            prefs[Keys.DEVICE_TOKEN] = config.deviceToken
            prefs[Keys.BRANCH_ID] = config.branchId
            prefs[Keys.SCREEN_ID] = config.screenId
            prefs[Keys.DISPLAY_MODE] = config.displayMode.name
            prefs[Keys.LANGUAGE] = config.language.name
            prefs[Keys.MOCK_MODE] = config.mockMode
            prefs[Keys.SETTINGS_PIN] = config.settingsPin
            prefs[Keys.IS_CONFIGURED] = config.isConfigured
            prefs[Keys.WELCOME_DURATION] = config.welcomeDisplayDurationSeconds
            prefs[Keys.FIRST_NAME_ONLY] = config.showFirstNameOnly
            prefs[Keys.HIDE_PHONE] = config.hidePhone
            prefs[Keys.HIDE_PARTIAL_PLATE] = config.hidePartialPlate
        }
    }

    suspend fun verifyPin(pin: String): Boolean {
        val config = getConfig()
        return config.settingsPin == pin
    }

    suspend fun isFirstRun(): Boolean {
        val prefs = context.dataStore.data.first()
        return !(prefs[Keys.IS_CONFIGURED] ?: false)
    }
}
