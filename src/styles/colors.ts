export const Colors = {
  light: {
    primary: '#0A2F35',
    secondary: '#00A86B',      // Changed to darker green
    accent: '#00A86B',         // Changed to darker green
    
    background: '#F5F5F5',
    surface: '#FFFFFF',
    header: '#0A2F35',
    
    text: '#212121',
    textSecondary: '#757575',
    textOnPrimary: '#FFFFFF',
    
    border: '#E0E0E0',
    divider: '#EEEEEE',
    
    success: '#00A86B',        // Darker green
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    cardBackground: '#FFFFFF',
    cardBorder: '#E0E0E0',
    nextPrayerBorder: '#00A86B',  // Darker green
    
    announcementNormal: '#E0E0E0',
    announcementImportant: '#FF9800',
    announcementUrgent: '#F44336',
  },
  
  dark: {
    primary: '#00A86B',        // Darker green
    secondary: '#0A2F35',
    accent: '#00A86B',         // Darker green
    
    background: '#121212',
    surface: '#1E1E1E',
    header: '#0A2F35',
    
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textOnPrimary: '#FFFFFF',
    
    border: '#2C2C2C',
    divider: '#2C2C2C',
    
    success: '#00A86B',        // Darker green
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
    
    cardBackground: '#1E1E1E',
    cardBorder: '#2C2C2C',
    nextPrayerBorder: '#00A86B',  // Darker green
    
    announcementNormal: '#2C2C2C',
    announcementImportant: '#FF9800',
    announcementUrgent: '#F44336',
  },
};

export type Theme = typeof Colors.light;

// v2.0 "Emerald" look: the same teal and emerald, refined. Chosen in the menu; Classic stays the default.
export const EmeraldColors: {light: Theme; dark: Theme} = {
  light: {
    primary: '#0A2F35',
    secondary: '#00A86B',
    accent: '#00A86B',

    background: '#F3F6F5',
    surface: '#FFFFFF',
    header: '#0A2F35',

    text: '#10262A',
    textSecondary: '#5E7276',
    textOnPrimary: '#FFFFFF',

    border: '#DCE6E3',
    divider: '#E6EEEB',

    success: '#00A86B',
    warning: '#E0892B',
    error: '#E5484D',
    info: '#2F80ED',

    cardBackground: '#FFFFFF',
    cardBorder: '#DCE6E3',
    nextPrayerBorder: '#00A86B',

    announcementNormal: '#DCE6E3',
    announcementImportant: '#E0892B',
    announcementUrgent: '#E5484D',
  },
  dark: {
    primary: '#2BC48A',
    secondary: '#0A2F35',
    accent: '#2BC48A',

    background: '#061A1C',
    surface: '#0E2A2D',
    header: '#0A2F35',

    text: '#EAF4F1',
    textSecondary: '#93AAA6',
    textOnPrimary: '#FFFFFF',

    border: '#1D3D40',
    divider: '#16343A',

    success: '#2BC48A',
    warning: '#F2A65A',
    error: '#FF6B6B',
    info: '#64B5F6',

    cardBackground: '#0E2A2D',
    cardBorder: '#1D3D40',
    nextPrayerBorder: '#2BC48A',

    announcementNormal: '#1D3D40',
    announcementImportant: '#F2A65A',
    announcementUrgent: '#FF6B6B',
  },
};

/** Extra Emerald colours for the countdown ring and the next-prayer row. */
export const EmeraldExtras = {
  light: {heroBackground: '#0A2F35', mint: '#7FE0B5', ringTrack: 'rgba(255,255,255,0.16)', nextRow: '#E3F5EC'},
  dark: {heroBackground: '#0A2F35', mint: '#7FE0B5', ringTrack: 'rgba(255,255,255,0.14)', nextRow: '#103B33'},
};