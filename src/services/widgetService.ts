// src/services/widgetService.ts
import { NativeModules, Platform } from 'react-native';
import { Prayer } from '../types';

const { WidgetModule } = NativeModules;

export const updateWidget = (prayers: Prayer[], nextPrayer: Prayer | null) => {
  if (!WidgetModule) {
    console.error('❌ Widget module not available');
    return;
  }

  try {
    // Filter prayers that have an actual time (exclude special/placeholder prayers)
    const mainPrayers = prayers.filter(p => p.apt && p.apt !== '--:--');

    if (mainPrayers.length === 0) {
      console.error('❌ No main prayers to display');
      return;
    }

    // Build data object with all prayer times
    const widgetData: any = {};

    mainPrayers.forEach(prayer => {
      const cleanName = prayer.name.toLowerCase().split(' ')[0]; // "fajr الفجر" → "fajr"
      widgetData[cleanName] = {
        apt: prayer.apt || '--:--',
        mat: prayer.mat || '--:--',
        mit: prayer.mit || '--:--',
      };
    });

    // Determine current prayer for highlighting
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayersForCountdown = mainPrayers.filter(
      p => !p.name.toLowerCase().startsWith('sunrise')
    );

    let currentPrayerIndex = 0;
    let foundUpcoming = false;

    for (let i = 0; i < prayersForCountdown.length; i++) {
      const prayer = prayersForCountdown[i];
      if (prayer.apt && prayer.apt !== '--:--') {
        const [hours, minutes] = prayer.apt.split(':').map(Number);
        if (hours * 60 + minutes > currentTime) {
          currentPrayerIndex = i;
          foundUpcoming = true;
          break;
        }
      }
    }

    if (!foundUpcoming) {
      currentPrayerIndex = 0;
    }

    const currentPrayer = prayersForCountdown[currentPrayerIndex];
    const mainPrayerIndex = mainPrayers.findIndex(p => p.name === currentPrayer.name);

    widgetData.currentPrayer = mainPrayers[mainPrayerIndex]?.name.split(' ')[0] ?? '';
    widgetData.next1Prayer   = mainPrayers[(mainPrayerIndex + 1) % mainPrayers.length]?.name.split(' ')[0] ?? '';
    widgetData.next2Prayer   = mainPrayers[(mainPrayerIndex + 2) % mainPrayers.length]?.name.split(' ')[0] ?? '';

    WidgetModule.updateWidget(widgetData);
    console.log('✅ Widget updated (' + Platform.OS + ')');
  } catch (error) {
    console.error('❌ Error updating widget:', error);
  }
};
