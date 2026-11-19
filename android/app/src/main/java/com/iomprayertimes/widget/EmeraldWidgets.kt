package com.iomprayertimes.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.iomprayertimes.R
import org.json.JSONObject
import java.util.Calendar

/**
 * v2.0 Emerald home screen widgets. They sit beside the Classic widgets (which are unchanged,
 * so widgets people already placed keep their look) and read the same data that
 * WidgetModule saves in SharedPreferences "prayer_times_widget".
 *
 * Both work out the next prayer from the clock each time they draw, and ask Android to redraw
 * them just after that prayer begins, so the highlight moves on without opening the app.
 */
object EmeraldWidgetData {
    private const val TAG = "EmeraldWidget"

    /** Display order. Sunrise is shown but never counts as the "next prayer". */
    val ORDER = listOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")
    val LABELS = mapOf(
        "fajr" to "Fajr", "sunrise" to "Sunrise", "dhuhr" to "Dhuhr",
        "asr" to "Asr", "maghrib" to "Maghrib", "isha" to "Isha"
    )

    fun load(context: Context): JSONObject? {
        val json = context.getSharedPreferences("prayer_times_widget", Context.MODE_PRIVATE)
            .getString("prayer_data", null) ?: return null
        return try {
            JSONObject(json)
        } catch (e: Exception) {
            Log.e(TAG, "Could not read widget data", e)
            null
        }
    }

    fun time(data: JSONObject?, key: String, field: String): String {
        val value = data?.optJSONObject(key)?.optString(field, "--:--") ?: "--:--"
        return if (value.isEmpty()) "--:--" else value
    }

    fun minutes(time: String): Int? {
        val parts = time.split(":")
        if (parts.size != 2) return null
        val h = parts[0].trim().toIntOrNull() ?: return null
        val m = parts[1].trim().toIntOrNull() ?: return null
        return h * 60 + m
    }

    private fun nowMinutes(): Int {
        val c = Calendar.getInstance()
        return c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
    }

    /** The first prayer (not sunrise) whose begin time is still ahead today; after Isha, Fajr. */
    fun nextPrayer(data: JSONObject?): String {
        val now = nowMinutes()
        for (key in ORDER) {
            if (key == "sunrise") continue
            val m = minutes(time(data, key, "apt")) ?: continue
            if (m > now) return key
        }
        return "fajr"
    }

    /** Asks Android to redraw [provider]'s widgets a minute after the next prayer begins. */
    fun scheduleRefresh(context: Context, provider: Class<*>, data: JSONObject?) {
        try {
            val next = minutes(time(data, nextPrayer(data), "apt")) ?: return
            val at = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, next / 60)
                set(Calendar.MINUTE, next % 60)
                set(Calendar.SECOND, 0)
                add(Calendar.MINUTE, 1)
                if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
            }
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, provider))
            val intent = Intent(context, provider).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            val pending = PendingIntent.getBroadcast(
                context, provider.name.hashCode(), intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            // Inexact on purpose: needs no exact-alarm permission and a minute or two late is fine.
            alarms.set(AlarmManager.RTC, at.timeInMillis, pending)
        } catch (e: Exception) {
            Log.e(TAG, "Could not schedule widget refresh", e)
        }
    }

    fun openAppIntent(context: Context): PendingIntent {
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        return PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    fun cancelRefresh(context: Context, provider: Class<*>) {
        try {
            val intent = Intent(context, provider).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val pending = PendingIntent.getBroadcast(
                context, provider.name.hashCode(), intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            ) ?: return
            (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending)
        } catch (e: Exception) {
            Log.e(TAG, "Could not cancel widget refresh", e)
        }
    }
}

/** "Next prayer (Emerald)": the next prayer with Begins and Iqama, then the two after it. */
class EmeraldNextWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val data = EmeraldWidgetData.load(context)
        for (id in ids) {
            manager.updateAppWidget(id, render(context, data))
        }
        EmeraldWidgetData.scheduleRefresh(context, EmeraldNextWidget::class.java, data)
    }

    override fun onDisabled(context: Context) {
        EmeraldWidgetData.cancelRefresh(context, EmeraldNextWidget::class.java)
    }

    private fun render(context: Context, data: JSONObject?): RemoteViews {
        val d = EmeraldWidgetData
        val views = RemoteViews(context.packageName, R.layout.emerald_next_widget)
        views.setOnClickPendingIntent(R.id.em_next_root, d.openAppIntent(context))

        val next = d.nextPrayer(data)
        views.setTextViewText(R.id.em_next_name, d.LABELS[next])
        views.setTextViewText(R.id.em_next_apt, d.time(data, next, "apt"))
        val mit = d.time(data, next, "mit")
        views.setTextViewText(R.id.em_next_mit, mit)
        views.setViewVisibility(R.id.em_next_mit_box, if (mit == "--:--") View.INVISIBLE else View.VISIBLE)

        val i = d.ORDER.indexOf(next)
        val after1 = d.ORDER[(i + 1) % d.ORDER.size]
        val after2 = d.ORDER[(i + 2) % d.ORDER.size]
        views.setTextViewText(R.id.em_after1_name, d.LABELS[after1])
        views.setTextViewText(R.id.em_after1_apt, d.time(data, after1, "apt"))
        views.setTextViewText(R.id.em_after2_name, d.LABELS[after2])
        views.setTextViewText(R.id.em_after2_apt, d.time(data, after2, "apt"))
        return views
    }
}

/** "Prayer day (Emerald)": all six times in one row, the next prayer highlighted. */
class EmeraldDayWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val data = EmeraldWidgetData.load(context)
        for (id in ids) {
            manager.updateAppWidget(id, render(context, data))
        }
        EmeraldWidgetData.scheduleRefresh(context, EmeraldDayWidget::class.java, data)
    }

    override fun onDisabled(context: Context) {
        EmeraldWidgetData.cancelRefresh(context, EmeraldDayWidget::class.java)
    }

    private class Cell(val box: Int, val name: Int, val apt: Int, val mit: Int)

    private val cells = mapOf(
        "fajr" to Cell(R.id.em_day_fajr, R.id.em_day_fajr_name, R.id.em_day_fajr_apt, R.id.em_day_fajr_mit),
        "sunrise" to Cell(R.id.em_day_sunrise, R.id.em_day_sunrise_name, R.id.em_day_sunrise_apt, R.id.em_day_sunrise_mit),
        "dhuhr" to Cell(R.id.em_day_dhuhr, R.id.em_day_dhuhr_name, R.id.em_day_dhuhr_apt, R.id.em_day_dhuhr_mit),
        "asr" to Cell(R.id.em_day_asr, R.id.em_day_asr_name, R.id.em_day_asr_apt, R.id.em_day_asr_mit),
        "maghrib" to Cell(R.id.em_day_maghrib, R.id.em_day_maghrib_name, R.id.em_day_maghrib_apt, R.id.em_day_maghrib_mit),
        "isha" to Cell(R.id.em_day_isha, R.id.em_day_isha_name, R.id.em_day_isha_apt, R.id.em_day_isha_mit),
    )

    private fun render(context: Context, data: JSONObject?): RemoteViews {
        val d = EmeraldWidgetData
        val views = RemoteViews(context.packageName, R.layout.emerald_day_widget)
        views.setOnClickPendingIntent(R.id.em_day_root, d.openAppIntent(context))

        val next = d.nextPrayer(data)
        for ((key, cell) in cells) {
            val isNext = key == next
            views.setInt(
                cell.box, "setBackgroundResource",
                if (isNext) R.drawable.widget_emerald_pill else R.drawable.widget_emerald_cell
            )
            views.setTextColor(cell.name, if (isNext) 0xFF2BC48A.toInt() else 0xFF93AAA6.toInt())
            views.setTextViewText(cell.apt, d.time(data, key, "apt"))
            val mit = d.time(data, key, "mit")
            views.setTextViewText(cell.mit, mit)
            views.setViewVisibility(cell.mit, if (mit == "--:--") View.GONE else View.VISIBLE)
        }
        return views
    }
}
