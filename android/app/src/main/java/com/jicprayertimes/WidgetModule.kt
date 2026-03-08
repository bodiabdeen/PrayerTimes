package com.jicprayertimes

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.jicprayertimes.widget.PrayerTimesWidget
import org.json.JSONObject

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updateWidget(prayerData: ReadableMap) {
        try {
            val context = reactApplicationContext
            
            Log.d("WidgetModule", "Received prayer data: ${prayerData}")
            
            // Convert ReadableMap to JSON
            val json = JSONObject()
            
            // Helper function to extract prayer object
            fun getPrayerObject(prayerName: String): JSONObject {
                val prayerObj = JSONObject()
                try {
                    if (prayerData.hasKey(prayerName) && 
                        prayerData.getType(prayerName) == ReadableType.Map) {
                        val prayerMap = prayerData.getMap(prayerName)
                        if (prayerMap != null) {
                            val apt = if (prayerMap.hasKey("apt")) prayerMap.getString("apt") else "--:--"
                            val mat = if (prayerMap.hasKey("mat")) prayerMap.getString("mat") else "--:--"
                            val mit = if (prayerMap.hasKey("mit")) prayerMap.getString("mit") else "--:--"
                            
                            prayerObj.put("apt", apt)
                            prayerObj.put("mat", mat)
                            prayerObj.put("mit", mit)
                            
                            Log.d("WidgetModule", "$prayerName: apt=$apt, mat=$mat, mit=$mit")
                        }
                    } else {
                        prayerObj.put("apt", "--:--")
                        prayerObj.put("mat", "--:--")
                        prayerObj.put("mit", "--:--")
                    }
                } catch (e: Exception) {
                    Log.e("WidgetModule", "Error parsing $prayerName", e)
                    prayerObj.put("apt", "--:--")
                    prayerObj.put("mat", "--:--")
                    prayerObj.put("mit", "--:--")
                }
                return prayerObj
            }
            
            // Dynamically extract ALL prayer types from the data
            // This includes regular prayers (fajr, dhuhr, asr, maghrib, isha)
            // AND special prayers (jumaa, taraweeh, eid-ul-fitr, eid-ul-adha, etc.)
            
            // Get all keys from the prayerData map
            val iterator = prayerData.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                // Skip the metadata keys (currentPrayer, next1Prayer, next2Prayer)
                if (key != "currentPrayer" && key != "next1Prayer" && key != "next2Prayer") {
                    json.put(key.lowercase(), getPrayerObject(key))
                }
            }
            
            // Add prayer names
            val currentPrayer = if (prayerData.hasKey("currentPrayer")) 
                prayerData.getString("currentPrayer") else "Fajr"
            val next1Prayer = if (prayerData.hasKey("next1Prayer")) 
                prayerData.getString("next1Prayer") else "Dhuhr"
            val next2Prayer = if (prayerData.hasKey("next2Prayer")) 
                prayerData.getString("next2Prayer") else "Asr"
            
            json.put("currentPrayer", currentPrayer)
            json.put("next1Prayer", next1Prayer)
            json.put("next2Prayer", next2Prayer)
            
            Log.d("WidgetModule", "Current: $currentPrayer, Next1: $next1Prayer, Next2: $next2Prayer")
            
            // Save to SharedPreferences
            val prefs = context.getSharedPreferences("prayer_times_widget", Context.MODE_PRIVATE)
            prefs.edit().putString("prayer_data", json.toString()).apply()
            
            Log.d("WidgetModule", "Saved to SharedPreferences: ${json.toString()}")
            
            // Trigger widget update for BOTH widgets
            val intent = Intent(context, PrayerTimesWidget::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, PrayerTimesWidget::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
            
            Log.d("WidgetModule", "Vertical widget update broadcast sent")
            
            // Update horizontal widget
            val intentHorizontal = Intent(context, com.jicprayertimes.widget.PrayerTimesWidgetHorizontal::class.java)
            intentHorizontal.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val idsHorizontal = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, com.jicprayertimes.widget.PrayerTimesWidgetHorizontal::class.java))
            intentHorizontal.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, idsHorizontal)
            context.sendBroadcast(intentHorizontal)
            
            Log.d("WidgetModule", "Horizontal widget update broadcast sent")
            
        } catch (e: Exception) {
            Log.e("WidgetModule", "Error updating widget", e)
            e.printStackTrace()
        }
    }
}
