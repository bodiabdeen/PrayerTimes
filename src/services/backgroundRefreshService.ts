// src/services/backgroundRefreshService.ts
// Background refresh service for automatic prayer times updates
// VERSION 1.1 - FIXED: Now checks for NEW announcements and notifies users!

import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllPrayerData } from './firebaseService';
import { saveCachedData, loadCachedData } from './cacheService';
import {
  scheduleAllPrayerNotifications,
  showUnreadAnnouncementsNotification,
} from './notificationService';

/**
 * Check for new announcements and show notification
 */
const checkForNewAnnouncements = async (newData: any): Promise<void> => {
  try {
    console.log('📢 [BackgroundFetch] Checking for new announcements...');

    // Get cached data to compare
    const cachedData = await loadCachedData();

    if (!newData.announcements || !Array.isArray(newData.announcements.list)) {
      console.log('⚠️ [BackgroundFetch] No announcements in new data');
      return;
    }

    const newAnnouncements = newData.announcements.list;
    console.log(
      `📢 [BackgroundFetch] Found ${newAnnouncements.length} total announcements`,
    );

    if (!cachedData || !cachedData.announcements) {
      console.log(
        '📢 [BackgroundFetch] No cached announcements - this is first load',
      );
      // First time - don't notify about existing announcements
      return;
    }

    // Get list of previously seen announcement IDs
    const cachedAnnouncementIds = new Set(
      Array.isArray(cachedData.announcements)
        ? cachedData.announcements.map((a: any) => a.id)
        : (cachedData.announcements.list || []).map((a: any) => a.id),
    );

    console.log(
      `📢 [BackgroundFetch] Previously had ${cachedAnnouncementIds.size} announcements`,
    );

    // Find NEW announcements (IDs that weren't in cache)
    const newOnes = newAnnouncements.filter(
      (a: any) => !cachedAnnouncementIds.has(a.id),
    );

    if (newOnes.length > 0) {
      console.log(
        '🎉 [BackgroundFetch] ========================================',
      );
      console.log(
        `🎉 [BackgroundFetch] FOUND ${newOnes.length} NEW ANNOUNCEMENT(S)!`,
      );
      console.log(
        '🎉 [BackgroundFetch] ========================================',
      );

      newOnes.forEach((ann: any, index: number) => {
        console.log(`📢 [BackgroundFetch] New #${index + 1}:`, {
          id: ann.id,
          priority: ann.priority,
          message: ann.message?.substring(0, 50) + '...',
        });
      });

      // Show notification about new announcements
      await showUnreadAnnouncementsNotification(newOnes.length);
      console.log(
        '✅ [BackgroundFetch] Notification sent for new announcements!',
      );
    } else {
      console.log('📢 [BackgroundFetch] No new announcements');
    }
  } catch (error) {
    console.error('❌ [BackgroundFetch] Error checking announcements:', error);
  }
};

/**
 * Configure background refresh task
 * Refreshes prayer times every 1 HOUR and checks for new announcements
 */
export const configureBackgroundRefresh = async (
  onRefresh: (data: any) => void,
): Promise<void> => {
  try {
    console.log('🔄 [BackgroundFetch] Configuring...');

    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 60, // 1 hour (60 minutes)
        stopOnTerminate: false, // Continue after app termination
        startOnBoot: true, // Start service on device boot
        enableHeadless: true, // Allow headless execution (Android)
        requiresCharging: false, // Don't require charging
        requiresDeviceIdle: false, // Don't require device idle
        requiresBatteryNotLow: false, // Don't require battery not low
        requiresStorageNotLow: false, // Don't require storage not low
        forceAlarmManager: true, // Use AlarmManager for more reliable execution
      },
      async taskId => {
        const now = new Date();
        console.log(
          '🔄 [BackgroundFetch] ========================================',
        );
        console.log('🔄 [BackgroundFetch] Task started:', taskId);
        console.log('🔄 [BackgroundFetch] Time:', now.toLocaleString());
        console.log(
          '🔄 [BackgroundFetch] ========================================',
        );

        try {
          // Fetch fresh prayer data
          console.log('🔄 [BackgroundFetch] Fetching prayer data...');
          const data = await fetchAllPrayerData();

          if (data) {
            console.log('✅ [BackgroundFetch] Data fetched successfully!');

            // CHECK FOR NEW ANNOUNCEMENTS BEFORE SAVING
            await checkForNewAnnouncements(data);

            // Save to cache
            console.log('🔄 [BackgroundFetch] Saving to cache...');
            await saveCachedData(data);
            console.log('✅ [BackgroundFetch] Data cached');

            // Reschedule notifications with new data
            if (data.prayers) {
              console.log('🔄 [BackgroundFetch] Rescheduling notifications...');
              await scheduleAllPrayerNotifications(data.prayers);
              console.log('✅ [BackgroundFetch] Notifications rescheduled');
            }

            // Notify the app (if callback provided)
            if (onRefresh) {
              console.log('🔄 [BackgroundFetch] Calling refresh callback...');
              onRefresh(data);
            }

            console.log(
              '✅ [BackgroundFetch] ========================================',
            );
            console.log('✅ [BackgroundFetch] Task completed successfully!');
            console.log('✅ [BackgroundFetch] Next refresh in ~1 hour');
            console.log(
              '✅ [BackgroundFetch] Will check for new announcements then',
            );
            console.log(
              '✅ [BackgroundFetch] ========================================',
            );
          } else {
            console.warn('⚠️ [BackgroundFetch] No data returned from server');
          }
        } catch (error) {
          console.error(
            '❌ [BackgroundFetch] ========================================',
          );
          console.error('❌ [BackgroundFetch] Error during refresh:', error);
          console.error(
            '❌ [BackgroundFetch] ========================================',
          );
        }

        // REQUIRED: Signal completion to the OS
        BackgroundFetch.finish(taskId);
        console.log('🏁 [BackgroundFetch] Task finished signal sent to OS');
      },
      taskId => {
        // This callback is executed when task times out
        console.log(
          '⏰ [BackgroundFetch] ========================================',
        );
        console.log('⏰ [BackgroundFetch] Task timeout:', taskId);
        console.log(
          '⏰ [BackgroundFetch] ========================================',
        );
        BackgroundFetch.finish(taskId);
      },
    );

    console.log('✅ [BackgroundFetch] Configuration successful!');
    console.log('✅ [BackgroundFetch] Status code:', status);
    console.log('✅ [BackgroundFetch] Status meaning:');
    console.log('   0 = Restricted (unavailable)');
    console.log('   1 = Denied (user disabled)');
    console.log('   2 = Available (enabled)');
    console.log('✅ [BackgroundFetch] Interval: Every 1 hour (60 minutes)');
    console.log(
      '✅ [BackgroundFetch] Will check for new announcements every hour',
    );

    // Start the background fetch service
    await BackgroundFetch.start();
    console.log('✅ [BackgroundFetch] Service STARTED successfully');
    console.log('✅ [BackgroundFetch] Background refresh is now active!');
  } catch (error) {
    console.error(
      '❌ [BackgroundFetch] ========================================',
    );
    console.error('❌ [BackgroundFetch] Configuration FAILED:', error);
    console.error(
      '❌ [BackgroundFetch] ========================================',
    );
    throw error;
  }
};

/**
 * Start background refresh service manually
 */
export const startBackgroundRefresh = async (): Promise<void> => {
  try {
    await BackgroundFetch.start();
    console.log('✅ [BackgroundFetch] Service started manually');
  } catch (error) {
    console.error('❌ [BackgroundFetch] Failed to start:', error);
    throw error;
  }
};

/**
 * Stop background refresh service
 */
export const stopBackgroundRefresh = async (): Promise<void> => {
  try {
    await BackgroundFetch.stop();
    console.log('⏹️ [BackgroundFetch] Service stopped');
  } catch (error) {
    console.error('❌ [BackgroundFetch] Failed to stop:', error);
    throw error;
  }
};

/**
 * Get background fetch status
 */
export const getBackgroundFetchStatus = async (): Promise<number> => {
  try {
    const status = await BackgroundFetch.status();
    console.log('📊 [BackgroundFetch] Current status:', status);
    console.log('   0 = Restricted (unavailable)');
    console.log('   1 = Denied (user disabled)');
    console.log('   2 = Available (enabled)');

    return status;
  } catch (error) {
    console.error('❌ [BackgroundFetch] Failed to get status:', error);
    return 0;
  }
};

/**
 * Schedule a one-time background fetch task immediately (for testing)
 */
export const scheduleTestBackgroundFetch = async (): Promise<void> => {
  try {
    console.log('🧪 [BackgroundFetch] Scheduling TEST task...');
    await BackgroundFetch.scheduleTask({
      taskId: 'com.jicprayertimes.test',
      delay: 10000, // 10 seconds delay (in milliseconds)
      periodic: false,
      forceAlarmManager: true,
      stopOnTerminate: false,
      enableHeadless: true,
    });
    console.log(
      '✅ [BackgroundFetch] TEST task scheduled for 10 seconds from now',
    );
    console.log(
      '🧪 [BackgroundFetch] Watch console logs for task execution...',
    );
    console.log(
      '🧪 [BackgroundFetch] Add a test announcement to Firebase now!',
    );
  } catch (error) {
    console.error('❌ [BackgroundFetch] Failed to schedule test task:', error);
  }
};

/**
 * Manually trigger announcement check (for testing)
 */
export const testAnnouncementCheck = async (): Promise<void> => {
  try {
    console.log('🧪 [TEST] Manual announcement check triggered...');
    const data = await fetchAllPrayerData();
    if (data) {
      await checkForNewAnnouncements(data);
      await saveCachedData(data);
      console.log('✅ [TEST] Manual check complete!');
    }
  } catch (error) {
    console.error('❌ [TEST] Error:', error);
  }
};

/**
 * Get info about current configuration
 */
export const getBackgroundFetchInfo = async (): Promise<void> => {
  try {
    const status = await BackgroundFetch.status();
    console.log(
      '📊 [BackgroundFetch] ========================================',
    );
    console.log('📊 [BackgroundFetch] Configuration Info:');
    console.log('📊 [BackgroundFetch] Status:', status);
    console.log('📊 [BackgroundFetch] Interval: 60 minutes (1 hour)');
    console.log('📊 [BackgroundFetch] Stop on terminate: false');
    console.log('📊 [BackgroundFetch] Start on boot: true');
    console.log('📊 [BackgroundFetch] Requires charging: false');
    console.log('📊 [BackgroundFetch] Checks announcements: YES ✅');
    console.log(
      '📊 [BackgroundFetch] ========================================',
    );
  } catch (error) {
    console.error('❌ [BackgroundFetch] Failed to get info:', error);
  }
};
