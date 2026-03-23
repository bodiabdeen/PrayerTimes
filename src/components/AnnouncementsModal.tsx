import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '../contexts/ThemeContext';
import {Announcement} from '../types';

interface AnnouncementsModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: Announcement[];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  visible,
  onClose,
  announcements,
}) => {
  const {theme} = useTheme();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReadStatus();
  }, []);

  const loadReadStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('@read_announcements');
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading read status:', error);
    }
  };

  const markAsRead = async (id: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(id);
    setReadIds(newReadIds);

    try {
      await AsyncStorage.setItem(
        '@read_announcements',
        JSON.stringify(Array.from(newReadIds)),
      );
    } catch (error) {
      console.error('Error saving read status:', error);
    }
  };

  const markAllAsRead = async () => {
    const allIds = new Set(announcements.map(a => a.id));
    setReadIds(allIds);

    try {
      await AsyncStorage.setItem(
        '@read_announcements',
        JSON.stringify(Array.from(allIds)),
      );
    } catch (error) {
      console.error('Error saving read status:', error);
    }
  };

  const allRead =
    announcements.length > 0 &&
    announcements.every(a => readIds.has(a.id));

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return theme.announcementUrgent;
      case 'important':
        return theme.announcementImportant;
      default:
        return theme.announcementNormal;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${month} ${day}, ${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[styles.modalContainer, {backgroundColor: theme.background}]}>
          <View style={[styles.header, {borderBottomColor: theme.border}]}>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              Announcements
            </Text>
            <View style={styles.headerActions}>
              {announcements.length > 0 && !allRead && (
                <TouchableOpacity
                  onPress={markAllAsRead}
                  style={[
                    styles.markAllButton,
                    {borderColor: theme.accent},
                  ]}>
                  <Text style={[styles.markAllText, {color: theme.accent}]}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeText, {color: theme.accent}]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollView}>
            {announcements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                  No announcements
                </Text>
              </View>
            ) : (
              announcements.map(announcement => {
                const isRead = readIds.has(announcement.id);
                return (
                  <TouchableOpacity
                    key={announcement.id}
                    style={[
                      styles.announcementCard,
                      {
                        backgroundColor: theme.cardBackground,
                        borderColor: getPriorityColor(announcement.priority),
                        opacity: isRead ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => markAsRead(announcement.id)}>
                    {!isRead && (
                      <View
                        style={[
                          styles.unreadDot,
                          {backgroundColor: theme.accent},
                        ]}
                      />
                    )}

                    {announcement.title && (
                      <Text style={[styles.title, {color: theme.text}]}>
                        {announcement.title}
                      </Text>
                    )}

                    <Text
                      style={[styles.message, {color: theme.textSecondary}]}>
                      {announcement.message}
                    </Text>

                    <Text style={[styles.date, {color: theme.textSecondary}]}>
                      {formatDate(announcement.createdAt)}
                    </Text>

                    {isRead && (
                      <Text
                        style={[styles.readLabel, {color: theme.textSecondary}]}>
                        ✓ Read
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  announcementCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingRight: 20,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    marginTop: 4,
  },
  readLabel: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
