package com.jicprayertimes.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import com.jicprayertimes.R
import org.json.JSONObject

class PrayerTimesWidgetHorizontal : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.prayer_times_widget_horizontal)

        // Set click intent to open app
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        views.setOnClickPendingIntent(R.id.widget_root_horizontal, pendingIntent)

        // Read prayer times from SharedPreferences
        val prefs = context.getSharedPreferences("prayer_times_widget", Context.MODE_PRIVATE)
        val prayerDataJson = prefs.getString("prayer_data", null)

        Log.d("HorizontalWidget", "Reading data: $prayerDataJson")

        if (prayerDataJson != null) {
            try {
                val data = JSONObject(prayerDataJson)
                
                // Get current time for highlighting
                val currentTime = getCurrentTimeInMinutes()
                
                // Determine which prayer is current (for highlighting)
                val currentPrayerName = determineCurrentPrayer(data, currentTime)
                Log.d("HorizontalWidget", "Current prayer for highlighting: $currentPrayerName")
                
                // Update each prayer
                updatePrayerColumn(views, data, "fajr", "Fajr", currentPrayerName)
                updatePrayerColumn(views, data, "sunrise", "Sunrise", currentPrayerName)
                updatePrayerColumn(views, data, "dhuhr", "Dhuhr", currentPrayerName)
                updatePrayerColumn(views, data, "asr", "Asr", currentPrayerName)
                updatePrayerColumn(views, data, "maghrib", "Maghrib", currentPrayerName)
                updatePrayerColumn(views, data, "isha", "Isha", currentPrayerName)
                
            } catch (e: Exception) {
                Log.e("HorizontalWidget", "Error parsing data", e)
            }
        } else {
            Log.d("HorizontalWidget", "No data found")
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun updatePrayerColumn(
        views: RemoteViews, 
        data: JSONObject, 
        prayerKey: String,
        prayerDisplayName: String,
        currentPrayerName: String?
    ) {
        try {
            val prayerData = data.optJSONObject(prayerKey)
            
            if (prayerData != null) {
                val apt = prayerData.optString("apt", "--:--")
                val mit = prayerData.optString("mit", "--:--")
                
                // Get resource IDs
                val nameId = getResId("${prayerKey}_name")
                val aptId = getResId("${prayerKey}_apt")
                val mitId = getResId("${prayerKey}_mit")
                val containerId = getResId("prayer_$prayerKey")
                
                // Set prayer name (shortened for compact layout)
                val displayName = when(prayerKey) {
                    "sunrise" -> "Sun"
                    "maghrib" -> "Magh"
                    else -> prayerDisplayName
                }
                views.setTextViewText(nameId, displayName)
                
                // Set times - only APT and MIT for compact view
                views.setTextViewText(aptId, apt)
                if (prayerKey != "sunrise") {
                    views.setTextViewText(mitId, mit)
                }
                
                // Highlight if current prayer
                val isCurrentPrayer = currentPrayerName?.lowercase() == prayerKey
                if (isCurrentPrayer) {
                    views.setInt(containerId, "setBackgroundColor", 0x50CAA55E) // Gold highlight
                    Log.d("HorizontalWidget", "Highlighting $prayerKey as current prayer")
                } else {
                    views.setInt(containerId, "setBackgroundColor", 0x10FFFFFF) // Default
                }
                
            }
        } catch (e: Exception) {
            Log.e("HorizontalWidget", "Error updating $prayerKey", e)
        }
    }
    
    private fun getCurrentTimeInMinutes(): Int {
        val now = java.util.Calendar.getInstance()
        return now.get(java.util.Calendar.HOUR_OF_DAY) * 60 + now.get(java.util.Calendar.MINUTE)
    }
    
    private fun determineCurrentPrayer(data: JSONObject, currentTime: Int): String? {
        try {
            // List of prayers in order (excluding sunrise from prayer times but including for display)
            val prayers = listOf(
                "fajr" to "apt",
                "sunrise" to "apt", 
                "dhuhr" to "apt",
                "asr" to "apt",
                "maghrib" to "apt",
                "isha" to "apt"
            )
            
            // Find which prayer we're currently in
            // Logic: Current prayer is the one whose APT has passed but next prayer's APT hasn't
            var lastPassedPrayer: String? = null
            
            for (i in prayers.indices) {
                val (prayerName, timeType) = prayers[i]
                val prayerData = data.optJSONObject(prayerName)
                
                if (prayerData != null) {
                    val timeStr = prayerData.optString(timeType, null)
                    if (timeStr != null && timeStr != "--:--") {
                        val prayerTime = parseTimeToMinutes(timeStr)
                        
                        if (prayerTime <= currentTime) {
                            lastPassedPrayer = prayerName
                        } else {
                            // Next prayer hasn't arrived yet, so we're in the last passed prayer
                            return lastPassedPrayer
                        }
                    }
                }
            }
            
            // If all prayers passed, we're in Isha until tomorrow's Fajr
            return "isha"
            
        } catch (e: Exception) {
            Log.e("HorizontalWidget", "Error determining current prayer", e)
            return null
        }
    }
    
    private fun parseTimeToMinutes(time: String): Int {
        try {
            val parts = time.split(":")
            if (parts.size == 2) {
                val hours = parts[0].toInt()
                val minutes = parts[1].toInt()
                return hours * 60 + minutes
            }
        } catch (e: Exception) {
            Log.e("HorizontalWidget", "Error parsing time: $time", e)
        }
        return -1
    }
    
    private fun getResId(name: String): Int {
        return when (name) {
            "fajr_name" -> R.id.fajr_name
            "fajr_apt" -> R.id.fajr_apt
            "fajr_mit" -> R.id.fajr_mit
            "prayer_fajr" -> R.id.prayer_fajr
            
            "sunrise_name" -> R.id.sunrise_name
            "sunrise_apt" -> R.id.sunrise_apt
            "prayer_sunrise" -> R.id.prayer_sunrise
            
            "dhuhr_name" -> R.id.dhuhr_name
            "dhuhr_apt" -> R.id.dhuhr_apt
            "dhuhr_mit" -> R.id.dhuhr_mit
            "prayer_dhuhr" -> R.id.prayer_dhuhr
            
            "asr_name" -> R.id.asr_name
            "asr_apt" -> R.id.asr_apt
            "asr_mit" -> R.id.asr_mit
            "prayer_asr" -> R.id.prayer_asr
            
            "maghrib_name" -> R.id.maghrib_name
            "maghrib_apt" -> R.id.maghrib_apt
            "maghrib_mit" -> R.id.maghrib_mit
            "prayer_maghrib" -> R.id.prayer_maghrib
            
            "isha_name" -> R.id.isha_name
            "isha_apt" -> R.id.isha_apt
            "isha_mit" -> R.id.isha_mit
            "prayer_isha" -> R.id.prayer_isha
            
            else -> 0
        }
    }

    override fun onEnabled(context: Context) {
        Log.d("HorizontalWidget", "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        Log.d("HorizontalWidget", "Widget disabled")
    }
}