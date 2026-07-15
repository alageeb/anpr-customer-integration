package com.anpr.display.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anpr.display.data.model.*
import com.anpr.display.ui.theme.*
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun QueueBoardScreen(
    queueData: DisplayEvent.QueueUpdate,
    connectionState: ConnectionState,
    lastCheckIn: DisplayEvent.CheckIn?
) {
    var currentTime by remember { mutableStateOf(formatCurrentTime()) }

    LaunchedEffect(Unit) {
        while (true) {
            currentTime = formatCurrentTime()
            delay(1000)
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(DarkBackground, Color(0xFF0A101D))
                )
            )
            .padding(48.dp),
        horizontalArrangement = Arrangement.spacedBy(48.dp)
    ) {
        // Left Column - Now Serving
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Text(
                    text = "الآن في الخدمة",
                    style = TVHeadlineMedium.copy(color = QueueServingColor)
                )
                ConnectionIndicator(connectionState)
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Now Serving Cards
            queueData.nowServing.forEach { entry ->
                ServingCard(entry = entry, isPrimary = entry == queueData.nowServing.firstOrNull())
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (queueData.nowServing.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.Text(
                        text = "لا يوجد عملاء حالياً",
                        style = TVBodyLarge.copy(color = TextMuted)
                    )
                }
            }
        }

        // Divider
        Box(
            modifier = Modifier
                .width(2.dp)
                .fillMaxHeight()
                .background(BorderColor)
        )

        // Right Column - Waiting Queue
        Column(
            modifier = Modifier
                .weight(1.5f)
                .fillMaxHeight()
        ) {
            // Header with Time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Text(
                    text = "قائمة الانتظار",
                    style = TVHeadlineMedium.copy(color = QueueWaitingColor)
                )
                androidx.compose.material3.Text(
                    text = currentTime,
                    style = TVTimeDisplay
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Waiting Queue Items
            queueData.waiting.forEach { entry ->
                WaitingCard(entry = entry)
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (queueData.waiting.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.Text(
                        text = "قائمة الانتظار فارغة",
                        style = TVBodyLarge.copy(color = TextMuted)
                    )
                }
            }
        }
    }
}

@Composable
private fun ServingCard(entry: QueueEntry, isPrimary: Boolean) {
    val cardHeight = if (isPrimary) 160.dp else 120.dp
    val borderColor = if (isPrimary) QueueServingColor else Color.Transparent

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(cardHeight)
            .clip(RoundedCornerShape(16.dp))
            .background(DarkSurface)
            .border(2.dp, borderColor, RoundedCornerShape(16.dp))
            .padding(24.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                androidx.compose.material3.Text(
                    text = entry.ticketNumber,
                    style = TVTicketNumber.copy(
                        fontSize = if (isPrimary) 48.sp else 36.sp,
                        color = QueueServingColor
                    )
                )
                androidx.compose.material3.Text(
                    text = entry.customerName,
                    style = TVBodyLarge.copy(
                        fontSize = if (isPrimary) 24.sp else 20.sp
                    )
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                androidx.compose.material3.Text(
                    text = "الممر ${entry.lane}",
                    style = TVHeadlineSmall.copy(color = QueueLaneColor)
                )
                androidx.compose.material3.Text(
                    text = entry.plateNumber,
                    style = TVBodyMedium.copy(color = TextMuted)
                )
            }
        }
    }
}

@Composable
private fun WaitingCard(entry: QueueEntry) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(DarkSurface)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            androidx.compose.material3.Text(
                text = entry.ticketNumber,
                style = TVBodyLarge.copy(
                    color = QueueWaitingColor,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )
            )
            androidx.compose.material3.Text(
                text = entry.customerName,
                style = TVBodyLarge
            )
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            androidx.compose.material3.Text(
                text = entry.plateNumber,
                style = TVBodyMedium.copy(color = TextMuted)
            )
            androidx.compose.material3.Text(
                text = "${entry.waitTimeMinutes} دقيقة",
                style = TVBodySmall
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(QueueLaneColor.copy(alpha = 0.2f))
                    .padding(horizontal = 12.dp, vertical = 4.dp)
            ) {
                androidx.compose.material3.Text(
                    text = entry.lane,
                    style = TVBodySmall.copy(color = QueueLaneColor)
                )
            }
        }
    }
}

@Composable
fun ConnectionIndicator(state: ConnectionState) {
    val color = when (state) {
        ConnectionState.CONNECTED -> AccentGreen
        ConnectionState.CONNECTING -> AccentYellow
        ConnectionState.DISCONNECTED -> AccentRed
        ConnectionState.OFFLINE -> AccentRed
    }
    val text = when (state) {
        ConnectionState.CONNECTED -> "متصل"
        ConnectionState.CONNECTING -> "جاري الاتصال..."
        ConnectionState.DISCONNECTED -> "غير متصل"
        ConnectionState.OFFLINE -> "غير متصل"
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(color)
        )
        androidx.compose.material3.Text(
            text = text,
            style = TVBodySmall.copy(color = color)
        )
    }
}

private fun formatCurrentTime(): String {
    val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    return sdf.format(Date())
}

private val sp = androidx.compose.ui.unit.sp
