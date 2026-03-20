// src/components/MenuModal.tsx

import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {fetchMenuLinks} from '../services/firebaseService';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onAthanSettings: () => void; // lifted up — caller opens AthanSettingsModal
}

interface MenuLink {
  id: string;
  displayName: string;
  url: string;
  icon: string;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  visible,
  onClose,
  onRefresh,
  onAthanSettings,
}) => {
  const {isDark, toggleTheme, theme, timeFormat, toggleTimeFormat} = useTheme();
  const [menuLinks, setMenuLinks] = useState<MenuLink[]>([]);

  useEffect(() => {
    if (visible) {
      loadMenuLinks();
    }
  }, [visible]);

  const loadMenuLinks = async () => {
    const links = await fetchMenuLinks();
    if (links) {
      setMenuLinks(links);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View
          style={[styles.menu, {backgroundColor: theme.cardBackground}]}
          onStartShouldSetResponder={() => true}>
          <ScrollView style={styles.scrollView}>

            {/* Settings Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
                SETTINGS
              </Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { toggleTheme(); onClose(); }}>
                <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
                <Text style={[styles.menuText, {color: theme.text}]}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { toggleTimeFormat(); onClose(); }}>
                <Text style={styles.icon}>🕐</Text>
                <Text style={[styles.menuText, {color: theme.text}]}>
                  {timeFormat === '24h' ? '24 Hour Format' : '12 Hour Format'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();                  // close MenuModal first
                  setTimeout(onAthanSettings, 400); // then open AthanSettingsModal after animation finishes
                }}>
                <Text style={styles.icon}>🔊</Text>
                <Text style={[styles.menuText, {color: theme.text}]}>
                  Athan Settings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Links Section */}
            {menuLinks.length > 0 && (
              <View style={[styles.section, styles.linksSection]}>
                <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
                  LINKS
                </Text>
                {menuLinks.map(link => (
                  <TouchableOpacity
                    key={link.id}
                    style={styles.menuItem}
                    onPress={() => openLink(link.url)}>
                    <Text style={styles.icon}>{link.icon}</Text>
                    <Text style={[styles.menuText, {color: theme.text}]}>
                      {link.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.closeButton, {backgroundColor: theme.accent}]}
              onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {marginBottom: 24},
  linksSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    paddingTop: 16,
  },
  sectionTitle: {fontSize: 12, fontWeight: '600', marginBottom: 12, letterSpacing: 1},
  menuItem: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, flexWrap: 'wrap'},
  icon: {fontSize: 22, marginRight: 16, width: 28},
  menuText: {fontSize: 16, fontWeight: '500', flex: 1},
  closeButton: {marginTop: 8, padding: 16, borderRadius: 12, alignItems: 'center'},
  closeButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
