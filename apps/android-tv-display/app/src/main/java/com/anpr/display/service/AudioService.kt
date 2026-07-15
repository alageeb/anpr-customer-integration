package com.anpr.display.service

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import com.anpr.display.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class AudioService(private val context: Context) {

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private var welcomePlayer: MediaPlayer? = null
    private var callPlayer: MediaPlayer? = null

    private val audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

    init {
        try {
            welcomePlayer = MediaPlayer.create(context, R.raw.welcome).apply {
                setAudioAttributes(audioAttributes)
                setOnCompletionListener { _isPlaying.value = false }
            }
        } catch (_: Exception) {
            // Sound file may not exist yet
        }

        try {
            callPlayer = MediaPlayer.create(context, R.raw.call).apply {
                setAudioAttributes(audioAttributes)
                setOnCompletionListener { _isPlaying.value = false }
            }
        } catch (_: Exception) {
            // Sound file may not exist
        }
    }

    fun playWelcomeSound() {
        try {
            welcomePlayer?.let {
                if (it.isPlaying) it.stop()
                it.prepare()
                it.start()
                _isPlaying.value = true
            }
        } catch (_: Exception) {
            // Ignore playback errors
        }
    }

    fun playCallSound() {
        try {
            callPlayer?.let {
                if (it.isPlaying) it.stop()
                it.prepare()
                it.start()
                _isPlaying.value = true
            }
        } catch (_: Exception) {
            // Ignore playback errors
        }
    }

    fun release() {
        welcomePlayer?.release()
        callPlayer?.release()
        welcomePlayer = null
        callPlayer = null
    }
}
