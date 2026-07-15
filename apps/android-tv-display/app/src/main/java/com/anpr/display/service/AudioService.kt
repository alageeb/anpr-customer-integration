package com.anpr.display.service

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class AudioService(private val context: Context) {

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private var toneGenerator: ToneGenerator? = null

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
        } catch (_: Exception) {
            // Audio not available
        }
    }

    fun playWelcomeSound() {
        try {
            _isPlaying.value = true
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 300)
            _isPlaying.value = false
        } catch (_: Exception) {
            // Ignore playback errors
        }
    }

    fun playCallSound() {
        try {
            _isPlaying.value = true
            toneGenerator?.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 500)
            _isPlaying.value = false
        } catch (_: Exception) {
            // Ignore playback errors
        }
    }

    fun release() {
        toneGenerator?.release()
        toneGenerator = null
    }
}
