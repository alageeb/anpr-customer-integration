package com.anpr.display.ui.theme

import androidx.compose.tv.material3.ExperimentalTvMaterial3Api
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Colors
val DarkBackground = Color(0xFF0F172A)
val DarkSurface = Color(0xFF1E293B)
val DarkCard = Color(0xFF1E293B)
val AccentBlue = Color(0xFF38BDF8)
val AccentGreen = Color(0xFF34D399)
val AccentRed = Color(0xFFF87171)
val AccentYellow = Color(0xFFFBBF24)
val AccentPurple = Color(0xFFA78BFA)
val TextPrimary = Color(0xFFE2E8F0)
val TextSecondary = Color(0xFF94A3B8)
val TextMuted = Color(0xFF64748B)
val BorderColor = Color(0xFF334155)

// Welcome Screen Colors
val WelcomeGradientStart = Color(0xFF1E3A5F)
val WelcomeGradientEnd = Color(0xFF0F172A)
val WelcomeAccent = Color(0xFF38BDF8)

// Queue Screen Colors
val QueueServingColor = Color(0xFF34D399)
val QueueWaitingColor = Color(0xFFFBBF24)
val QueueLaneColor = Color(0xFF38BDF8)

// Settings Colors
val SettingsBackground = Color(0xFF0F172A)
val SettingsCard = Color(0xFF1E293B)
val SettingsInput = Color(0xFF0F172A)

// Typography
val TVHeadlineLarge = TextStyle(
    fontSize = 64.sp,
    fontWeight = FontWeight.Bold,
    color = TextPrimary,
    letterSpacing = 2.sp
)

val TVHeadlineMedium = TextStyle(
    fontSize = 40.sp,
    fontWeight = FontWeight.Bold,
    color = TextPrimary,
    letterSpacing = 1.sp
)

val TVHeadlineSmall = TextStyle(
    fontSize = 28.sp,
    fontWeight = FontWeight.SemiBold,
    color = TextPrimary
)

val TVBodyLarge = TextStyle(
    fontSize = 24.sp,
    fontWeight = FontWeight.Normal,
    color = TextPrimary
)

val TVBodyMedium = TextStyle(
    fontSize = 20.sp,
    fontWeight = FontWeight.Normal,
    color = TextSecondary
)

val TVBodySmall = TextStyle(
    fontSize = 16.sp,
    fontWeight = FontWeight.Normal,
    color = TextMuted
)

val TVPlateNumber = TextStyle(
    fontSize = 72.sp,
    fontWeight = FontWeight.Black,
    color = AccentBlue,
    letterSpacing = 6.sp
)

val TVTicketNumber = TextStyle(
    fontSize = 56.sp,
    fontWeight = FontWeight.Bold,
    color = AccentBlue
)

val TVTimeDisplay = TextStyle(
    fontSize = 32.sp,
    fontWeight = FontWeight.Light,
    color = TextSecondary
)
