// src/services/notificationService.ts
// Service for handling prayer time and announcement notifications
// VERSION 1.1 - FIXED: Notification press opens app + refreshes

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import notifee, { 
  AndroidImportance, 
  TriggerType,
  RepeatFrequency,
  EventType,
  AndroidLaunchActivityFlag 
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Prayer } from '../types';

const CHANNEL_ID = 'prayer_times';
const ANNOUNCEMENTS_CHANNEL_ID = 'announcements';

// Hijri month names to numbers mapping
const HIJRI_MONTHS: { [key: string]: number } = {
  'Muharram': 1,
  'Safar': 2,
  'Rabi\' al-Awwal': 3,
  'Rabi\' al-Thani': 4,
  'Jumada al-Awwal': 5,
  'Jumada al-Thani': 6,
  'Rajab': 7,
  'Sha\'ban': 8,
  'Ramadan': 9,
  'Ramadhan': 9, // Alternative spelling
  'Shawwal': 10,
  'Dhul-Qa\'dah': 11,
  'Dhu al-Qi\'dah': 11, // Alternative spelling
  'Dhul-Hijjah': 12,
  'Dhu al-Hijjah': 12, // Alternative spelling
};

/**
 * Parse Hijri date string to extract day and month
 * Format: "15 Ramadan 1446 AH"
 */
const parseHijriDate = (hijriDateStr: string): { day: number; month: number } | null => {
  try {
    // Split the string: "15 Ramadan 1446 AH" -> ["15", "Ramadan", "1446", "AH"]
    const parts = hijriDateStr.split(' ');
    if (parts.length < 2) return null;
    
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const month = HIJRI_MONTHS[monthName];
    
    if (isNaN(day) || !month) {
      console.warn(`⚠️ Could not parse Hijri date: ${hijriDateStr}`);
      return null;
    }
    
    return { day, month };
  } catch (error) {
    console.error('Error parsing Hijri date:', error);
    return null;
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13+ requires POST_NOTIFICATIONS permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      // Android 12 and below - notifications are granted by default
      return true;
    }
    // iOS
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1; // Authorized or provisional
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Create notification channels (Android)
 */
export const createNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Prayer times channel
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Prayer Times',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    // Announcements channel
    await notifee.createChannel({
      id: ANNOUNCEMENTS_CHANNEL_ID,
      name: 'Announcements',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });

    console.log('✅ Notification channels created');
  } catch (error) {
    console.error('Error creating notification channels:', error);
  }
};

/**
 * Parse time string to date object
 */
const parseTimeToDate = (timeStr: string): Date | null => {
  if (!timeStr || timeStr === '--:--') return null;
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    const now = new Date();
    if (date <= now) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  } catch (error) {
    console.error('Error parsing time:', timeStr, error);
    return null;
  }
};

/**
 * Schedule notification for a specific event
 * FIX: Added proper pressAction to open app
 */
const scheduleEventNotification = async (
  id: string,
  title: string,
  body: string,
  time: Date
): Promise<void> => {
  try {
    await notifee.createTriggerNotification(
      {
        id: id,
        title: title,
        body: body,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default', // This opens the app
          },
          sound: 'default',
          // Add flags to ensure app opens properly
          autoCancel: true,
        },
        ios: {
          sound: 'default',
          critical: true,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: time.getTime(),
      }
    );

    console.log(`✅ Scheduled: ${title} at ${time.toLocaleTimeString()}`);
  } catch (error) {
    console.error(`❌ Failed to schedule ${id}:`, error);
  }
};

/**
 * Schedule all prayer event notifications
 * CHANGE #3 & #4: Added Friday-specific logic for Dhuhr and Jumaa
 * CHANGE #5: Added Hijri date filtering for Taraweeh and Eid prayers
 */
export const scheduleAllPrayerNotifications = async (
  prayers: Prayer[],
  hijriDate?: string
): Promise<void> => {
  try {
    // Cancel all existing notifications
    await notifee.cancelAllNotifications();
    await notifee.cancelTriggerNotifications();

    console.log('🔔 Scheduling all prayer notifications...');

    // Parse Hijri date for special prayer filtering
    const hijriInfo = hijriDate ? parseHijriDate(hijriDate) : null;
    if (hijriInfo) {
      console.log(`📅 Current Hijri date: Day ${hijriInfo.day}, Month ${hijriInfo.month}`);
    }

    for (const prayer of prayers) {
      const prayerNameClean = prayer.name.replace(/\s+/g, '_').toLowerCase();

      // Skip sunrise for special handling (it has no MAT/MIT)
      const isSunrise = prayer.name.toLowerCase() === 'sunrise';
      
      // CHANGE #3: Check if this is Dhuhr prayer
      const isDhuhr = prayer.name.toLowerCase().includes('dhuhr');
      
      // CHANGE #4: Skip Jumu'ah in main loop - will be handled separately
      const isJumaa = prayer.name.toLowerCase().includes('jumaa') || prayer.name.toLowerCase().includes("jumu'ah");
      if (isJumaa) {
        console.log("⏭️ Skipping Jumu'ah in main loop (will schedule separately for Fridays only)");
        continue;
      }

      // CHANGE #5: Filter Taraweeh and Eid prayers based on Hijri date
      const isTaraweeh = prayer.name.toLowerCase().includes('taraweeh') || prayer.name.toLowerCase().includes('تراويح');
      const isEidFitr = prayer.name.toLowerCase().includes('eid al-fitr') || prayer.name.toLowerCase().includes('عيد الفطر');
      const isEidAdha = prayer.name.toLowerCase().includes('eid al-adha') || prayer.name.toLowerCase().includes('عيد الأضحى');
      
      // Skip special prayers if not within their valid Hijri date range
      if (hijriInfo) {
        // Taraweeh: Only during Ramadan (month 9)
        if (isTaraweeh && hijriInfo.month !== 9) {
          console.log(`⏭️ Skipping Taraweeh (not Ramadan - current month: ${hijriInfo.month})`);
          continue;
        }
        
        // Eid al-Fitr: Only on 1 Shawwal (month 10, day 1)
        if (isEidFitr && (hijriInfo.month !== 10 || hijriInfo.day !== 1)) {
          console.log(`⏭️ Skipping Eid al-Fitr (not 1 Shawwal - current: ${hijriInfo.day}/${hijriInfo.month})`);
          continue;
        }
        
        // Eid al-Adha: Only on 10 Dhul-Hijjah (month 12, day 10)
        if (isEidAdha && (hijriInfo.month !== 12 || hijriInfo.day !== 10)) {
          console.log(`⏭️ Skipping Eid al-Adha (not 10 Dhul-Hijjah - current: ${hijriInfo.day}/${hijriInfo.month})`);
          continue;
        }
      }

      // 1. Schedule APT (Prayer Start Time)
      if (prayer.apt && prayer.apt !== '--:--') {
        const aptTime = parseTimeToDate(prayer.apt);
        if (aptTime) {
          await scheduleEventNotification(
            `${prayerNameClean}_apt`,
            `🕌 ${prayer.name} - Prayer Start`,
            `Prayer time begins at ${prayer.apt}`,
            aptTime
          );
        }
      }

      // 2. Schedule MAT (Masjid Adhan) - Skip for sunrise
      // CHANGE #3: For Dhuhr, only schedule if NOT Friday
      if (!isSunrise && prayer.mat && prayer.mat !== '--:--') {
        const matTime = parseTimeToDate(prayer.mat);
        if (matTime) {
          // Skip Dhuhr MAT on Fridays (day 5)
          const shouldSchedule = !isDhuhr || matTime.getDay() !== 5;
          
          if (shouldSchedule) {
            await scheduleEventNotification(
              `${prayerNameClean}_mat`,
              `📢 ${prayer.name} - Adhan`,
              `Adhan at the masjid at ${prayer.mat}`,
              matTime
            );
          } else {
            console.log(`⏭️ Skipping Dhuhr MAT on Friday (will use Jumu'ah instead)`);
          }
        }
      }

      // 3. Schedule MIT (Masjid Iqama) - Skip for sunrise
      // CHANGE #3: For Dhuhr, only schedule if NOT Friday
      if (!isSunrise && prayer.mit && prayer.mit !== '--:--') {
        const mitTime = parseTimeToDate(prayer.mit);
        if (mitTime) {
          // Skip Dhuhr MIT on Fridays (day 5)
          const shouldSchedule = !isDhuhr || mitTime.getDay() !== 5;
          
          if (shouldSchedule) {
            await scheduleEventNotification(
              `${prayerNameClean}_mit`,
              `🕋 ${prayer.name} - Iqama`,
              `Congregation prayer starts at ${prayer.mit}`,
              mitTime
            );
          } else {
            console.log(`⏭️ Skipping Dhuhr MIT on Friday (will use Jumu'ah instead)`);
          }
        }
      }
    }

    // CHANGE #4: Schedule Jumu'ah (Friday Prayer) notifications - ONLY ON FRIDAYS
    const jumaaPrayer = prayers.find(p => p.name.toLowerCase().includes('jumaa') || p.name.toLowerCase().includes("jumu'ah"));
    if (jumaaPrayer) {
      console.log("🕌 Found Jumu'ah prayer, checking if Friday...");
      
      // Schedule MAT (Adhan/Khutba)
      if (jumaaPrayer.mat && jumaaPrayer.mat !== '--:--') {
        const jumaaMatTime = parseTimeToDate(jumaaPrayer.mat);
        if (jumaaMatTime && jumaaMatTime.getDay() === 5) { // Only if Friday
          await scheduleEventNotification(
            'jumaa_mat',
            "📢 Jumu'ah - Khutba & Adhan",
            `Jumu'ah Khutba and Adhan at ${jumaaPrayer.mat}`,
            jumaaMatTime
          );
          console.log(`✅ Scheduled Jumu'ah MAT for Friday`);
        } else {
          console.log(`⏭️ Skipping Jumu'ah MAT (not Friday or invalid time)`);
        }
      }
      
      // Schedule MIT (Iqama)
      if (jumaaPrayer.mit && jumaaPrayer.mit !== '--:--') {
        const jumaaMitTime = parseTimeToDate(jumaaPrayer.mit);
        if (jumaaMitTime && jumaaMitTime.getDay() === 5) { // Only if Friday
          await scheduleEventNotification(
            'jumaa_mit',
            "🕋 Jumu'ah - Iqama",
            `Jumu'ah prayer starts at ${jumaaPrayer.mit}`,
            jumaaMitTime
          );
          console.log(`✅ Scheduled Jumu'ah MIT for Friday`);
        } else {
          console.log(`⏭️ Skipping Jumu'ah MIT (not Friday or invalid time)`);
        }
      }
    }

    // Get count of scheduled notifications
    const triggers = await notifee.getTriggerNotifications();
    console.log(`✅ Successfully scheduled ${triggers.length} notifications`);

  } catch (error) {
    console.error('❌ Error scheduling prayer notifications:', error);
  }
};

/**
 * Show immediate notification for data refresh
 */
export const showDataRefreshedNotification = async (): Promise<void> => {
  try {
    await notifee.displayNotification({
      id: 'data_refreshed',
      title: '✅ Prayer times updated',
      body: 'Fresh prayer times loaded from server',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.LOW,
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        autoCancel: true,
      },
    });
  } catch (error) {
    console.error('Error showing refresh notification:', error);
  }
};

/**
 * Show notification for unread announcements
 */
export const showUnreadAnnouncementsNotification = async (
  unreadCount: number
): Promise<void> => {
  if (unreadCount === 0) return;

  try {
    await notifee.displayNotification({
      id: 'unread_announcements',
      title: `📢 ${unreadCount} New Announcement${unreadCount > 1 ? 's' : ''}`,
      body: 'Tap to view new announcements',
      android: {
        channelId: ANNOUNCEMENTS_CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'open_announcements',
          launchActivity: 'default',
        },
        autoCancel: true,
      },
    });

    console.log(`✅ Showed notification for ${unreadCount} unread announcements`);
  } catch (error) {
    console.error('Error showing announcements notification:', error);
  }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= 1;
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false;
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const prefs = await AsyncStorage.getItem('@notification_prefs');
    return prefs ? JSON.parse(prefs) : {
      prayerStart: true,      // APT notifications
      adhan: true,            // MAT notifications
      iqama: true,            // MIT notifications
      sunrise: true,          // Sunrise notification
      specialPrayers: true,   // Jumu'ah, Taraweeh, Eid
      dataRefresh: false,     // Data refresh notifications
      announcements: true,    // Unread announcements
    };
  } catch (error) {
    return {
      prayerStart: true,
      adhan: true,
      iqama: true,
      sunrise: true,
      specialPrayers: true,
      dataRefresh: false,
      announcements: true,
    };
  }
};

/**
 * Save notification preferences
 */
export const saveNotificationPreferences = async (prefs: any) => {
  try {
    await AsyncStorage.setItem('@notification_prefs', JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
};

/**
 * Get scheduled notifications summary
 */
export const getScheduledNotificationsSummary = async (): Promise<string> => {
  try {
    const triggers = await notifee.getTriggerNotifications();
    
    if (triggers.length === 0) {
      return 'No notifications scheduled';
    }

    const summary = triggers.map(trigger => {
      const time = new Date(trigger.notification.id || 0);
      return `${trigger.notification.title} - ${time.toLocaleTimeString()}`;
    }).join('\n');

    return `${triggers.length} notifications scheduled:\n${summary}`;
  } catch (error) {
    return 'Error getting notifications';
  }
};

/**
 * Initialize notification system
 */
export const initializeNotifications = async (): Promise<boolean> => {
  try {
    console.log('🔔 Initializing notifications...');
    
    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ Notification permission denied');
      return false;
    }

    // Create channels
    await createNotificationChannels();

    console.log('✅ Notifications initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    return false;
  }
};
