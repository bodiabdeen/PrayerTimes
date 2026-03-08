export const Colors = {
  light: {
    primary: '#0D2B4E',
    secondary: '#CAA55E',
    accent: '#CAA55E',
    
    background: '#F7F5F0',
    surface: '#FFFFFF',
    header: '#0D2B4E',
    
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textOnPrimary: '#FFFFFF',
    
    border: '#E3DDD5',
    divider: '#E3DDD5',
    
    success: '#2E7D32',
    warning: '#E65100',
    error: '#C62828',
    info: '#1565C0',
    
    cardBackground: '#FFFFFF',
    cardBorder: '#E3DDD5',
    nextPrayerBorder: '#CAA55E',
    
    announcementNormal: '#E3DDD5',
    announcementImportant: '#E65100',
    announcementUrgent: '#C62828',
    
    // Gold gradient colors
    goldDark: '#AA7E39',
    goldMid: '#CAA55E',
    goldHighlight: '#F2DA98',
  },
  
  dark: {
    primary: '#CAA55E',
    secondary: '#0D2B4E',
    accent: '#CAA55E',
    
    background: '#000000',
    surface: '#1C1A17',
    header: '#0D2B4E',
    
    text: '#F5F0E8',
    textSecondary: '#A8A49E',
    textOnPrimary: '#FFFFFF',
    
    border: '#2A2520',
    divider: '#2A2520',
    
    success: '#2E7D32',
    warning: '#E65100',
    error: '#C62828',
    info: '#1565C0',
    
    cardBackground: '#1C1A17',
    cardBorder: '#2A2520',
    nextPrayerBorder: '#CAA55E',
    
    announcementNormal: '#2A2520',
    announcementImportant: '#E65100',
    announcementUrgent: '#C62828',
    
    // Gold gradient colors
    goldDark: '#AA7E39',
    goldMid: '#CAA55E',
    goldHighlight: '#F2DA98',
  },
};

export type Theme = typeof Colors.light;
