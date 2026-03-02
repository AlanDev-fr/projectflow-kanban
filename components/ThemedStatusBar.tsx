import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/src/contexts/ThemeContext";

export function ThemedStatusBar() {
  const { isDark } = useTheme();
  
  return <StatusBar style={isDark ? "light" : "dark"} />;
}