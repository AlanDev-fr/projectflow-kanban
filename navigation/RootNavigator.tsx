import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { getCommonScreenOptions } from "./screenOptions";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import ProjectScreen from "@/screens/ProjectScreen";
import { Colors } from "@/constants/theme";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Project: { projectId: string; projectTitle: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { theme, isDark, themeKey } = useTheme();
  const { user, loading } = useAuth();
  const colors = isDark ? Colors.dark : Colors.light;

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator
        key={themeKey}
        screenOptions={getCommonScreenOptions({ theme, isDark, transparent: false })}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
              }}
            />
            <Stack.Screen
              name="Project"
              component={ProjectScreen}
              options={({ route }) => ({
                title: route.params?.projectTitle || "Proyecto",
                headerBackTitle: "Volver",
                animation: 'slide_from_right',
                animationDuration: 250,
              })}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                title: "Crear cuenta",
                headerBackTitle: "Volver",
                animation: 'slide_from_right',
                animationDuration: 250,
              }}
            />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});