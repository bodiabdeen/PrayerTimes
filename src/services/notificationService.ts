// src/services/notificationService.ts
// Service for handling prayer time and announcement notifications
// VERSION 1.2 - Athan audio on APT/MAT per prayer (no iqama audio)

import {Platform, PermissionsAndroid} from 'react-native';
import notifee, {
  AndroidImportance,
  TriggerType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Prayer} from '../types';
import {
  getAthanPreferences,
  getPrayerAthanKey,
  getAthanChannelId,
  createAthanChannels,
  ATHAN_SOUNDS,
} from './athanService';

const CHANNEL_ID = 'prayer_times';
const ANNOUNCEMENTS_CHANNEL_ID = 'announcements';

// ─── Permissions ──────────────────────────────────────────────────────────────

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// ─── Channels ─────────────────────────────────────────────────────────────────

export const createNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Prayer Times',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    await notifee.createChannel({
      id: ANNOUNCEMENTS_CHANNEL_ID,
      name: 'Announcements',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });
    await createAthanChannels();
    console.log('✅ Notification channels created');
  } catch (error) {
    console.error('Error creating notification channels:', error);
  }
};

// ─── Time helpers ─────────────────────────────────────────────────────────────

const parseTimeToDate = (timeStr: string): Date | null => {
  if (!timeStr || timeStr === '--:--') return null;
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  } catch (error) {
    console.error('Error parsing time:', timeStr, error);
    return null;
  }
};

// ─── Schedule one notification ────────────────────────────────────────────────

const scheduleEventNotification = async (
  id: string,
  title: string,
  body: string,
  time: Date,
  androidChannelId: string = CHANNEL_ID,
  iosSound: string = 'default',
): Promise<void> => {
  try {
    await notifee.createTriggerNotification(
      {
        id,
        title,
        body,
        android: {
          channelId: androidChannelId,
          importance: AndroidImportance.HIGH,
          pressAction: {id: 'default', launchActivity: 'default'},
          autoCancel: true,
        },
        ios: {
          sound: iosSound,
          critical: true,
          foregroundPresentationOptions: {alert: true, badge: true, sound: true},
        },
      },
      {type: TriggerType.TIMESTAMP, timestamp: time.getTime()},
    );
    console.log(`✅ Scheduled: ${title} at ${time.toLocaleTimeString()}`);
  } catch (error) {
    console.error(`❌ Failed to schedule ${id}:`, error);
  }
};

// ─── Resolve athan channel for a prayer event ─────────────────────────────────

const resolveAthanChannel = (
  prayerName: string,
  eventType: 'apt' | 'mat',
  athanPrefs: Awaited<ReturnType<typeof getAthanPreferences>>,
): {androidChannelId: string; iosSound: string} => {
  const defaults = {androidChannelId: CHANNEL_ID, iosSound: 'default'};
  const key = getPrayerAthanKey(prayerName);
  if (!key) return defaults;

  const config = athanPrefs.prayers[key];
  if (!config?.enabled) return defaults;

  const shouldPlay =
    eventType === 'apt' ? config.playOnApt : config.playOnMat;
  if (!shouldPlay) return defaults;

  const soundId = athanPrefs.athanSound;
  const soundOption = ATHAN_SOUNDS.find(s => s.id === soundId);
  if (!soundOption) return defaults;

  return {
    androidChannelId: getAthanChannelId(soundId),
    iosSound: `${soundOption.iosFile}.mp3`,
  };
};

// ─── Schedule all prayer notifications ───────────────────────────────────────

export const scheduleAllPrayerNotifications = async (
  prayers: Prayer[],
): Promise<void> => {
  try {
    await notifee.cancelAllNotifications();
    await notifee.cancelTriggerNotifications();
    console.log('🔔 Scheduling all prayer notifications...');

    const athanPrefs = await getAthanPreferences();

    for (const prayer of prayers) {
      const prayerNameClean = prayer.name.replace(/\s+/g, '_').toLowerCase();
      const isSunrise = prayer.name.toLowerCase().startsWith('sunrise');
      const isDhuhr   = prayer.name.toLowerCase().startsWith('dhuhr');
      const isJumaa   =
        prayer.name.toLowerCase().includes('jumaa') ||
        prayer.name.toLowerCase().includes("jumu'ah");

      if (isJumaa) {
        console.log("⏭️ Skipping Jumu'ah in main loop (Friday-only, handled separately)");
        continue;
      }

      const isSpecial =
        prayer.name.toLowerCase().includes('taraweeh') ||
        prayer.name.toLowerCase().includes('تراويح') ||
        prayer.name.toLowerCase().includes('eid al-fitr') ||
        prayer.name.toLowerCase().includes('عيد الفطر') ||
        prayer.name.toLowerCase().includes('eid al-adha') ||
        prayer.name.toLowerCase().includes('عيد الأضحى');

      if (isSpecial) {
        console.log(`⏭️ Skipping ${prayer.name} (Taraweeh/Eid)`);
        continue;
      }

      // APT
      if (prayer.apt && prayer.apt !== '--:--') {
        const aptTime = parseTimeToDate(prayer.apt);
        if (aptTime) {
          const {androidChannelId, iosSound} = resolveAthanChannel(prayer.name, 'apt', athanPrefs);
          await scheduleEventNotification(
            `${prayerNameClean}_apt`,
            `🕌 ${prayer.name} - Prayer Start`,
            `Prayer time begins at ${prayer.apt}`,
            aptTime,
            androidChannelId,
            iosSound,
          );
        }
      }

      // MAT — skip sunrise; skip Dhuhr MAT on Fridays
      if (!isSunrise && prayer.mat && prayer.mat !== '--:--') {
        const matTime = parseTimeToDate(prayer.mat);
        if (matTime) {
          const skipDhuhrFriday = isDhuhr && matTime.getDay() === 5;
          if (!skipDhuhrFriday) {
            const {androidChannelId, iosSound} = resolveAthanChannel(prayer.name, 'mat', athanPrefs);
            await scheduleEventNotification(
              `${prayerNameClean}_mat`,
              `📢 ${prayer.name} - Adhan`,
              `Adhan at the masjid at ${prayer.mat}`,
              matTime,
              androidChannelId,
              iosSound,
            );
          } else {
            console.log(`⏭️ Skipping Dhuhr MAT on Friday (Jumu'ah replaces)`);
          }
        }
      }

      // MIT — standard notification, no athan audio
      if (!isSunrise && prayer.mit && prayer.mit !== '--:--') {
        const mitTime = parseTimeToDate(prayer.mit);
        if (mitTime) {
          const skipDhuhrFriday = isDhuhr && mitTime.getDay() === 5;
          if (!skipDhuhrFriday) {
            await scheduleEventNotification(
              `${prayerNameClean}_mit`,
              `🕋 ${prayer.name} - Iqama`,
              `Congregation prayer starts at ${prayer.mit}`,
              mitTime,
            );
          } else {
            console.log(`⏭️ Skipping Dhuhr MIT on Friday (Jumu'ah replaces)`);
          }
        }
      }
    }

    // ── Jumu'ah – Friday only ──────────────────────────────────────────────
    const jumaaPrayer = prayers.find(
      p =>
        p.name.toLowerCase().includes('jumaa') ||
        p.name.toLowerCase().includes("jumu'ah"),
    );

    if (jumaaPrayer) {
      if (jumaaPrayer.mat && jumaaPrayer.mat !== '--:--') {
        const jumaaMatTime = parseTimeToDate(jumaaPrayer.mat);
        if (jumaaMatTime && jumaaMatTime.getDay() === 5) {
          const {androidChannelId, iosSound} = resolveAthanChannel(
            jumaaPrayer.name, 'mat', athanPrefs,
          );
          await scheduleEventNotification(
            'jumaa_mat',
            "📢 Jumu'ah - Khutba & Adhan",
            `Jumu'ah Khutba and Adhan at ${jumaaPrayer.mat}`,
            jumaaMatTime,
            androidChannelId,
            iosSound,
          );
          console.log(`✅ Scheduled Jumu'ah MAT for Friday`);
        }
      }

      if (jumaaPrayer.mit && jumaaPrayer.mit !== '--:--') {
        const jumaaMitTime = parseTimeToDate(jumaaPrayer.mit);
        if (jumaaMitTime && jumaaMitTime.getDay() === 5) {
          // No athan audio for MIT
          await scheduleEventNotification(
            'jumaa_mit',
            "🕋 Jumu'ah - Iqama",
            `Jumu'ah prayer starts at ${jumaaPrayer.mit}`,
            jumaaMitTime,
          );
          console.log(`✅ Scheduled Jumu'ah MIT for Friday`);
        }
      }
    }

    const triggers = await notifee.getTriggerNotifications();
    console.log(`✅ Successfully scheduled ${triggers.length} notifications`);
  } catch (error) {
    console.error('❌ Error scheduling prayer notifications:', error);
  }
};

// ─── Misc ──────────────────────────────────────────────────────────────────────

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
        pressAction: {id: 'default', launchActivity: 'default'},
        autoCancel: true,
      },
    });
  } catch (error) {
    console.error('Error showing refresh notification:', error);
  }
};

export const showUnreadAnnouncementsNotification = async (
  unreadCount: number,
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
        pressAction: {id: 'open_announcements', launchActivity: 'default'},
        autoCancel: true,
      },
    });
  } catch (error) {
    console.error('Error showing announcements notification:', error);
  }
};

export const areNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= 1;
  } catch (error) {
    return false;
  }
};

export const getNotificationPreferences = async () => {
  try {
    const prefs = await AsyncStorage.getItem('@notification_prefs');
    return prefs
      ? JSON.parse(prefs)
      : {
          prayerStart: true,
          adhan: true,
          iqama: true,
          sunrise: true,
          specialPrayers: true,
          dataRefresh: false,
          announcements: true,
        };
  } catch {
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

export const saveNotificationPreferences = async (prefs: any) => {
  try {
    await AsyncStorage.setItem('@notification_prefs', JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
};

export const getScheduledNotificationsSummary = async (): Promise<string> => {
  try {
    const triggers = await notifee.getTriggerNotifications();
    return triggers.length === 0
      ? 'No notifications scheduled'
      : `${triggers.length} notifications scheduled`;
  } catch {
    return 'Error getting notifications';
  }
};

export const initializeNotifications = async (): Promise<boolean> => {
  try {
    console.log('🔔 Initializing notifications...');
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ Notification permission denied');
      return false;
    }
    await createNotificationChannels();
    console.log('✅ Notifications initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    return false;
  }
};
