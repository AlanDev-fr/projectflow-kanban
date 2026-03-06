// app/App.tsx
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';
import RootNavigator from "@/navigation/RootNavigator";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { ThemeProvider } from "@/src/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemedStatusBar } from "@/components/ThemedStatusBar";
import { TutorialProvider } from "@/src/contexts/Tutorialcontext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Guardar última notificación recibida mientras app se inicia
  const notificationQueue = useRef<any[]>([]);

  useEffect(() => {
    // Listener cuando llega notificación (app abierta)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notificación recibida (app abierta):', notification.request.content.title);
    });

    // Listener cuando usuario toca la notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { taskId, projectId, projectTitle } = response.notification.request.content.data || {};

      console.log('👆 Usuario tocó notificación:', { taskId, projectId });

      // Validar datos
      if (!projectId) {
        console.warn('Notificación sin projectId');
        return;
      }

      // Si navegación no está lista, encolar
      if (!isNavigationReady || !navigationRef.current?.isReady()) {
        console.log('⏳ Navegación no lista, encolando notificación');
        notificationQueue.current.push({ projectId, projectTitle });
        return;
      }

      // Navegar inmediatamente
      try {
        navigationRef.current?.navigate('Project', {
          projectId,
          projectTitle: projectTitle || 'Proyecto'
        });
      } catch (error) {
        console.error('Error al navegar:', error);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [isNavigationReady]);

  // Procesar notificaciones encoladas cuando navegación esté lista
  useEffect(() => {
    if (isNavigationReady && notificationQueue.current.length > 0) {
      console.log(`Procesando ${notificationQueue.current.length} notificación(es) encolada(s)`);

      const notification = notificationQueue.current[0]; // Tomar la primera
      notificationQueue.current = []; // Limpiar cola

      try {
        navigationRef.current?.navigate('Project', {
          projectId: notification.projectId,
          projectTitle: notification.projectTitle || 'Proyecto'
        });
      } catch (error) {
        console.error('Error al procesar notificación encolada:', error);
      }
    }
  }, [isNavigationReady]);

  // Verificar si hay notificación que abrió la app (cuando app estaba cerrada)
  useEffect(() => {
    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response && isNavigationReady) {
        const { projectId, projectTitle } = response.notification.request.content.data || {};

        if (projectId) {
          console.log('App abierta desde notificación:', projectId);

          // Pequeño delay para asegurar que la navegación está completamente lista
          setTimeout(() => {
            navigationRef.current?.navigate('Project', {
              projectId,
              projectTitle: projectTitle || 'Proyecto'
            });
          }, 500);
        }
      }
    };

    if (isNavigationReady) {
      checkInitialNotification();
    }
  }, [isNavigationReady]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <TutorialProvider>
                <AuthProvider>
                  <NavigationContainer
                    ref={navigationRef}
                    onReady={() => {
                      setIsNavigationReady(true);
                      console.log('Navegación lista');
                    }}
                  >
                    <RootNavigator />
                    <ThemedStatusBar />
                  </NavigationContainer>
                </AuthProvider>
              </TutorialProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});