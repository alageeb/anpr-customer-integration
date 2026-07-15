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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anpr.display.data.model.DeviceConfig
import com.anpr.display.data.model.DisplayMode
import com.anpr.display.data.model.Language
import com.anpr.display.ui.theme.*

@Composable
fun DeviceSetupScreen(
    config: DeviceConfig,
    onConfigChange: (DeviceConfig) -> Unit,
    onTestConnection: suspend () -> Unit,
    onSave: () -> Unit
) {
    var backendUrl by remember { mutableStateOf(config.apiBaseUrl) }
    var deviceToken by remember { mutableStateOf(config.deviceToken) }
    var branchId by remember { mutableStateOf(config.branchId) }
    var screenId by remember { mutableStateOf(config.screenId) }
    var displayMode by remember { mutableStateOf(config.displayMode) }
    var language by remember { mutableStateOf(config.language) }
    var mockMode by remember { mutableStateOf(config.mockMode) }
    var testResult by remember { mutableStateOf<String?>(null) }
    var isTesting by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(800.dp)
                .padding(32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Title
            androidx.compose.material3.Text(
                text = "إعداد الجهاز",
                style = TVHeadlineMedium.copy(color = AccentBlue),
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Form Fields
            SetupTextField(
                label = "Backend URL",
                value = backendUrl,
                onValueChange = { backendUrl = it },
                placeholder = "http://192.168.1.100:3000",
                focusRequester = focusRequester
            )

            SetupTextField(
                label = "Device Token",
                value = deviceToken,
                onValueChange = { deviceToken = it },
                placeholder = "your-secret-token",
                isPassword = true
            )

            SetupTextField(
                label = "Branch ID",
                value = branchId,
                onValueChange = { branchId = it },
                placeholder = "branch-01"
            )

            SetupTextField(
                label = "Screen ID",
                value = screenId,
                onValueChange = { screenId = it },
                placeholder = "screen-lobby-01"
            )

            // Display Mode & Language Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Display Mode
                Column(modifier = Modifier.weight(1f)) {
                    androidx.compose.material3.Text(
                        text = "وضع العرض",
                        style = TVBodySmall.copy(color = TextSecondary)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        DisplayMode.entries.forEach { mode ->
                            val isSelected = mode == displayMode
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) AccentBlue else DarkSurface)
                                    .border(1.dp, if (isSelected) AccentBlue else BorderColor, RoundedCornerShape(8.dp))
                                    .focusable()
                                    .onKeyEvent { keyEvent ->
                                        if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                                            displayMode = mode
                                            true
                                        } else false
                                    }
                                    .padding(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                androidx.compose.material3.Text(
                                    text = when (mode) {
                                        DisplayMode.WELCOME -> "ترحيب"
                                        DisplayMode.QUEUE -> "قائمة"
                                        DisplayMode.AUTO_ROTATE -> "تلقائي"
                                    },
                                    style = TVBodySmall.copy(
                                        color = if (isSelected) DarkBackground else TextPrimary,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                )
                            }
                        }
                    }
                }

                // Language
                Column(modifier = Modifier.weight(1f)) {
                    androidx.compose.material3.Text(
                        text = "اللغة",
                        style = TVBodySmall.copy(color = TextSecondary)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Language.entries.forEach { lang ->
                            val isSelected = lang == language
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) AccentBlue else DarkSurface)
                                    .border(1.dp, if (isSelected) AccentBlue else BorderColor, RoundedCornerShape(8.dp))
                                    .focusable()
                                    .onKeyEvent { keyEvent ->
                                        if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                                            language = lang
                                            true
                                        } else false
                                    }
                                    .padding(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                androidx.compose.material3.Text(
                                    text = lang.displayName,
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

            // Mock Mode Toggle
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
                    text = "وضع العرض التجريبي (بدون Backend)",
                    style = TVBodyMedium
                )
                Box(
                    modifier = Modifier
                        .width(56.dp)
                        .height(28.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (mockMode) AccentGreen else TextMuted)
                        .focusable()
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Enter) {
                                mockMode = !mockMode
                                true
                            } else false
                        }
                )
            }

            // Test Result
            if (testResult != null) {
                androidx.compose.material3.Text(
                    text = testResult!!,
                    style = TVBodyMedium.copy(
                        color = if (testResult!!.contains("ناجح") || testResult!!.contains("Success")) AccentGreen else AccentRed
                    )
                )
            }

            // Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                SettingsButton(
                    text = if (isTesting) "جاري الفحص..." else "فحص الاتصال",
                    onClick = {
                        isTesting = true
                        testResult = null
                        onTestConnection()
                        isTesting = false
                        testResult = "تم الفحص"
                    },
                    isPrimary = true
                )
                Spacer(modifier = Modifier.weight(1f))
                SettingsButton(
                    text = "حفظ وبدء",
                    onClick = {
                        onConfigChange(
                            config.copy(
                                apiBaseUrl = backendUrl,
                                deviceToken = deviceToken,
                                branchId = branchId,
                                screenId = screenId,
                                displayMode = displayMode,
                                language = language,
                                mockMode = mockMode,
                                isConfigured = true
                            )
                        )
                        onSave()
                    },
                    isPrimary = true
                )
            }
        }
    }
}

@Composable
private fun SetupTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    isPassword: Boolean = false,
    focusRequester: FocusRequester? = null
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
                .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
                .focusable()
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
