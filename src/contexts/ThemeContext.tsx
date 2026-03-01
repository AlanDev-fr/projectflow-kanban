import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof Colors.light;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  themeKey: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isInitialized, setIsInitialized] = useState(false);
  const [themeKey, setThemeKey] = useState('theme-initial');

  useEffect(() => {
    loadThemePreference();
  }, []);

  
  useEffect(() => {
    const activeColorScheme = themePreference === 'system' 
      ? systemColorScheme 
      : themePreference;
    setThemeKey(`theme-${activeColorScheme}-${Date.now()}`);
  }, [themePreference, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('themePreference');
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemePreferenceState(saved as ThemePreference);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem('themePreference', preference);
      setThemePreferenceState(preference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const activeColorScheme = themePreference === 'system' 
    ? systemColorScheme 
    : themePreference;
    
  const isDark = activeColorScheme === 'dark';
  const theme = Colors[activeColorScheme ?? 'light'];

  if (!isInitialized) {
  const defaultTheme = Colors.light;
  return (
    <View style={[styles.loadingContainer, { backgroundColor: defaultTheme.backgroundRoot }]}>
      <ActivityIndicator size="small" color={defaultTheme.primary} />
    </View>
  );
}

  return (
    <ThemeContext.Provider value={{ theme, isDark, themePreference, setThemePreference, themeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});