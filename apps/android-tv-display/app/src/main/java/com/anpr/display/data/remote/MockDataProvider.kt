package com.anpr.display.data.remote

import com.anpr.display.data.model.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

class MockDataProvider {

    private val _events = MutableSharedFlow<DisplayEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<DisplayEvent> = _events

    private var mockJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private val customerNames = listOf(
        "أحمد محمد", "فاطمة علي", "خالد العتيبي", "نورة الشمري",
        "عبدالله السالم", "مريم الحربي", "يوسف الدوسري", "سارة القحطاني"
    )

    private val plates = listOf(
        "40-00000", "25-64831", "4-66759", "18-12345",
        "7-00987", "33-45678", "12-11111", "5-54321"
    )

    private val lanes = listOf("A", "B", "C", "VIP")
    private var ticketCounter = 1000

    fun startMockEvents(intervalMs: Long = 15000L) {
        stopMockEvents()
        mockJob = scope.launch {
            while (isActive) {
                delay(intervalMs)
                emitRandomEvent()
            }
        }
    }

    fun stopMockEvents() {
        mockJob?.cancel()
        mockJob = null
    }

    private suspend fun emitRandomEvent() {
        val event = when ((0..2).random()) {
            0 -> {
                ticketCounter++
                val name = customerNames.random()
                DisplayEvent.CheckIn(
                    customerName = name,
                    plateNumber = plates.random(),
                    lane = lanes.random(),
                    ticketNumber = "T-$ticketCounter"
                )
            }
            1 -> {
                ticketCounter++
                DisplayEvent.CallTicket(
                    ticketNumber = "T-$ticketCounter",
                    customerName = customerNames.random(),
                    lane = lanes.random()
                )
            }
            else -> {
                val entries = (1..5).map { i ->
                    QueueEntry(
                        ticketNumber = "T-${ticketCounter + i}",
                        customerName = customerNames.random(),
                        plateNumber = plates.random(),
                        lane = lanes.random(),
                        waitTimeMinutes = (1..15).random(),
                        status = if (i == 1) "serving" else "waiting"
                    )
                }
                DisplayEvent.QueueUpdate(
                    nowServing = entries.filter { it.status == "serving" },
                    waiting = entries.filter { it.status == "waiting" }
                )
            }
        }
        _events.emit(event)
    }

    fun getMockLookupResult(plateNumber: String): CustomerLookupResult {
        val name = customerNames.random()
        return CustomerLookupResult(
            found = true,
            plateNumber = plateNumber,
            platePrefix = plateNumber.split("-").firstOrNull() ?: "",
            plateSerial = plateNumber.split("-").lastOrNull() ?: "",
            normalizedPlate = plateNumber,
            customer = CustomerRecord(
                externalCustomerId = "CUST-${(1000..9999).random()}",
                name = name,
                phone = "+965${(60000000..69999999).random()}",
                status = "active"
            ),
            vehicle = VehicleRecord(
                externalVehicleId = "VEH-${(1000..9999).random()}",
                plateNumber = plateNumber,
                model = listOf("Toyota Camry", "Nissan Altima", "Honda Accord", "Hyundai Sonata").random(),
                color = listOf("White", "Black", "Silver", "Gray").random(),
                status = "active",
                customerId = "CUST-${(1000..9999).random()}"
            ),
            accessDecision = AccessDecision(
                allowed = true,
                reason = "Active customer and registered vehicle"
            )
        )
    }

    fun destroy() {
        scope.cancel()
    }
}
