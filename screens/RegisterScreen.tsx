import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { useTheme } from "@/src/contexts/ThemeContext";

import { useAuth } from "@/src/contexts/AuthContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export default function RegisterScreen() {
  const { theme, isDark } = useTheme();

  // 🔹 DESCOMENTAR cuando AuthContext tenga loginWithGoogle y loginWithGitHub
  // const { register, loginWithGoogle, loginWithGitHub } = useAuth();
  const { register } = useAuth(); // 🔴 Por ahora solo register básico

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 6;
  const isDisabled = loading || googleLoading || githubLoading;

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Por favor, completa todos los campos");
      return;
    }

    if (!passwordValid) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!passwordsMatch) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
    } catch (error: any) {
      let message = "Error al crear la cuenta";
      if (error.code === "auth/email-already-in-use") {
        message = "Este correo ya está registrado";
      } else if (error.code === "auth/invalid-email") {
        message = "Correo electrónico inválido";
      } else if (error.code === "auth/weak-password") {
        message = "La contraseña es muy débil";
      }
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 DESCOMENTAR cuando AuthContext tenga loginWithGoogle
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // await loginWithGoogle(); // 🔴 DESCOMENTAR ESTA LÍNEA
      Alert.alert("Info", "Google Sign-In aún no configurado"); // 🔴 ELIMINAR ESTA LÍNEA
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

  // 🔹 DESCOMENTAR cuando AuthContext tenga loginWithGitHub
  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    try {
      // await loginWithGitHub(); // 🔴 DESCOMENTAR ESTA LÍNEA
      Alert.alert("Info", "GitHub Sign-In aún no configurado"); // 🔴 ELIMINAR ESTA LÍNEA
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

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={styles.contentContainer}>
      <ThemedText type="h2" style={styles.title}>
        Crear cuenta
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.subtitle, { color: colors.textSecondary }]}
      >
        Regístrate para empezar a organizar tus proyectos
      </ThemedText>

      <View style={styles.form}>
        {/* Email Input */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.backgroundDefault, borderColor: colors.border },
          ]}
        >
          <Feather
            name="mail"
            size={20}
            color={colors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
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
        <View>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.backgroundDefault, borderColor: colors.border },
            ]}
          >
            <Feather
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Contraseña (mínimo 6 caracteres)"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
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
          {password.length > 0 && !passwordValid ? (
            <ThemedText
              type="small"
              style={[styles.errorText, { color: colors.danger }]}
            >
              Mínimo 6 caracteres
            </ThemedText>
          ) : null}
        </View>

        {/* Confirm Password Input */}
        <View>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.backgroundDefault,
                borderColor:
                  confirmPassword.length > 0 && !passwordsMatch
                    ? colors.danger
                    : colors.border,
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
              style={[styles.input, { color: theme.text }]}
              placeholder="Confirmar contraseña"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              editable={!isDisabled}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={8}
              disabled={isDisabled}
            >
              <Feather
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          {confirmPassword.length > 0 && !passwordsMatch ? (
            <ThemedText
              type="small"
              style={[styles.errorText, { color: colors.danger }]}
            >
              Las contraseñas no coinciden
            </ThemedText>
          ) : null}
        </View>

        {/* Register Button */}
        <Button onPress={handleRegister} disabled={isDisabled} style={styles.button}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            "Registrarse"
          )}
        </Button>


      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing["3xl"],
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
  errorText: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  button: {
    marginTop: Spacing.md,
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
});