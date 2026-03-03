// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const ANDROID_CHANNEL = 'task-reminders';
let channelConfigured = false;

// Configurar el handler ANTES que nada
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permisos SOLO cuando el usuario intenta programar un recordatorio
 * No bloqueamos el inicio de la app
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Simulador: Las notificaciones físicas no aparecerán');
    return true; // Permitir flujo en desarrollo
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Configurar canal de Android (crítico para Android 8+)
  if (Platform.OS === 'android' && !channelConfigured) {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Recordatorios de Tareas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    channelConfigured = true;
    console.log('Canal de Android configurado');
  }

  return true;
}

/**
 * Programa una notificación LOCAL
 * IMPORTANTE: Las notificaciones locales tienen limitaciones cuando la app está CERRADA/TERMINADA
 * - iOS: NO puede ejecutar código ni navegar cuando la app está terminada
 * - Android: Funciona mejor pero depende de optimizaciones de batería
 */
export async function scheduleTaskReminder(
  taskId: string,
  taskTitle: string,
  reminderDate: Date,
  projectId: string,
  projectTitle: string
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Permisos de notificaciones denegados');
    return null;
  }

  const now = new Date();
  if (reminderDate <= now) {
    console.warn('Fecha de recordatorio en el pasado');
    return null;
  }

  try {
    console.log(`Programando notificación para: ${reminderDate.toLocaleString('es-ES')}`);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recordatorio de tarea',
        body: taskTitle,
        data: {
          taskId,
          projectId,
          projectTitle,
          type: 'task-reminder',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && {
          channelId: ANDROID_CHANNEL,
          // Colores y badges para Android
          color: '#3B82F6',
          badge: 1,
        }),
        ...(Platform.OS === 'ios' && {
          // Configuración específica para iOS
          badge: 1,
          sound: 'default',
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    console.log(`Notificación programada (ID: ${notificationId})`);
    return notificationId;
  } catch (error) {
    console.error('Error al programar notificación:', error);
    return null;
  }
}

/**
 * Cancela una notificación específica
 */
export async function cancelTaskReminder(notificationId: string): Promise<void> {
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('Notificación cancelada:', notificationId);
  } catch (error) {
    console.error('Error al cancelar notificación:', error);
  }
}

/**
 * Cancela todas las notificaciones de una tarea
 */
export async function cancelAllTaskReminders(taskId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const taskNotifications = scheduled.filter(
      (n) => n.content.data?.taskId === taskId
    );

    await Promise.all(
      taskNotifications.map(n =>
        Notifications.cancelScheduledNotificationAsync(n.identifier)
      )
    );

    console.log(`Canceladas ${taskNotifications.length} notificaciones para tarea ${taskId}`);
  } catch (error) {
    console.error('Error al cancelar notificaciones:', error);
  }
}

/**
 * Ver todas las notificaciones programadas (útil para debug)
 */
export async function getAllScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Notificaciones programadas:', scheduled.length);
    scheduled.forEach((n) => {
      console.log(`   - ${n.content.title}:`);
      console.log(`     ID: ${n.identifier}`);
      console.log(`     Trigger:`, n.trigger);
    });
    return scheduled;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return [];
  }
}