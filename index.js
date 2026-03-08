/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, { EventType } from '@notifee/react-native';

console.log('📱 ========================================');
console.log('📱 App Index Loading...');
console.log('📱 ========================================');

// CHANGE #5: Handle background notification events
// This allows the app to respond when user taps a notification while app is in background/closed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('🔔 ========================================');
  console.log('🔔 Background notification event received');
  console.log('🔔 Event type:', type);
  console.log('🔔 Event type number:', type);
  console.log('🔔 EventType.PRESS value:', EventType.PRESS);
  
  if (type === EventType.PRESS) {
    console.log('🔔 ========================================');
    console.log('🔔 NOTIFICATION PRESSED (background/killed)');
    console.log('🔔 Notification ID:', detail.notification?.id);
    console.log('🔔 Notification Title:', detail.notification?.title);
    console.log('🔔 App will open...');
    console.log('🔔 Data refresh will happen in App.tsx');
    console.log('🔔 ========================================');
  } else {
    console.log('🔔 Other event type:', type);
  }
  console.log('🔔 ========================================');
});

console.log('✅ Background notification handler registered');
console.log('📱 Registering React Native component...');

AppRegistry.registerComponent(appName, () => App);

console.log('✅ App registered successfully');
console.log('📱 ========================================');
