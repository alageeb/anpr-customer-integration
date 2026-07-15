package com.anpr.display.data.model

sealed class DisplayEvent {
    data class CheckIn(
        val customerName: String,
        val plateNumber: String,
        val lane: String,
        val ticketNumber: String,
        val timestamp: Long = System.currentTimeMillis()
    ) : DisplayEvent()

    data class QueueUpdate(
        val nowServing: List<QueueEntry> = emptyList(),
        val waiting: List<QueueEntry> = emptyList(),
        val timestamp: Long = System.currentTimeMillis()
    ) : DisplayEvent()

    data class CallTicket(
        val ticketNumber: String,
        val customerName: String,
        val lane: String,
        val timestamp: Long = System.currentTimeMillis()
    ) : DisplayEvent()

    data object ConnectionLost : DisplayEvent()
    data object ConnectionRestored : DisplayEvent()
}

data class QueueEntry(
    val ticketNumber: String,
    val customerName: String,
    val plateNumber: String,
    val lane: String,
    val waitTimeMinutes: Int = 0,
    val status: String = "waiting"
)
