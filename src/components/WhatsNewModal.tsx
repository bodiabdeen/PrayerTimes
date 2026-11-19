import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * The pop-up shows once after each new version. For every release, change WHATS_NEW_VERSION
 * and rewrite FEATURES below (CLAUDE.md, "Each new version").
 */
export const WHATS_NEW_VERSION = '2.0';

const FEATURES = [
  {
    icon: '🎨',
    title: 'A fresh new look',
    description:
      'The app now uses the new Emerald look, with a ring that counts down to the next prayer. Prefer the old style? Open the menu (☰) and tap "Look" to switch back to Classic at any time.',
    platform: 'all',
  },
  {
    icon: '📅',
    title: "Tomorrow's prayer times",
    description:
      'Tap "Tomorrow / غدًا" above the prayer list to see the times for tomorrow.',
    platform: 'all',
  },
  {
    icon: '🌙',
    title: 'Special prayers',
    description:
      'Special prayers and events arranged by the masjid now appear in the list, with their date and time.',
    platform: 'all',
  },
  {
    icon: '📱',
    title: 'New home screen widgets',
    description:
      'Two new Emerald widgets: "Next prayer" and "Prayer day". Touch and hold your home screen, tap Widgets, then find IOMPrayerTimes.',
    platform: 'android',
  },
  {
    icon: '📱',
    title: 'New home screen widget',
    description:
      'A new "Prayer Times (Emerald)" widget in small and medium sizes, and for the Lock Screen. Touch and hold your home screen, tap Edit, then Add Widget.',
    platform: 'ios',
  },
];

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  visible,
  onClose,
}) => {
  const {theme} = useTheme();

  const visibleFeatures = FEATURES.filter(f => {
    if (f.platform === 'all') return true;
    if (f.platform === 'android') return Platform.OS === 'android';
    if (f.platform === 'ios') return Platform.OS === 'ios';
    return true;
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[styles.modalContainer, {backgroundColor: theme.background}]}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={[styles.title, {color: theme.text}]}>
              What's New
            </Text>
            <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
              Here's what's new in version {WHATS_NEW_VERSION}
            </Text>
          </View>

          {/* Features list */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {visibleFeatures.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureRow,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, {color: theme.text}]}>
                    {feature.title}
                  </Text>
                  <Text
                    style={[
                      styles.featureDescription,
                      {color: theme.textSecondary},
                    ]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTA */}
          <View style={[styles.footer, {borderTopColor: theme.border}]}>
            <TouchableOpacity
              style={[styles.continueButton, {backgroundColor: theme.accent}]}
              onPress={onClose}
              activeOpacity={0.85}>
              <Text style={styles.continueText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.78,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  sparkle: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  featureIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  continueButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
