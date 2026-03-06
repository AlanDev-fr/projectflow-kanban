import { Platform } from "react-native";

const tintColorLight = "#4A90E2";
const tintColorDark = "#5A9FF0";

export const Colors = {
  light: {
    text: "#2C3E50",
    textSecondary: "#7F8C8D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#7F8C8D",
    tabIconSelected: tintColorLight,
    link: "#4A90E2",
    primary: "#4A90E2",
    info: "#b9e346ff",
    secondary: "#3e699aff",
    success: "#50C878",
    danger: "#E74C3C",
    warning: "#F39C12",
    border: "#E0E6ED",
    backgroundRoot: "#F5F7FA",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F8F9FA",
    backgroundTertiary: "#E8F4F8",
    columnBackground: "#F8F9FA",
    cardBackground: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    link: "#5A9FF0",
    primary: "#5A9FF0",
    success: "#5AD589",
    danger: "#E95B4E",
    warning: "#F5A623",
    secondary: "#3e699aff",
    info: "#b9e346ff",
    border: "#404244",
    backgroundRoot: "#1F2123",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    columnBackground: "#2A2C2E",
    cardBackground: "#353739",
    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
  columnWidth: 300,
  taskCardPadding: 12,
  columnPadding: 12,
};

export const BorderRadius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  tiny: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
