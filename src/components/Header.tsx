import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

interface HeaderProps {
  onMenuPress: () => void;
  onAnnouncementsPress: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({onMenuPress, onAnnouncementsPress, unreadCount}) => {
  const {theme} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.header, paddingTop: 8},
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.textOnPrimary}]}>
          The Isle of Man Islamic Centre
        </Text>
        
        <View style={styles.rightButtons}>
          <TouchableOpacity
            onPress={onAnnouncementsPress}
            style={styles.announcementButton}
            activeOpacity={0.7}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, {backgroundColor: theme.error}]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuButton}
            activeOpacity={0.7}>
            <View style={styles.burgerIcon}>
              <View style={[styles.burgerLine, {backgroundColor: theme.textOnPrimary}]} />
              <View style={[styles.burgerLine, {backgroundColor: theme.textOnPrimary}]} />
              <View style={[styles.burgerLine, {backgroundColor: theme.textOnPrimary}]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  announcementButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  burgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  burgerLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
