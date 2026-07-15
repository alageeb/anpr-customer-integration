package com.anpr.display

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.anpr.display.data.model.DeviceConfig
import com.anpr.display.di.ServiceLocator
import com.anpr.display.service.WakeScreenService
import com.anpr.display.ui.AnprDisplayApp
import com.anpr.display.ui.theme.DarkBackground
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    private lateinit var wakeScreenService: WakeScreenService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enter immersive mode and acquire wake lock
        wakeScreenService = WakeScreenService(this)
        wakeScreenService.acquire()
        wakeScreenService.enterImmersiveMode()

        // Prevent exiting via task manager
        setTaskDescription(
            android.app.ActivityManager.TaskDescription(
                "ANPR Display",
                null,
                DarkBackground.hashCode()
            )
        )

        setContent {
            var config by remember { mutableStateOf(DeviceConfig()) }
            var isLoaded by remember { mutableStateOf(false) }

            LaunchedEffect(Unit) {
                withContext(Dispatchers.IO) {
                    val repository = ServiceLocator.settingsRepository()
                    config = repository.getConfig()
                }
                isLoaded = true
            }

            if (isLoaded) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DarkBackground)
                ) {
                    AnprDisplayApp(
                        initialConfig = config,
                        onSettingsAccess = {
                            // Settings access handled inside AnprDisplayApp
                        }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        wakeScreenService.enterImmersiveMode()
    }

    override fun onDestroy() {
        super.onDestroy()
        wakeScreenService.release()
    }

    // Block back button in normal mode
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Do nothing - prevent exit via back button
        // Settings access is via PIN only
    }
}
