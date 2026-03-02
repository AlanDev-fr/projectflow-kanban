import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Typography } from "@/constants/theme";

export interface ThemedTextProps extends TextProps {
  type?: keyof typeof Typography;
  color?: "primary" | "secondary" | "text" | "textSecondary" | "danger" | "success" | "warning" | "info";
}

export function ThemedText({ 
  style, 
  type = "body",
  color,
  children,
  ...props 
}: ThemedTextProps) {
  const { theme } = useTheme();
  
  const textColor = color ? theme[color] : theme.text;
  
  if (children === null || children === undefined) return null;
  
  return (
    <Text 
      style={[
        { color: textColor },
        type && Typography[type],
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
}