// src/components/AthanSettingsModal.tsx

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

// ─── Constants ────────────────────────────────────────────────────────────────

interface PrayerRow {
  key: PrayerAthanKey;
  label: string;
  hasApt: boolean;
}

const PRAYER_ROWS: PrayerRow[] = [
  {key: 'fajr',    label: 'Fajr',    hasApt: true},
  {key: 'dhuhr',   label: 'Dhuhr',   hasApt: true},
  {key: 'asr',     label: 'Asr',     hasApt: true},
  {key: 'maghrib', label: 'Maghrib', hasApt: true},
  {key: 'isha',    label: 'Isha',    hasApt: true},
  {key: 'jumaa',   label: "Jumu'ah", hasApt: false},
  {key: 'jumaa2',  label: "Jumu'ah 2", hasApt: false},
];

// ─── Chip (module-level, no hooks) ────────────────────────────────────────────

const Chip = ({
  label, active, disabled, onPress, accent, text, border,
}: {
  label: string; active: boolean; disabled: boolean;
  onPress: () => void; accent: string; text: string; border: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    style={[
      styles.chip,
      {
        backgroundColor: active && !disabled ? accent : 'transparent',
        borderColor: active && !disabled ? accent : border,
        opacity: disabled ? 0.38 : 1,
      },
    ]}>
    <Text style={[styles.chipText, {color: active && !disabled ? '#FFF' : text}]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const AthanSettingsModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const {theme} = useTheme();

  const [prefs, setPrefs] = useState<AthanPreferences>(DEFAULT_ATHAN_PREFERENCES);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const activeRef = useRef<string | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on open, reset preview on close
  useEffect(() => {
    if (visible) {
      getAthanPreferences().then(loaded => setPrefs(loaded));
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      activeRef.current = null;
      setLoadingId(null);
      setPlayingId(null);
    }
  }, [visible]);

  // ── Persist helper ────────────────────────────────────────────────────────
  const persist = (updated: AthanPreferences) => {
    setPrefs(updated);
    saveAthanPreferences(updated); // fire-and-forget, no await needed
  };

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggleEnabled = (key: PrayerAthanKey) => {
    const updated: AthanPreferences = {
      ...prefs,
      prayers: {
        ...prefs.prayers,
        [key]: {
          ...prefs.prayers[key],
          enabled: !prefs.prayers[key].enabled,
        },
      },
    };
    persist(updated);
  };

  const toggleApt = (key: PrayerAthanKey) => {
    const updated: AthanPreferences = {
      ...prefs,
      prayers: {
        ...prefs.prayers,
        [key]: {
          ...prefs.prayers[key],
          playOnApt: !prefs.prayers[key].playOnApt,
        },
      },
    };
    persist(updated);
  };

  const toggleMat = (key: PrayerAthanKey) => {
    const updated: AthanPreferences = {
      ...prefs,
      prayers: {
        ...prefs.prayers,
        [key]: {
          ...prefs.prayers[key],
          playOnMat: !prefs.prayers[key].playOnMat,
        },
      },
    };
    persist(updated);
  };

  const selectSound = (id: string) => persist({...prefs, athanSound: id});

  // ── Preview ───────────────────────────────────────────────────────────────
  const previewSound = useCallback(async (
    soundId: string,
    soundName: string,
    fileName: string,
  ) => {
    if (activeRef.current === soundId) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    activeRef.current = soundId;
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
      timerRef.current = setTimeout(() => {
        activeRef.current = null;
        setPlayingId(null);
      }, 5000);
    } catch (e) {
      console.error('Preview error:', e);
      activeRef.current = null;
      setLoadingId(null);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {backgroundColor: theme.cardBackground}]}>

          {/* Header */}
          <View style={[styles.header, {borderBottomColor: theme.border}]}>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              🔊 Athan Settings
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={[styles.headerClose, {color: theme.textSecondary}]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>

            {/* ── Prayer rows ── */}
            <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>
              PRAYERS
            </Text>

            {PRAYER_ROWS.map(row => {
              const cfg = prefs.prayers[row.key];
              return (
                <View
                  key={row.key}
                  style={[
                    styles.prayerCard,
                    {
                      borderColor:  cfg.enabled ? theme.accent : theme.border,
                      backgroundColor: cfg.enabled ? theme.accent + '12' : theme.surface,
                    },
                  ]}>
                  {/* Name + Switch */}
                  <View style={styles.prayerCardHeader}>
                    <Text style={[styles.prayerCardName, {color: theme.text}]}>
                      {row.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleEnabled(row.key)}
                      activeOpacity={0.8}
                      style={[
                        styles.togglePill,
                        {backgroundColor: cfg.enabled ? theme.accent : theme.border},
                      ]}>
                      <View style={[
                        styles.toggleThumb,
                        {transform: [{translateX: cfg.enabled ? 20 : 2}]},
                      ]} />
                    </TouchableOpacity>
                  </View>
                  {/* Chips */}
                  <View style={styles.chipRow}>
                    {row.hasApt && (
                      <Chip
                        label="Start Time"
                        active={cfg.playOnApt}
                        disabled={!cfg.enabled}
                        onPress={() => toggleApt(row.key)}
                        accent={theme.accent}
                        text={theme.text}
                        border={theme.border}
                      />
                    )}
                    <Chip
                      label={(row.key === 'jumaa' || row.key === 'jumaa2') ? 'Khutba / Adhan' : 'Adhan Time'}
                      active={cfg.playOnMat}
                      disabled={!cfg.enabled}
                      onPress={() => toggleMat(row.key)}
                      accent={theme.accent}
                      text={theme.text}
                      border={theme.border}
                    />
                  </View>
                </View>
              );
            })}

            {/* ── Sound picker ── */}
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
            <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>
              ATHAN SOUND
            </Text>

            {ATHAN_SOUNDS.map(opt => {
              const isSelected = prefs.athanSound === opt.id;
              const isLoading  = loadingId === opt.id;
              const isPlaying  = playingId === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.soundRow}
                  onPress={() => selectSound(opt.id)}
                  activeOpacity={0.7}>
                  {/* Radio */}
                  <View style={[styles.radio, {borderColor: isSelected ? theme.accent : theme.border}]}>
                    {isSelected && (
                      <View style={[styles.radioDot, {backgroundColor: theme.accent}]} />
                    )}
                  </View>
                  <Text style={[styles.soundName, {color: theme.text}]}>{opt.name}</Text>
                  {/* Preview btn */}
                  <TouchableOpacity
                    onPress={() => previewSound(opt.id, opt.name, opt.fileName)}
                    disabled={isLoading}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    style={[
                      styles.previewBtn,
                      {
                        backgroundColor: (isLoading || isPlaying) ? theme.accent : theme.accent + '22',
                        borderColor: theme.accent,
                      },
                    ]}>
                    {isLoading
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={[styles.previewIcon, {color: isPlaying ? '#FFF' : theme.accent}]}>
                          {isPlaying ? '♪' : '▶'}
                        </Text>
                    }
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* Note */}
            <View style={[styles.note, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.noteText, {color: theme.textSecondary}]}>
                ℹ️  Tap ▶ to preview the athan as a notification.{'\n'}
                Jumu'ah athan replaces Dhuhr adhan on Fridays only.
              </Text>
            </View>

            <View style={{height: 20}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {fontSize: 17, fontWeight: '700'},
  headerClose: {fontSize: 18},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 12,
  },
  prayerCard: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  prayerCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  prayerCardName: {fontSize: 15, fontWeight: '600'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
  },
  chipText: {fontSize: 13, fontWeight: '500'},
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 16},
  soundRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: {width: 10, height: 10, borderRadius: 5},
  soundName: {fontSize: 14, flex: 1},
  previewBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  previewIcon: {fontSize: 13, fontWeight: '700'},
  note: {
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    padding: 12, marginTop: 12,
  },
  noteText: {fontSize: 12, lineHeight: 18},
  togglePill: {
    width: 48, height: 28, borderRadius: 14,
    justifyContent: 'center', padding: 2,
  },
  toggleThumb: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
