package com.anpr.display.data.model

enum class DisplayMode {
    WELCOME,
    QUEUE,
    AUTO_ROTATE
}

enum class Language(val code: String, val displayName: String) {
    ARABIC("ar", "العربية"),
    ENGLISH("en", "English")
}

enum class ConnectionState {
    CONNECTED,
    CONNECTING,
    DISCONNECTED,
    OFFLINE
}

data class DeviceConfig(
    val apiBaseUrl: String = "",
    val deviceToken: String = "",
    val branchId: String = "",
    val screenId: String = "",
    val displayMode: DisplayMode = DisplayMode.AUTO_ROTATE,
    val language: Language = Language.ARABIC,
    val mockMode: Boolean = false,
    val settingsPin: String = "",
    val isConfigured: Boolean = false,
    val welcomeDisplayDurationSeconds: Int = 5,
    val showFirstNameOnly: Boolean = true,
    val hidePhone: Boolean = true,
    val hidePartialPlate: Boolean = false
)
