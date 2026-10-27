package fr.trainerr.app

import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.annotation.RequiresApi
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Reads body weighings from Health Connect, where smart scales, Samsung Health
 * or Google Fit write them. Read only: Trainerr never writes there.
 * https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data
 */
@CapacitorPlugin(name = "HealthWeight")
class HealthWeightPlugin : Plugin() {

    private val readWeight = HealthPermission.getReadPermission(WeightRecord::class)

    /** Without it, Health Connect only gives the last 30 days of other apps' data. */
    private val readHistory = "android.permission.health.READ_HEALTH_DATA_HISTORY"
    private val contract = PermissionController.createRequestPermissionResultContract()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** The Health Connect app needs Android 9 or later. */
    private fun sdkStatus(): Int =
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) HealthConnectClient.SDK_UNAVAILABLE
        else HealthConnectClient.getSdkStatus(context)

    @PluginMethod
    fun availability(call: PluginCall) {
        val status = when (sdkStatus()) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "updateRequired"
            else -> "unavailable"
        }
        call.resolve(JSObject().put("status", status))
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect indisponible", "UNAVAILABLE")
            return
        }
        scope.launch {
            try {
                val granted = client().permissionController.getGrantedPermissions()
                if (readWeight in granted) {
                    call.resolve(JSObject().put("granted", true))
                    return@launch
                }
                val intent = contract.createIntent(context, setOf(readWeight, readHistory))
                startActivityForResult(call, intent, "permissionResult")
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect", e)
            }
        }
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val granted = contract.parseResult(result.resultCode, result.data)
        call.resolve(JSObject().put("granted", readWeight in granted))
    }

    /** Weighings since `since` (ISO date), one entry per record, oldest first. */
    @PluginMethod
    fun readWeights(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect indisponible", "UNAVAILABLE")
            return
        }
        val since = call.getString("since") ?: "1970-01-01"
        scope.launch {
            try {
                call.resolve(JSObject().put("weighings", read(since)))
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect", e)
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private suspend fun read(since: String): JSArray {
        val client = client()
        val granted = client.permissionController.getGrantedPermissions()
        if (readWeight !in granted) throw IllegalStateException("Permission refusée")
        var start = java.time.LocalDate.parse(since).atStartOfDay(ZoneId.systemDefault()).toInstant()
        // Older data would be an error without the history permission.
        val limit = Instant.now().minus(Duration.ofDays(30))
        if (readHistory !in granted && start.isBefore(limit)) start = limit
        val weighings = JSArray()
        var pageToken: String? = null
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = WeightRecord::class,
                    timeRangeFilter = TimeRangeFilter.after(start),
                    pageToken = pageToken,
                ),
            )
            for (record in response.records) {
                val zone: ZoneId = record.zoneOffset ?: ZoneId.systemDefault()
                weighings.put(
                    JSObject()
                        .put("date", record.time.atZone(zone).toLocalDate().toString())
                        .put("time", record.time.toString())
                        .put("kg", record.weight.inKilograms)
                        .put("source", record.metadata.dataOrigin.packageName),
                )
            }
            pageToken = response.pageToken
        } while (!pageToken.isNullOrEmpty())
        return weighings
    }

    private fun client() = HealthConnectClient.getOrCreate(context)
}
