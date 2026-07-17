package com.anpr.display.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anpr.display.data.model.DisplayEvent
import com.anpr.display.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun WelcomeScreen(
    event: DisplayEvent.CheckIn,
    durationSeconds: Int = 5,
    onFinished: () -> Unit,
    firstNameOnly: Boolean = true
) {
    var remainingSeconds by remember { mutableIntStateOf(durationSeconds) }
    var isVisible by remember { mutableStateOf(false) }

    val fadeIn = animateFloatAsState(
        targetValue = if (isVisible) 1f else 0f,
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "fadeIn"
    )

    val scale = animateFloatAsState(
        targetValue = if (isVisible) 1f else 0.8f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "scale"
    )

    LaunchedEffect(event) {
        isVisible = true
    }

    LaunchedEffect(durationSeconds) {
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds--
        }
        isVisible = false
        delay(800)
        onFinished()
    }

    val displayName = if (firstNameOnly) {
        event.customerName.split(" ").firstOrNull() ?: event.customerName
    } else {
        event.customerName
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(WelcomeGradientStart, WelcomeGradientEnd)
                )
            )
            .alpha(fadeIn.value),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(80.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Welcome Title
            androidx.compose.material3.Text(
                text = "مرحباً" ,
                style = TVHeadlineLarge.copy(
                    color = WelcomeAccent,
                    fontSize = 80.sp
                ),
                modifier = Modifier
                    .padding(bottom = 24.dp)
                    .scale(scale.value)
            )

            // Customer Name
            androidx.compose.material3.Text(
                text = displayName,
                style = TVHeadlineMedium.copy(
                    fontSize = 64.sp,
                    color = TextPrimary
                ),
                modifier = Modifier
                    .padding(bottom = 48.dp)
                    .scale(scale.value),
                textAlign = TextAlign.Center
            )

            // Plate Number
            androidx.compose.material3.Text(
                text = event.plateNumber,
                style = TVPlateNumber.copy(fontSize = 56.sp),
                modifier = Modifier.padding(bottom = 32.dp)
            )

            // Ticket & Lane
            Row(
                horizontalArrangement = Arrangement.spacedBy(60.dp),
                modifier = Modifier.padding(bottom = 48.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    androidx.compose.material3.Text(
                        text = "رقم التذكرة",
                        style = TVBodyMedium
                    )
                    androidx.compose.material3.Text(
                        text = event.ticketNumber,
                        style = TVHeadlineSmall.copy(color = AccentBlue)
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    androidx.compose.material3.Text(
                        text = "الممر",
                        style = TVBodyMedium
                    )
                    androidx.compose.material3.Text(
                        text = event.lane,
                        style = TVHeadlineSmall.copy(color = AccentYellow)
                    )
                }
            }

            // Countdown
            androidx.compose.material3.Text(
                text = remainingSeconds.toString(),
                style = TVTimeDisplay.copy(
                    fontSize = 48.sp,
                    color = TextMuted
                )
            )
        }
    }
}
