package com.anpr.display.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CustomerLookupResult(
    val found: Boolean = false,
    val plateNumber: String = "",
    val platePrefix: String = "",
    val plateSerial: String = "",
    val normalizedPlate: String = "",
    val customer: CustomerRecord? = null,
    val vehicle: VehicleRecord? = null,
    val accessDecision: AccessDecision = AccessDecision(),
    val systemAvailable: Boolean? = null
)

@Serializable
data class CustomerRecord(
    val externalCustomerId: String = "",
    val name: String = "",
    val phone: String = "",
    val status: String = ""
)

@Serializable
data class VehicleRecord(
    val externalVehicleId: String = "",
    val plateNumber: String = "",
    val platePrefix: String = "",
    val plateSerial: String = "",
    val normalizedPlate: String = "",
    val model: String = "",
    val color: String = "",
    val status: String = "",
    val customerId: String = "",
    val permitExpiry: String? = null
)

@Serializable
data class AccessDecision(
    val allowed: Boolean = false,
    val reason: String = ""
)
