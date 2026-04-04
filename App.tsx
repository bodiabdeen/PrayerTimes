import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { EventType } from '@notifee/react-native';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {Header} from './src/components/Header';
import {DateDisplay} from './src/components/DateDisplay';
import {CountdownTimer} from './src/components/CountdownTimer';
import {PrayerTimesTable} from './src/components/PrayerTimesTable';
import {AnnouncementsModal} from './src/components/AnnouncementsModal';
import {MenuModal} from './src/components/MenuModal';
import {AthanSettingsModal} from './src/components/AthanSettingsModal';
import {WhatsNewModal} from './src/components/WhatsNewModal';
import {LoadingSpinner} from './src/components/LoadingSpinner';
import {ConfigInfo} from './src/components/ConfigInfo';
import {fetchAllPrayerData} from './src/services/firebaseService';
import {loadCachedData, saveCachedData} from './src/services/cacheService';
import {updateWidget} from './src/services/widgetService';
import {
  initializeNotifications,
  scheduleAllPrayerNotifications,
  showDataRefreshedNotification,
  showUnreadAnnouncementsNotification,
  getNotificationPreferences,
} from './src/services/notificationService';
import {getNextPrayer} from './src/utils/prayerUtils';
import {CombinedPrayerData} from './src/types';
import {configureBackgroundRefresh} from './src/services/backgroundRefreshService';

const AUTO_REFRESH_INTERVAL = 1 * 60 * 60 * 1000;

// Bump this version string with each release that has new features to announce.
const WHATS_NEW_VERSION = '1.3.0';
const WHATS_NEW_KEY = `@whats_new_shown_${WHATS_NEW_VERSION}`;

function AppContent(): React.JSX.Element {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prayerData, setPrayerData] = useState<CombinedPrayerData | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAthanSettings, setShowAthanSettings] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentNextPrayer, setCurrentNextPrayer] = useState<typeof prayerData extends {prayers: any[]} ? ReturnType<typeof getNextPrayer> : null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    console.log('🚀 App initializing... Bottom inset:', insets.bottom, 'px');
    initializeApp();

    const intervalId = setInterval(() => {
      console.log('⏰ In-app auto-refresh triggered');
      fetchFreshData();
    }, AUTO_REFRESH_INTERVAL);

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('🔔 Notification PRESSED (foreground)');
        await fetchFreshData();
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribeForeground();
    };
  }, [insets.bottom]);

  const checkWhatsNew = async () => {
    try {
      const seen = await AsyncStorage.getItem(WHATS_NEW_KEY);
      if (!seen) {
        setShowWhatsNew(true);
      }
    } catch (error) {
      console.error('Error checking whats new:', error);
    }
  };

  const dismissWhatsNew = async () => {
    setShowWhatsNew(false);
    try {
      await AsyncStorage.setItem(WHATS_NEW_KEY, 'true');
    } catch (error) {
      console.error('Error saving whats new state:', error);
    }
  };

  const initializeApp = async () => {
    const hasPermission = await initializeNotifications();
    setNotificationsEnabled(hasPermission);

    if (!hasPermission) {
      setTimeout(() => {
        Alert.alert(
          'Enable Notifications',
          'Get notified at prayer times and for new announcements.',
          [
            {text: 'Not Now', style: 'cancel'},
            {text: 'Enable', onPress: async () => {
              const granted = await initializeNotifications();
              setNotificationsEnabled(granted);
            }},
          ]
        );
      }, 2000);
    }

    try {
      await configureBackgroundRefresh((data) => {
        const normalized = normalizeData(data);
        setPrayerData(normalized);
      });
    } catch (error) {
      console.error('⚠️ Background refresh setup failed:', error);
    }

    await checkWhatsNew();
    loadInitialData();
  };

  useEffect(() => {
    if (prayerData?.announcements) {
      calculateUnreadCount();
    }
    if (prayerData?.prayers) {
      const nextPrayer = getNextPrayer(prayerData.prayers);
      setCurrentNextPrayer(nextPrayer);
      updateWidget(prayerData.prayers, nextPrayer);

      if (notificationsEnabled) {
        scheduleAllPrayerNotifications(prayerData.prayers);
      }
    }
  }, [prayerData, notificationsEnabled]);

  const calculateUnreadCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('@read_announcements');
      const readIds = stored ? new Set(JSON.parse(stored)) : new Set();
      const unread = prayerData?.announcements.filter(a => !readIds.has(a.id)).length || 0;
      setUnreadCount(unread);

      if (notificationsEnabled && unread > 0) {
        const prefs = await getNotificationPreferences();
        if (prefs.announcements) {
          showUnreadAnnouncementsNotification(unread);
        }
      }
    } catch (error) {
      console.error('Error calculating unread count:', error);
    }
  };

  const normalizeData = (data: any): CombinedPrayerData => {
    let announcementsList: any[] = [];
    if (Array.isArray(data.announcements)) {
      announcementsList = data.announcements;
    } else if (data.announcements?.list && Array.isArray(data.announcements.list)) {
      announcementsList = data.announcements.list;
    }

    return {
      prayers: Array.isArray(data.prayers) ? data.prayers : [],
      gregorianDate: data.gregorianDate || '',
      hijriDate: data.hijriDate || '',
      announcements: announcementsList,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      apiConfig: data.apiConfig || null,
    };
  };

  const loadInitialData = async () => {
    try {
      const cached = await loadCachedData();
      if (cached) {
        const normalized = normalizeData(cached);
        setPrayerData(normalized);
        setIsLoading(false);
      }
      await fetchFreshData();
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setIsLoading(false);
    }
  };

  const fetchFreshData = async () => {
    try {
      const data = await fetchAllPrayerData();
      if (data) {
        const normalized = normalizeData(data);
        setPrayerData(normalized);
        await saveCachedData(normalized);
        setIsOffline(false);

        if (notificationsEnabled) {
          const prefs = await getNotificationPreferences();
          if (prefs.dataRefresh) {
            showDataRefreshedNotification();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching fresh data:', error);
      setIsOffline(true);

      if (!prayerData) {
        Alert.alert(
          'Connection Error',
          'Unable to load prayer times. Please check your internet connection.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchFreshData();
    } catch (error) {
      Alert.alert('Refresh Failed', 'Unable to update prayer times.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!prayerData) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, {color: theme.text}]}>
            Unable to load prayer times
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, {backgroundColor: theme.accent}]}
            onPress={loadInitialData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleNextPrayerChange = (prayer: typeof currentNextPrayer) => {
    setCurrentNextPrayer(prayer);
    if (prayerData?.prayers && prayer) {
      updateWidget(prayerData.prayers, prayer);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <Header
        onMenuPress={() => setShowMenu(true)}
        onAnnouncementsPress={() => setShowAnnouncements(true)}
        unreadCount={unreadCount}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }>
        <DateDisplay gregorianDate={prayerData.gregorianDate} hijriDate={prayerData.hijriDate} />
        <CountdownTimer
          nextPrayer={currentNextPrayer}
          prayers={prayerData.prayers}
          onNextPrayerChange={handleNextPrayerChange}
        />
        <PrayerTimesTable prayers={prayerData.prayers} nextPrayerName={currentNextPrayer?.name || null} />
        <ConfigInfo config={prayerData.apiConfig || null} />
        <View style={{height: 72}} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.refreshButton, {backgroundColor: theme.accent, bottom: 16 + insets.bottom}]}
        onPress={handleRefresh}
        activeOpacity={0.8}>
        <Text style={styles.refreshIcon}>↻</Text>
      </TouchableOpacity>

      {isOffline && (
        <View style={[styles.offlineBanner, {backgroundColor: theme.warning}]}>
          <Text style={styles.offlineText}>⚠️ Offline - Showing cached data</Text>
        </View>
      )}

      <MenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onRefresh={handleRefresh}
        onAthanSettings={() => setShowAthanSettings(true)}
      />

      <AthanSettingsModal
        visible={showAthanSettings}
        onClose={() => setShowAthanSettings(false)}
      />

      <AnnouncementsModal
        visible={showAnnouncements}
        onClose={() => {
          setShowAnnouncements(false);
          calculateUnreadCount();
        }}
        announcements={prayerData.announcements}
      />

      <WhatsNewModal
        visible={showWhatsNew}
        onClose={dismissWhatsNew}
      />
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollView: {flex: 1},
  scrollContent: {paddingBottom: 8},
  errorContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
  errorText: {fontSize: 16, textAlign: 'center', marginBottom: 20},
  retryButton: {paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8},
  retryButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  refreshButton: {position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8},
  refreshIcon: {fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', ...(Platform.OS === 'android' ? {transform: [{translateY: -4}]} : {})},
  offlineBanner: {position: 'absolute', top: 0, left: 0, right: 0, padding: 8, alignItems: 'center'},
  offlineText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
});

export default App;
