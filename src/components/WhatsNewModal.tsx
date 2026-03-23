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

const FEATURES = [
  {
    icon: '🤖',
    title: 'Android Home Screen Widget',
    description:
      'Add the Prayer Times widget to your Android home screen to see the next prayer at a glance — no need to open the app.',
    platform: 'android',
  },
  {
    icon: '🍎',
    title: 'iOS Home Screen Widget',
    description:
      'Add the Prayer Times widget to your iPhone home screen or Lock Screen for instant access to upcoming prayer times.',
    platform: 'ios',
  },
  {
    icon: '🔔',
    title: 'Athan Settings',
    description:
      'Customise your Athan experience — choose which prayers play the Athan, toggle notification sounds, and more from the menu.',
    platform: 'all',
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
              Here's what's new in this update
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
