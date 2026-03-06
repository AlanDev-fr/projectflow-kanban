import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { useTheme } from "@/src/contexts/ThemeContext";

import { useAuth } from "@/src/contexts/AuthContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootNavigator";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const { login, loginWithGoogle, loginWithGitHub, authInProgress } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Por favor, completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      let message = "Error al iniciar sesión";
      if (error.code === "auth/user-not-found") {
        message = "Usuario no encontrado";
      } else if (error.code === "auth/wrong-password") {
        message = "Contraseña incorrecta";
      } else if (error.code === "auth/invalid-email") {
        message = "Email inválido";
      } else if (error.code === "auth/invalid-credential") {
        message = "Credenciales inválidas";
      }
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      let message = "Error al iniciar sesión con Google";

      if (error.code === "SIGN_IN_CANCELLED") {
        return;
      } else if (error.code === "IN_PROGRESS") {
        message = "Ya hay un inicio de sesión en progreso";
      } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        message = "Google Play Services no está disponible";
      }

      Alert.alert("Error", message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    try {
      await loginWithGitHub();
    } catch (error: any) {
      let message = "Error al iniciar sesión con GitHub";

      if (error.code === "SIGN_IN_CANCELLED") {
        return;
      }

      Alert.alert("Error", message);
    } finally {
      setGithubLoading(false);
    }
  };

  const isDisabled = loading || googleLoading || githubLoading;

  return (
    <>
      <ScreenKeyboardAwareScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + Spacing["4xl"] },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="h1" style={styles.title}>
            ProjectFlow
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Organiza tus tareas con Kanban
          </ThemedText>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.backgroundDefault,
                borderColor: colors.border
              },
            ]}
          >
            <Feather
              name="mail"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Correo electrónico"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isDisabled}
            />
          </View>

          {/* Password Input */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.backgroundDefault,
                borderColor: colors.border
              },
            ]}
          >
            <Feather
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              editable={!isDisabled}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
              disabled={isDisabled}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Login Button */}
          <Button
            onPress={handleLogin}
            disabled={isDisabled}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} size="small" />
            ) : (
              "Iniciar sesión"
            )}
          </Button>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <ThemedText type="small" style={[styles.dividerText, { color: colors.textSecondary }]}>
              O continuar con
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign-In Button */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={isDisabled}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: colors.backgroundDefault,
                borderColor: colors.border,
                opacity: pressed && !isDisabled ? 0.7 : 1,
              },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Image
                  source={require("@/assets/images/google-icon.svg")}
                  style={styles.socialIcon}
                  contentFit="contain"
                />
                <ThemedText type="body" style={{ color: colors.text }}>
                  Continuar con Google
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* GitHub Sign-In Button */}
          <Pressable
            onPress={handleGitHubLogin}
            disabled={isDisabled}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: isDark ? "#24292e" : "#ffffff",
                borderColor: isDark ? "#444d56" : colors.border,
                opacity: pressed && !isDisabled ? 0.7 : 1,
              },
            ]}
          >
            {githubLoading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Feather
                  name="github"
                  size={20}
                  color={isDark ? "#ffffff" : "#24292e"}
                  style={{ marginRight: Spacing.md }}
                />
                <ThemedText type="body" style={{ color: colors.text }}>
                  Continuar con GitHub
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* Register Link */}
          <Pressable
            onPress={() => navigation.navigate("Register")}
            style={styles.linkContainer}
            disabled={isDisabled}
          >
            <ThemedText type="body" style={{ color: colors.textSecondary }}>
              ¿No tienes cuenta?{" "}
            </ThemedText>
            <ThemedText type="link" style={{ color: colors.link }}>
              Crear cuenta
            </ThemedText>
          </Pressable>
        </View>
      </ScreenKeyboardAwareScrollView>
      {/* Overlay de carga */}
      <LoadingOverlay visible={authInProgress} colors={colors} />
    </>
  );
}

function LoadingOverlay({ visible, colors }: { visible: boolean, colors: any }) {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={[styles.loadingCard, { backgroundColor: colors.backgroundDefault }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText type="h3" style={[styles.loadingText, { color: colors.text }]}>
          Iniciando sesión...
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Por favor espera un momento
        </ThemedText>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  button: {
    marginTop: Spacing.sm,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: Spacing.md,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});