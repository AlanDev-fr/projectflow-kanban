import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "@/src/firebaseConfig";
import { Platform, Linking, Alert } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as WebBrowser from "expo-web-browser";
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInProgress: boolean; // ← Agregar esto
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const processingCode = useRef(false);
  const [authInProgress, setAuthInProgress] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      const webClientId = Constants.expoConfig?.extra?.googleWebClientId ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      if (!webClientId) {
        console.warn('No se encontró GOOGLE_WEB_CLIENT_ID en .env');
      } else {
        GoogleSignin.configure({
          webClientId,
          offlineAccess: true,
        });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser && authInProgress) {
        setAuthInProgress(false);
      }
    });

    // 🔹 Manejar deep links para GitHub OAuth
    const handleDeepLink = async (event: { url: string }) => {
      console.log("Deep link recibido:", event.url);

      if (event.url.includes("code=")) {
        if (processingCode.current) {
          console.log("Ya se está procesando un código, ignorando duplicado");
          return;
        }

        const url = new URL(event.url);
        const code = url.searchParams.get("code");

        if (code) {
          console.log("Código de GitHub recibido via deep link");
          processingCode.current = true;

          try {
            await exchangeCodeForToken(code);
          } catch (error: any) {
            console.error("Error al procesar deep link:", error);
            Alert.alert(
              "Error de autenticación",
              error.message || "No se pudo completar el inicio de sesión con GitHub."
            );
          } finally {
            setTimeout(() => {
              processingCode.current = false;
            }, 2000);
          }
        }
      }
    };

    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setAuthInProgress(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setAuthInProgress(false);
    }
  };

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    if (Platform.OS === "web") {
      throw new Error("Google Sign-In no está disponible en web por ahora");
    }

    setAuthInProgress(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error("No se pudo obtener el token de Google");
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);
    } catch (error: any) {
      setAuthInProgress(false);
      console.error("Error en Google Sign-In:", error);
      throw error;
    }
  };

  const loginWithGitHub = async () => {
    setAuthInProgress(true);
    try {
      console.log("Iniciando GitHub login...");

      const clientId = Constants.expoConfig?.extra?.githubClientId ||
        process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
      const redirectUri = Constants.expoConfig?.extra?.githubRedirectUri ||
        process.env.EXPO_PUBLIC_GITHUB_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        throw new Error("Falta configuración de GitHub OAuth en .env");
      }

      const state = Math.random().toString(36).substring(7);

      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;

      console.log("Abriendo navegador para GitHub...");

      processingCode.current = false;

      const result = await WebBrowser.openAuthSessionAsync(
        githubAuthUrl,
        redirectUri
      );

      console.log("Resultado del navegador:", result);

      if (result.type === "cancel" || result.type === "dismiss") {
        console.log("Usuario canceló la autenticación");
        throw { code: "SIGN_IN_CANCELLED" };
      }

      console.log("Esperando procesamiento via deep link...");

    } catch (error: any) {
      setAuthInProgress(false);
      console.error("Error en GitHub Sign-In:", error);
      throw error;
    }
  };

  /**
   * SOLUCIÓN SEGURA: Intercambio de token via Cloud Function
   * 
   * FLUJO:
   * 1. Cliente obtiene 'code' de GitHub
   * 2. Cliente envía 'code' a Cloud Function
   * 3. Cloud Function intercambia 'code' por 'access_token' usando el secret
   * 4. Cloud Function retorna 'access_token' al cliente
   * 5. Cliente usa 'access_token' para autenticar en Firebase
   * 
   * VENTAJAS:
   * - El client_secret NUNCA sale del servidor
   * - No se puede extraer descompilando la app
   * - Arquitectura profesional y segura
   */
  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log("Enviando código a Cloud Function...");

      const cloudFunctionUrl = Constants.expoConfig?.extra?.githubCloudFunctionUrl ||
        process.env.EXPO_PUBLIC_GITHUB_CLOUD_FUNCTION_URL ||
        'https://us-central1-gestor-proyectos-b1ef3.cloudfunctions.net/githubOAuthCallback';

      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener token de GitHub');
      }

      const data = await response.json();
      console.log("Respuesta de Cloud Function recibida");

      if (data.access_token) {
        console.log("Token obtenido, autenticando en Firebase...");

        // Usar el token para crear credencial de GitHub
        const githubCredential = GithubAuthProvider.credential(data.access_token);
        await signInWithCredential(auth, githubCredential);

        console.log("¡Login exitoso con GitHub!");
      } else {
        throw new Error('No se recibió access_token del servidor');
      }
    } catch (error: any) {
      console.error("Error al intercambiar código:", error);
      throw new Error(error.message || 'Error en autenticación con GitHub');
    }
  };

  const logout = async () => {
    setAuthInProgress(false);
    try {
      if (Platform.OS !== "web") {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.error("Error al cerrar sesión de Google:", error);
    }

    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authInProgress,
      login,
      register,
      logout,
      loginWithGoogle,
      loginWithGitHub,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
