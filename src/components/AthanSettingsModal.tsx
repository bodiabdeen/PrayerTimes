// src/components/AthanSettingsModal.tsx

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import notifee, {AndroidImportance} from '@notifee/react-native';
import {useTheme} from '../contexts/ThemeContext';
import {
  AthanPreferences,
  PrayerAthanKey,
  ATHAN_SOUNDS,
  DEFAULT_ATHAN_PREFERENCES,
  getAthanPreferences,
  saveAthanPreferences,
  getAthanChannelId,
} from '../services/athanService';

// ─── Prayer rows config ───────────────────────────────────────────────────────

interface PrayerRow {
  key: PrayerAthanKey;
  label: string;
  hasApt: boolean;
}

const PRAYER_ROWS: PrayerRow[] = [
  {key: 'fajr',    label: 'Fajr',     hasApt: true},
  {key: 'dhuhr',   label: 'Dhuhr',    hasApt: true},
  {key: 'asr',     label: 'Asr',      hasApt: true},
  {key: 'maghrib', label: 'Maghrib',  hasApt: true},
  {key: 'isha',    label: 'Isha',     hasApt: true},
  {key: 'jumaa',   label: "Jumu'ah",  hasApt: false},
];

// ─── Chip — defined OUTSIDE the parent component ─────────────────────────────

interface ChipProps {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  accentColor: string;
  textColor: string;
  borderColor: string;
}

const Chip: React.FC<ChipProps> = ({label, active, disabled, onPress, accentColor, textColor, borderColor}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    style={[
      styles.chip,
      {
        backgroundColor: active && !disabled ? accentColor : 'transparent',
        borderColor: disabled ? borderColor : active ? accentColor : borderColor,
        opacity: disabled ? 0.4 : 1,
      },
    ]}>
    <Text style={[styles.chipText, {color: active && !disabled ? '#FFFFFF' : textColor}]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface AthanSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const AthanSettingsModal: React.FC<AthanSettingsModalProps> = ({visible, onClose}) => {
  const {theme} = useTheme();
  const [prefs, setPrefs]           = useState<AthanPreferences>(DEFAULT_ATHAN_PREFERENCES);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [playingId, setPlayingId]   = useState<string | null>(null);
  const activeIdRef                 = useRef<string | null>(null);
  const playingTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      getAthanPreferences().then(setPrefs);
    } else {
      resetPreview();
    }
  }, [visible]);

  const resetPreview = () => {
    if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
    activeIdRef.current = null;
    setLoadingId(null);
    setPlayingId(null);
  };

  const previewSound = useCallback(async (soundId: string, soundName: string, fileName: string) => {
    if (activeIdRef.current === soundId) return;
    if (playingTimerRef.current) clearTimeout(playingTimerRef.current);

    activeIdRef.current = soundId;
    setLoadingId(soundId);
    setPlayingId(null);

    try {
      await notifee.displayNotification({
        id: 'athan_preview',
        title: `🔊 ${soundName}`,
        body: 'Athan preview',
        android: {
          channelId: getAthanChannelId(soundId),
          importance: AndroidImportance.HIGH,
          autoCancel: true,
          pressAction: {id: 'default', launchActivity: 'default'},
        },
        ios: {
          sound: `${fileName}.mp3`,
          foregroundPresentationOptions: {alert: true, badge: false, sound: true},
        },
      });

      setLoadingId(null);
      setPlayingId(soundId);

      playingTimerRef.current = setTimeout(() => {
        activeIdRef.current = null;
        setPlayingId(null);
      }, 5000);
    } catch (error) {
      console.error('Preview failed:', error);
      activeIdRef.current = null;
      setLoadingId(null);
      setPlayingId(null);
    }
  }, []);

  const save = useCallback(async (updated: AthanPreferences) => {
    setPrefs(updated);
    await saveAthanPreferences(updated);
  }, []);

  const toggleEnabled = (key: PrayerAthanKey) =>
    save({...prefs, prayers: {...prefs.prayers, [key]: {...prefs.prayers[key], enabled: !prefs.prayers[key].enabled}}});

  const toggleApt = (key: PrayerAthanKey) =>
    save({...prefs, prayers: {...prefs.prayers, [key]: {...prefs.prayers[key], playOnApt: !prefs.prayers[key].playOnApt}}});

  const toggleMat = (key: PrayerAthanKey) =>
    save({...prefs, prayers: {...prefs.prayers, [key]: {...prefs.prayers[key], playOnMat: !prefs.prayers[key].playOnMat}}});

  const setAthanSound = (id: string) => save({...prefs, athanSound: id});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {backgroundColor: theme.cardBackground}]}>

          {/* Title bar */}
          <View style={[styles.titleBar, {borderBottomColor: theme.border}]}>
            <Text style={[styles.title, {color: theme.text}]}>🔊 Athan Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={[styles.closeX, {color: theme.textSecondary}]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Prayers */}
            <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>PRAYERS</Text>

            {PRAYER_ROWS.map(row => {
              const config = prefs.prayers[row.key];
              return (
                <View
                  key={row.key}
                  style={[
                    styles.prayerRow,
                    {
                      borderColor: config.enabled ? theme.accent : theme.border,
                      backgroundColor: config.enabled ? theme.accent + '10' : theme.surface,
                    },
                  ]}>
                  <View style={styles.prayerHeader}>
                    <Text style={[styles.prayerName, {color: theme.text}]}>{row.label}</Text>
                    <Switch
                      value={config.enabled}
                      onValueChange={() => toggleEnabled(row.key)}
                      trackColor={{false: theme.border, true: theme.accent}}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View style={styles.chipRow}>
                    {row.hasApt && (
                      <Chip
                        label="Start Time"
                        active={config.playOnApt}
                        disabled={!config.enabled}
                        onPress={() => toggleApt(row.key)}
                        accentColor={theme.accent}
                        textColor={theme.text}
                        borderColor={theme.border}
                      />
                    )}
                    <Chip
                      label={row.key === 'jumaa' ? 'Khutba / Adhan' : 'Adhan Time'}
                      active={config.playOnMat}
                      disabled={!config.enabled}
                      onPress={() => toggleMat(row.key)}
                      accentColor={theme.accent}
                      textColor={theme.text}
                      borderColor={theme.border}
                    />
                  </View>
                </View>
              );
            })}

            <View style={[styles.divider, {backgroundColor: theme.border}]} />

            {/* Sound picker */}
            <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>ATHAN SOUND</Text>

            {ATHAN_SOUNDS.map(opt => {
              const isSelected  = prefs.athanSound === opt.id;
              const isLoading   = loadingId === opt.id;
              const isPlaying   = playingId === opt.id;
              const isActive    = isLoading || isPlaying;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.soundRow}
                  onPress={() => setAthanSound(opt.id)}
                  activeOpacity={0.7}>

                  <View style={[styles.radioOuter, {borderColor: isSelected ? theme.accent : theme.border}]}>
                    {isSelected && <View style={[styles.radioInner, {backgroundColor: theme.accent}]} />}
                  </View>

                  <Text style={[styles.soundName, {color: theme.text}]}>{opt.name}</Text>

                  <TouchableOpacity
                    onPress={() => previewSound(opt.id, opt.name, opt.fileName)}
                    disabled={isLoading}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    style={[
                      styles.previewBtn,
                      {
                        backgroundColor: isActive ? theme.accent : theme.accent + '20',
                        borderColor: theme.accent,
                      },
                    ]}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.previewIcon, {color: isPlaying ? '#FFFFFF' : theme.accent}]}>
                        {isPlaying ? '♪' : '▶'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.note, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.noteText, {color: theme.textSecondary}]}>
                ℹ️  Tap ▶ to preview the athan as a notification.{'\n'}
                Jumu'ah athan replaces Dhuhr adhan on Fridays only.
              </Text>
            </View>

            <View style={{height: 16}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  sheet: {
    flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%',
    elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  titleBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {fontSize: 17, fontWeight: '700'},
  closeX: {fontSize: 18},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  sectionLabel: {fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10},
  prayerRow: {borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8},
  prayerHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  prayerName: {fontSize: 15, fontWeight: '600'},
  chipRow: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  chip: {paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5},
  chipText: {fontSize: 13, fontWeight: '500'},
  soundRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12},
  radioOuter: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  radioInner: {width: 10, height: 10, borderRadius: 5},
  soundName: {fontSize: 14, flex: 1},
  previewBtn: {width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center'},
  previewIcon: {fontSize: 13, fontWeight: '700'},
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 16},
  note: {borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginTop: 16},
  noteText: {fontSize: 12, lineHeight: 18},
});
