// src/utils/dateUtils.ts
// Date manipulation and formatting utilities

/**
 * Format date to YYYY-MM-DD format for Aladhan API
 */
export const formatDateForAPI = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Get current date in Jersey timezone
 */
export const getCurrentDate = (): Date => {
  return new Date();
};

/**
 * Apply minute offset to a time string (HH:MM format)
 */
export const applyTimeOffset = (timeStr: string, offsetMinutes: number): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + offsetMinutes, 0, 0);
  
  const newHours = date.getHours().toString().padStart(2, '0');
  const newMinutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${newHours}:${newMinutes}`;
};

/**
 * Parse time string (HH:MM) to Date object for today
 */
export const parseTimeToDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Check if a time has passed today
 */
export const hasTimePassed = (timeStr: string): boolean => {
  const prayerTime = parseTimeToDate(timeStr);
  const now = new Date();
  return now > prayerTime;
};

/**
 * Get time difference in milliseconds
 */
export const getTimeDifference = (timeStr: string): number => {
  const prayerTime = parseTimeToDate(timeStr);
  const now = new Date();
  return prayerTime.getTime() - now.getTime();
};

/**
 * Format milliseconds to readable countdown (HH:MM:SS)
 */
export const formatCountdown = (ms: number): string => {
  if (ms < 0) return '00:00:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get day of week name
 */
export const getDayName = (date: Date): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

/**
 * Check if today is Friday
 */
export const isFriday = (): boolean => {
  return new Date().getDay() === 5;
};

/**
 * Format timestamp to readable format
 */
export const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
};
