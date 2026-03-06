import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";

export interface ThemedViewProps extends ViewProps {
  background?: "default" | "root" | "secondary" | "tertiary" | "card";
}

export function ThemedView({ 
  style, 
  background = "default",
  ...props 
}: ThemedViewProps) {
  const { theme } = useTheme();
  
  const backgroundColors = {
    default: theme.backgroundDefault,
    root: theme.backgroundRoot,
    secondary: theme.backgroundSecondary,
    tertiary: theme.backgroundTertiary,
    card: theme.cardBackground,
  };
  
  return (
    <View 
      style={[
        { backgroundColor: backgroundColors[background] },
        style
      ]} 
      {...props} 
    />
  );
}