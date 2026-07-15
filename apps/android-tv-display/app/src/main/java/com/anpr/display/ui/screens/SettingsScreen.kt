package com.anpr.display.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anpr.display.data.model.*
import com.anpr.display.ui.theme.*
import kotlinx.coroutines.launch

enum class SettingsPage {
    PIN_ENTRY,
    MAIN_SETTINGS,
    DEVICE_STATUS
}

@Composable
fun SettingsScreen(
    config: DeviceConfig,
    onTestConnection: suspend () -> Boolean,
    onSaveSettings: (DeviceConfig) -> Unit,
    onBack: () -> Unit
) {
    var currentPage by remember { mutableStateOf(SettingsPage.PIN_ENTRY) }
    var pinInput by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf(false) }
    var editedConfig by remember { mutableStateOf(config) }
    var testResult by remember { mutableStateOf<String?>(null) }
    var isTesting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    when (currentPage) {
        SettingsPage.PIN_ENTRY -> {
            PinEntryScreen(
                pin = pinInput,
                error = pinError,
                onPinChange = { pinInput = it; pinError = false },
                onSubmit = {
                    if (pinInput == config.settingsPin) {
                        currentPage = SettingsPage.MAIN_SETTINGS
                    } else {
                        pinError = true
                        pinInput = ""
                    }
                },
                onBack = onBack
            )
        }
        SettingsPage.MAIN_SETTINGS -> {
            MainSettingsScreen(
                config = editedConfig,
                onConfigChange = { editedConfig = it },
                onTestConnection = {
                    isTesting = true
                    val result = onTestConnection()
                    testResult = if (result) "الاتصال ناجح" : "فشل الاتصال"
                    isTesting = false
                },
                testResult = testResult,
                isTesting = isTesting,
                onSave = {
                    scope.launch {
                        onSaveSettings(editedConfig)
                        onBack()
                    }
                },
                onShowStatus = { currentPage = SettingsPage.DEVICE_STATUS },
                onBack = { currentPage = SettingsPage.PIN_ENTRY }
            )
        }
        SettingsPage.DEVICE_STATUS -> {
            DeviceStatusScreen(
                config = config,
                onBack = { currentPage = SettingsPage.MAIN_SETTINGS }
            )
        }
    }
}

@Composable
private fun PinEntryScreen(
    pin: String,
    error: Boolean,
    onPinChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit
) {
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground)
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Back) {
                    onBack()
                    true
                } else false
            },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.width(400.dp)
        ) {
            androidx.compose.material3.Text(
                text = "إعدادات الشاشة",
                style = TVHeadlineSmall
            )

            androidx.compose.material3.Text(
                text = "أدخل رمز الدخول",
                style = TVBodyMedium
            )

            BasicTextField(
                value = pin,
                onValueChange = { if (it.length <= 6) onPinChange(it) },
                modifier = Modifier
                    .focusRequester(focusRequester)
                    .focusable()
                    .onKeyEvent { keyEvent ->
                        if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                            onSubmit()
                            true
                        } else false
                    },
                textStyle = TextStyle(
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    letterSpacing = 12.sp
                ),
                cursorBrush = SolidColor(AccentBlue),
                decorationBox = { innerTextField ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(DarkSurface)
                            .border(
                                width = 2.dp,
                                color = if (error) AccentRed else AccentBlue,
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(horizontal = 20.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        if (pin.isEmpty()) {
                            androidx.compose.material3.Text(
                                text = "••••••",
                                style = TextStyle(
                                    fontSize = 32.sp,
                                    color = TextMuted,
                                    letterSpacing = 12.sp
                                )
                            )
                        }
                        innerTextField()
                    }
                }
            )

            if (error) {
                androidx.compose.material3.Text(
                    text = "رمز خاطئ",
                    style = TVBodyMedium.copy(color = AccentRed)
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                SettingsButton(text = "دخول", onClick = onSubmit, isPrimary = true)
                SettingsButton(text = "رجوع", onClick = onBack)
            }
        }
    }
}

@Composable
private fun MainSettingsScreen(
    config: DeviceConfig,
    onConfigChange: (DeviceConfig) -> Unit,
    onTestConnection: () -> Unit,
    testResult: String?,
    isTesting: Boolean,
    onSave: () -> Unit,
    onShowStatus: () -> Unit,
    onBack: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground)
            .padding(48.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Text(
                    text = "إعدادات الجهاز",
                    style = TVHeadlineMedium
                )
                SettingsButton(text = "رجوع", onClick = onBack)
            }

            Spacer(modifier = Modifier.height(32.dp))

            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(32.dp)
            ) {
                // Left Column - Configuration
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    SettingsTextField(
                        label = "Backend URL",
                        value = config.apiBaseUrl,
                        onValueChange = { onConfigChange(config.copy(apiBaseUrl = it)) },
                        placeholder = "http://192.168.1.100:3000"
                    )
                    SettingsTextField(
                        label = "Device Token",
                        value = config.deviceToken,
                        onValueChange = { onConfigChange(config.copy(deviceToken = it)) },
                        placeholder = "your-secret-token",
                        isPassword = true
                    )
                    SettingsTextField(
                        label = "Branch ID",
                        value = config.branchId,
                        onValueChange = { onConfigChange(config.copy(branchId = it)) },
                        placeholder = "branch-01"
                    )
                    SettingsTextField(
                        label = "Screen ID",
                        value = config.screenId,
                        onValueChange = { onConfigChange(config.copy(screenId = it)) },
                        placeholder = "screen-lobby-01"
                    )
                }

                // Right Column - Options
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Display Mode
                    SettingsDropdown(
                        label = "وضع العرض",
                        selected = config.displayMode.name,
                        options = DisplayMode.entries.map { it.name },
                        onSelect = { onConfigChange(config.copy(displayMode = DisplayMode.valueOf(it))) }
                    )

                    // Language
                    SettingsDropdown(
                        label = "اللغة",
                        selected = config.language.name,
                        options = Language.entries.map { it.name },
                        onSelect = { onConfigChange(config.copy(language = Language.valueOf(it))) }
                    )

                    // Welcome Duration
                    SettingsTextField(
                        label = "مدة الترحيب (ثانية)",
                        value = config.welcomeDisplayDurationSeconds.toString(),
                        onValueChange = {
                            it.toIntOrNull()?.let { secs ->
                                onConfigChange(config.copy(welcomeDisplayDurationSeconds = secs))
                            }
                        },
                        placeholder = "5"
                    )

                    // Mock Mode
                    SettingsToggle(
                        label = "وضع العرض التجريبي",
                        checked = config.mockMode,
                        onCheckedChange = { onConfigChange(config.copy(mockMode = it)) }
                    )

                    // Privacy
                    SettingsToggle(
                        label = "عرض الاسم الأول فقط",
                        checked = config.showFirstNameOnly,
                        onCheckedChange = { onConfigChange(config.copy(showFirstNameOnly = it)) }
                    )
                    SettingsToggle(
                        label = "إخفاء رقم الهاتف",
                        checked = config.hidePhone,
                        onCheckedChange = { onConfigChange(config.copy(hidePhone = it)) }
                    )
                }
            }

            // Bottom Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SettingsButton(
                        text = if (isTesting) "جاري الفحص..." else "فحص الاتصال",
                        onClick = onTestConnection,
                        isPrimary = true
                    )
                    if (testResult != null) {
                        androidx.compose.material3.Text(
                            text = testResult,
                            style = TVBodyMedium.copy(
                                color = if (testResult!!.contains("ناجح")) AccentGreen else AccentRed
                            ),
                            modifier = Modifier.align(Alignment.CenterVertically)
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SettingsButton(text = "حالة الجهاز", onClick = onShowStatus)
                    SettingsButton(text = "حفظ وبدء", onClick = onSave, isPrimary = true)
                }
            }
        }
    }
}

@Composable
private fun DeviceStatusScreen(
    config: DeviceConfig,
    onBack: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground)
            .padding(48.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Text(
                    text = "حالة الجهاز",
                    style = TVHeadlineMedium
                )
                SettingsButton(text = "رجوع", onClick = onBack)
            }

            Spacer(modifier = Modifier.height(32.dp))

            Column(
                modifier = Modifier.width(600.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                StatusRow("Backend URL", config.apiBaseUrl.ifEmpty { "غير محدد" })
                StatusRow("Screen ID", config.screenId.ifEmpty { "غير محدد" })
                StatusRow("Branch ID", config.branchId.ifEmpty { "غير محدد" })
                StatusRow("App Version", "1.0.0")
                StatusRow("Device Model", android.os.Build.MODEL)
                StatusRow("Mock Mode", if (config.mockMode) "مفعّل" else "معطّل")
                StatusRow("Display Mode", config.displayMode.name)
                StatusRow("Language", config.language.displayName)
            }
        }
    }
}

@Composable
private fun SettingsTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    isPassword: Boolean = false
) {
    Column {
        androidx.compose.material3.Text(
            text = label,
            style = TVBodySmall.copy(color = TextSecondary)
        )
        Spacer(modifier = Modifier.height(4.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(DarkSurface)
                .border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                .padding(horizontal = 12.dp),
            textStyle = TextStyle(fontSize = 18.sp, color = TextPrimary),
            cursorBrush = SolidColor(AccentBlue),
            singleLine = true,
            decorationBox = { innerTextField ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) {
                        androidx.compose.material3.Text(
                            text = placeholder,
                            style = TextStyle(fontSize = 18.sp, color = TextMuted)
                        )
                    }
                    innerTextField()
                }
            }
        )
    }
}

@Composable
private fun SettingsDropdown(
    label: String,
    selected: String,
    options: List<String>,
    onSelect: (String) -> Unit
) {
    Column {
        androidx.compose.material3.Text(
            text = label,
            style = TVBodySmall.copy(color = TextSecondary)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option ->
                val isSelected = option == selected
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSelected) AccentBlue else DarkSurface)
                        .border(1.dp, if (isSelected) AccentBlue else BorderColor, RoundedCornerShape(8.dp))
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .focusable()
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                                onSelect(option)
                                true
                            } else false
                        }
                ) {
                    androidx.compose.material3.Text(
                        text = option,
                        style = TVBodySmall.copy(
                            color = if (isSelected) DarkBackground else TextPrimary,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsToggle(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(DarkSurface)
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        androidx.compose.material3.Text(
            text = label,
            style = TVBodyMedium
        )
        Box(
            modifier = Modifier
                .width(56.dp)
                .height(28.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (checked) AccentGreen else TextMuted)
                .focusable()
                .onKeyEvent { keyEvent ->
                    if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                        onCheckedChange(!checked)
                        true
                    } else false
                }
        )
    }
}

@Composable
private fun StatusRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(DarkSurface)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        androidx.compose.material3.Text(
            text = label,
            style = TVBodyMedium.copy(color = TextSecondary)
        )
        androidx.compose.material3.Text(
            text = value,
            style = TVBodyMedium.copy(fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
fun SettingsButton(
    text: String,
    onClick: () -> Unit,
    isPrimary: Boolean = false
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isPrimary) AccentBlue else DarkSurface)
            .border(1.dp, if (isPrimary) AccentBlue else BorderColor, RoundedCornerShape(8.dp))
            .focusable()
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                    onClick()
                    true
                } else false
            }
            .padding(horizontal = 24.dp, vertical = 12.dp)
    ) {
        androidx.compose.material3.Text(
            text = text,
            style = TVBodyMedium.copy(
                color = if (isPrimary) DarkBackground else TextPrimary,
                fontWeight = FontWeight.Bold
            )
        )
    }
}
