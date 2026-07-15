package com.anpr.display.data.remote

import com.anpr.display.data.model.CustomerLookupResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val jsonType = "application/json; charset=utf-8".toMediaType()

    suspend fun lookupPlate(
        baseUrl: String,
        token: String,
        plateNumber: String,
        cameraId: String = "display-screen"
    ): CustomerLookupResult = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("plateNumber", plateNumber)
            put("cameraId", cameraId)
            put("eventTime", java.time.Instant.now().toString())
        }

        val request = Request.Builder()
            .url("${baseUrl.trimEnd('/')}/api/anpr/customer-lookup")
            .addHeader("x-anpr-secret", token)
            .post(body.toString().toRequestBody(jsonType))
            .build()

        val response = client.newCall(request).execute()
        if (response.isSuccessful) {
            val responseBody = response.body?.string() ?: "{}"
            parseLookupResult(responseBody)
        } else {
            CustomerLookupResult()
        }
    }

    suspend fun testConnection(
        baseUrl: String,
        token: String
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("${baseUrl.trimEnd('/')}/api/diagnostic/test-connection")
                .addHeader("x-anpr-secret", token)
                .get()
                .build()

            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (_: Exception) {
            false
        }
    }

    private fun parseLookupResult(json: String): CustomerLookupResult {
        return try {
            val obj = JSONObject(json)
            CustomerLookupResult(
                found = obj.optBoolean("found", false),
                plateNumber = obj.optString("plateNumber", ""),
                platePrefix = obj.optString("platePrefix", ""),
                plateSerial = obj.optString("plateSerial", ""),
                normalizedPlate = obj.optString("normalizedPlate", ""),
                customer = obj.optJSONObject("customer")?.let {
                    com.anpr.display.data.model.CustomerRecord(
                        externalCustomerId = it.optString("externalCustomerId", ""),
                        name = it.optString("name", ""),
                        phone = it.optString("phone", ""),
                        status = it.optString("status", "")
                    )
                },
                vehicle = obj.optJSONObject("vehicle")?.let {
                    com.anpr.display.data.model.VehicleRecord(
                        externalVehicleId = it.optString("externalVehicleId", ""),
                        plateNumber = it.optString("plateNumber", ""),
                        platePrefix = it.optString("platePrefix", ""),
                        plateSerial = it.optString("plateSerial", ""),
                        normalizedPlate = it.optString("normalizedPlate", ""),
                        model = it.optString("model", ""),
                        color = it.optString("color", ""),
                        status = it.optString("status", ""),
                        customerId = it.optString("customerId", ""),
                        permitExpiry = it.optString("permitExpiry", null)
                    )
                },
                accessDecision = obj.optJSONObject("accessDecision")?.let {
                    com.anpr.display.data.model.AccessDecision(
                        allowed = it.optBoolean("allowed", false),
                        reason = it.optString("reason", "")
                    )
                } ?: com.anpr.display.data.model.AccessDecision(),
                systemAvailable = if (obj.has("systemAvailable")) obj.optBoolean("systemAvailable") else null
            )
        } catch (_: Exception) {
            CustomerLookupResult()
        }
    }
}
