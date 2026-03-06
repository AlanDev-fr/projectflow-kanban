import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";

import { Task } from "@/src/services/firestore";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  onDragStart: () => void;
  onDragEnd: (gestureState: { moveX: number; moveY: number }) => void;
  onDelete: () => void;
  onEdit?: () => void;
  onDragMove?: (moveX: number, moveY: number) => void;
}

const STATUS_COLORS: Record<Task["status"], { bg: string; text: string }> = {
  TODO: { bg: "#E3F2FD", text: "#1976D2" },
  DOING: { bg: "#FFF3E0", text: "#F57C00" },
  REVIEW: { bg: "#F3E5F5", text: "#7B1FA2" },
  DONE: { bg: "#E8F5E9", text: "#388E3C" },
};

const STATUS_LABELS: Record<Task["status"], string> = {
  TODO: "Por hacer",
  DOING: "En progreso",
  REVIEW: "Revisión",
  DONE: "Completado",
};

const PRIORITY_COLORS = {
  Alta: { bg: "#FFEBEE", text: "#C62828", icon: "alert-circle" },
  Media: { bg: "#FFF8E1", text: "#F57F17", icon: "alert-triangle" },
  Baja: { bg: "#E8F5E9", text: "#2E7D32", icon: "minus-circle" },
};

export function TaskCard({
  task,
  compact = false,
  onDragStart,
  onDragEnd,
  onDelete,
  onEdit,
  onDragMove,
}: TaskCardProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;

        setIsDragging(true);
        setDragPosition({ x: pageX, y: pageY });

        onDragStart();

        if (onDragMove) {
          onDragMove(pageX, pageY);
        }

        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0.95,
            friction: 8,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });

        if (onDragMove) {
          onDragMove(gestureState.moveX, gestureState.moveY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);

        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 8,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 8,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();

        onDragEnd({
          moveX: gestureState.moveX,
          moveY: gestureState.moveY,
        });
      },
    })
  ).current;

  const handleDelete = () => {
    Alert.alert("Eliminar tarea", `¿Eliminar "${task.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: onDelete },
    ]);
  };

  const statusColor = STATUS_COLORS[task.status];
  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : null;

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  const createdDate = formatDate(task.createdAt);
  const dueDate = formatDate(task.dueDate);

  const isOverdue = task.dueDate && task.status !== "DONE" &&
    new Date(task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate) < new Date();

  const getDaysUntilDue = () => {
    if (!task.dueDate || task.status === "DONE") return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    const due = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilDue();

  const getUrgencyStyle = () => {
    if (!daysUntil || task.status === "DONE") return null;

    if (daysUntil < 0) return {
      color: "#C62828",
      bg: "#FFEBEE",
      icon: "alert-circle",
      text: `Vencida (${Math.abs(daysUntil)}d)`
    };
    if (daysUntil === 0) return {
      color: "#F57F17",
      bg: "#FFF8E1",
      icon: "clock",
      text: "Vence hoy"
    };
    if (daysUntil === 1) return {
      color: "#F57F17",
      bg: "#FFF3E0",
      icon: "clock",
      text: "Vence mañana"
    };
    if (daysUntil <= 3) return {
      color: "#F9A825",
      bg: "#FFFDE7",
      icon: "alert-triangle",
      text: `${daysUntil} días`
    };

    return null;
  };

  const urgencyStyle = getUrgencyStyle();

  const hasActiveReminder = task.reminderEnabled && task.reminderDate;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        compact ? styles.containerCompact : styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderLeftWidth: 3,
          borderLeftColor: statusColor.text,
          zIndex: isDragging ? 9999 : 1,
          elevation: isDragging ? 20 : 2,
        },
        Shadows.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
          opacity: opacity,
        }
      ]}
    >
      {/* Header con status y prioridad */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <ThemedText
              type="small"
              style={[styles.badgeText, { color: statusColor.text }]}
            >
              {STATUS_LABELS[task.status]}
            </ThemedText>
          </View>

          {priorityColor && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
              <Feather
                name={priorityColor.icon as any}
                size={10}
                color={priorityColor.text}
              />
              <ThemedText
                type="small"
                style={[styles.priorityText, { color: priorityColor.text }]}
              >
                {task.priority}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {onEdit && (
            <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
              <Feather name="edit-2" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable onPress={handleDelete} hitSlop={8} style={styles.actionBtn}>
            <Feather name="trash-2" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Título */}
      <ThemedText type="body" style={styles.title} numberOfLines={2}>
        {task.title}
      </ThemedText>

      {/* Descripción */}
      {task.description ? (
        <ThemedText
          type="small"
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {task.description}
        </ThemedText>
      ) : null}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <View style={styles.labelsContainer}>
          {task.labels.slice(0, 3).map((label, index) => (
            <View
              key={index}
              style={[
                styles.label,
                {
                  backgroundColor: label.color + '20',
                  borderColor: label.color,
                }
              ]}
            >
              <ThemedText
                type="small"
                style={[styles.labelText, { color: label.color }]}
              >
                {label.name}
              </ThemedText>
            </View>
          ))}
          {task.labels.length > 3 && (
            <View style={[styles.label, { backgroundColor: colors.textSecondary + '20' }]}>
              <ThemedText
                type="small"
                style={[styles.labelText, { color: colors.textSecondary }]}
              >
                +{task.labels.length - 3}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Footer con información adicional */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          
          {urgencyStyle && (
            <View style={[
              styles.urgencyBadge,
              { backgroundColor: urgencyStyle.bg, borderColor: urgencyStyle.color }
            ]}>
              <Feather
                name={urgencyStyle.icon as any}
                size={12}
                color={urgencyStyle.color}
              />
              <ThemedText
                type="small"
                style={[styles.urgencyText, { color: urgencyStyle.color }]}
              >
                {urgencyStyle.text}
              </ThemedText>
            </View>
          )}

          {/* Mostrar fecha normal si no es urgente */}
          {dueDate && !urgencyStyle && (
            <View style={styles.footerItem}>
              <Feather name="calendar" size={12} color={colors.textSecondary} />
              <ThemedText
                type="small"
                style={[styles.footerText, { color: colors.textSecondary }]}
              >
                {dueDate}
              </ThemedText>
            </View>
          )}

          
          {hasActiveReminder && (
            <View style={[styles.footerItem, { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }]}>
              <Feather name="bell" size={12} color={colors.primary} />
            </View>
          )}

          {task.assignee && (
            <View style={styles.footerItem}>
              <View style={[styles.avatar, { backgroundColor: statusColor.bg }]}>
                <ThemedText
                  type="small"
                  style={[styles.avatarText, { color: statusColor.text }]}
                >
                  {task.assignee.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            </View>
          )}

          {task.collaborators && task.collaborators.length > 0 && (
            <View style={styles.footerItem}>
              <Feather name="users" size={12} color={colors.textSecondary} />
              <ThemedText
                type="small"
                style={[styles.footerText, { color: colors.textSecondary }]}
              >
                {task.collaborators.length}
              </ThemedText>
            </View>
          )}

          {(task.commentsCount ?? 0) > 0 && (
            <View style={styles.footerItem}>
              <Feather name="message-circle" size={12} color={colors.textSecondary} />
              <ThemedText
                type="small"
                style={[styles.footerText, { color: colors.textSecondary }]}
              >
                {task.commentsCount}
              </ThemedText>
            </View>
          )}
        </View>

        {createdDate && (
          <View style={styles.footerItem}>
            <Feather name="calendar" size={10} color={colors.textSecondary} />
            <ThemedText
              type="small"
              style={[styles.createdDate, { color: colors.textSecondary }]}
            >
              {createdDate}
            </ThemedText>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    gap: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  actionBtn: {
    padding: 4,
    borderRadius: BorderRadius.xs,
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  description: {
    marginBottom: 6,
    lineHeight: 16,
    fontSize: 12,
  },
  labelsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  label: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 10,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.1)",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overdueItem: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "500",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "700",
  },
  createdDate: {
    fontSize: 9,
    opacity: 0.7,
  },
  containerCompact: {
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginBottom: 6,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});