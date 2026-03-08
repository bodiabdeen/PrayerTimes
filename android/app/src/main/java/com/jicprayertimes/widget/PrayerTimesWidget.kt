package com.jicprayertimes.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.jicprayertimes.R
import org.json.JSONObject
import android.util.Log

class PrayerTimesWidget : AppWidgetProvider() {

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
        val views = RemoteViews(context.packageName, R.layout.prayer_times_widget)

        // Set click intent to open app - on entire widget
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        // Make entire widget clickable
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        // Read prayer times from SharedPreferences
        val prefs = context.getSharedPreferences("prayer_times_widget", Context.MODE_PRIVATE)
        val prayerDataJson = prefs.getString("prayer_data", null)

        Log.d("PrayerWidget", "Reading data: $prayerDataJson")

        if (prayerDataJson != null) {
            try {
                val data = JSONObject(prayerDataJson)
                
                // Get current and next prayer names
                val currentPrayerName = data.optString("currentPrayer", "Fajr")
                val next1PrayerName = data.optString("next1Prayer", "Dhuhr")
                val next2PrayerName = data.optString("next2Prayer", "Asr")
                
                Log.d("PrayerWidget", "Current: $currentPrayerName, Next1: $next1PrayerName, Next2: $next2PrayerName")
                
                // Set current prayer
                views.setTextViewText(R.id.current_prayer_name, currentPrayerName)
                setPrayerTimesWithHiding(views, data, currentPrayerName.lowercase(), "current")
                
                // Set next prayer 1
                views.setTextViewText(R.id.next1_prayer_name, next1PrayerName)
                setPrayerTimesWithHiding(views, data, next1PrayerName.lowercase(), "next1")
                
                // Set next prayer 2
                views.setTextViewText(R.id.next2_prayer_name, next2PrayerName)
                setPrayerTimesWithHiding(views, data, next2PrayerName.lowercase(), "next2")
                
            } catch (e: Exception) {
                Log.e("PrayerWidget", "Error parsing data", e)
                setDefaultTimes(views)
            }
        } else {
            Log.d("PrayerWidget", "No data found")
            setDefaultTimes(views)
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun setPrayerTimesWithHiding(views: RemoteViews, data: JSONObject, prayerName: String, prefix: String) {
        try {
            val prayerData = data.optJSONObject(prayerName)
            if (prayerData != null) {
                val apt = prayerData.optString("apt", "--:--")
                val mat = prayerData.optString("mat", "--:--")
                val mit = prayerData.optString("mit", "--:--")
                
                Log.d("PrayerWidget", "$prefix ($prayerName): apt=$apt, mat=$mat, mit=$mit")
                
                // Set APT or hide row if missing
                if (apt != "--:--" && apt.isNotEmpty()) {
                    views.setTextViewText(getResId("${prefix}_apt"), apt)
                    views.setViewVisibility(getResId("${prefix}_apt_row"), View.VISIBLE)
                } else {
                    views.setViewVisibility(getResId("${prefix}_apt_row"), View.GONE)
                }
                
                // Set MAT or hide row if missing
                if (mat != "--:--" && mat.isNotEmpty()) {
                    views.setTextViewText(getResId("${prefix}_mat"), mat)
                    views.setViewVisibility(getResId("${prefix}_mat_row"), View.VISIBLE)
                } else {
                    views.setViewVisibility(getResId("${prefix}_mat_row"), View.GONE)
                }
                
                // Set MIT or hide row if missing
                if (mit != "--:--" && mit.isNotEmpty()) {
                    views.setTextViewText(getResId("${prefix}_mit"), mit)
                    views.setViewVisibility(getResId("${prefix}_mit_row"), View.VISIBLE)
                } else {
                    views.setViewVisibility(getResId("${prefix}_mit_row"), View.GONE)
                }
                
            } else {
                Log.d("PrayerWidget", "No data for $prayerName")
                setDefaultTimesForPrefix(views, prefix)
            }
        } catch (e: Exception) {
            Log.e("PrayerWidget", "Error setting times for $prefix", e)
            setDefaultTimesForPrefix(views, prefix)
        }
    }
    
    private fun getResId(name: String): Int {
        return when (name) {
            "current_apt" -> R.id.current_apt
            "current_mat" -> R.id.current_mat
            "current_mit" -> R.id.current_mit
            "current_apt_row" -> R.id.current_apt_row
            "current_mat_row" -> R.id.current_mat_row
            "current_mit_row" -> R.id.current_mit_row
            
            "next1_apt" -> R.id.next1_apt
            "next1_mat" -> R.id.next1_mat
            "next1_mit" -> R.id.next1_mit
            "next1_apt_row" -> R.id.next1_apt_row
            "next1_mat_row" -> R.id.next1_mat_row
            "next1_mit_row" -> R.id.next1_mit_row
            
            "next2_apt" -> R.id.next2_apt
            "next2_mat" -> R.id.next2_mat
            "next2_mit" -> R.id.next2_mit
            "next2_apt_row" -> R.id.next2_apt_row
            "next2_mat_row" -> R.id.next2_mat_row
            "next2_mit_row" -> R.id.next2_mit_row
            
            else -> 0
        }
    }

    private fun setDefaultTimesForPrefix(views: RemoteViews, prefix: String) {
        views.setTextViewText(getResId("${prefix}_apt"), "--:--")
        views.setTextViewText(getResId("${prefix}_mat"), "--:--")
        views.setTextViewText(getResId("${prefix}_mit"), "--:--")
        views.setViewVisibility(getResId("${prefix}_apt_row"), View.VISIBLE)
        views.setViewVisibility(getResId("${prefix}_mat_row"), View.VISIBLE)
        views.setViewVisibility(getResId("${prefix}_mit_row"), View.VISIBLE)
    }

    private fun setDefaultTimes(views: RemoteViews) {
        views.setTextViewText(R.id.current_prayer_name, "Fajr")
        setDefaultTimesForPrefix(views, "current")
        
        views.setTextViewText(R.id.next1_prayer_name, "Dhuhr")
        setDefaultTimesForPrefix(views, "next1")
        
        views.setTextViewText(R.id.next2_prayer_name, "Asr")
        setDefaultTimesForPrefix(views, "next2")
    }

    override fun onEnabled(context: Context) {
        Log.d("PrayerWidget", "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        Log.d("PrayerWidget", "Widget disabled")
    }
}