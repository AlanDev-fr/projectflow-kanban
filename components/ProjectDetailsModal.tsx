// components/ProjectDetailsModal.tsx

import { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Task, updateProject } from "@/src/services/firestore";

interface ProjectDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    description?: string;
    color?: string;
    icon?: string;
    createdAt: any;
  };
  tasks: Task[];
  onDelete: () => void | Promise<void>;
}

const AVAILABLE_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#6366F1"
];

const AVAILABLE_ICONS = [
  "folder", "briefcase", "star", "heart", "zap",
  "target", "compass", "gift", "book", "code"
];

export function ProjectDetailsModal({
  visible,
  onClose,
  project,
  tasks,
  onDelete,
}: ProjectDetailsModalProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const [editedDescription, setEditedDescription] = useState(project.description || "");
  const [editedColor, setEditedColor] = useState(project.color || "#3B82F6");
  const [editedIcon, setEditedIcon] = useState(project.icon || "folder");

  // Calcular estadísticas
  const todoTasks = tasks.filter((t) => t.status === "TODO").length;
  const doingTasks = tasks.filter((t) => t.status === "DOING").length;
  const reviewTasks = tasks.filter((t) => t.status === "REVIEW").length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Tareas con prioridad
  const highPriority = tasks.filter((t) => t.priority === "Alta").length;
  const mediumPriority = tasks.filter((t) => t.priority === "Media").length;
  const lowPriority = tasks.filter((t) => t.priority === "Baja").length;

  // Actividad reciente (últimas 5 tareas)
  const recentTasks = [...tasks]
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      Alert.alert("Error", "El título no puede estar vacío");
      return;
    }

    try {
      await updateProject(project.id, {
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        color: editedColor,
        icon: editedIcon,
      });
      setIsEditing(false);
      Alert.alert("Éxito", "Proyecto actualizado correctamente");
    } catch (error) {
      console.error("Error updating project:", error);
      Alert.alert("Error", "No se pudo actualizar el proyecto");
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(project.title);
    setEditedDescription(project.description || "");
    setEditedColor(project.color || "#3B82F6");
    setEditedIcon(project.icon || "folder");
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar proyecto",
      `¿Estás seguro de que quieres eliminar "${project.title}"? Se eliminarán ${totalTasks} tarea(s). Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Hace poco";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "TODO": return colors.warning;
      case "DOING": return colors.info;
      case "REVIEW": return colors.secondary;
      case "DONE": return colors.success;
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "TODO": return "circle";
      case "DOING": return "play-circle";
      case "REVIEW": return "eye";
      case "DONE": return "check-circle";
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalContainer,
                  {
                    backgroundColor: colors.cardBackground,
                    paddingBottom: insets.bottom + Spacing.md,
                  }
                ]}
              >
                {/* Header */}
                <View style={[styles.header, { paddingTop: Spacing.md }]}>
                  <View style={styles.headerContent}>
                    {isEditing ? (
                      <Pressable
                        onPress={() => {/* Selector de color/icono */ }}
                        style={[
                          styles.projectIconLarge,
                          { backgroundColor: editedColor + "20" },
                        ]}
                      >
                        <Feather
                          name={(editedIcon as any) || "folder"}
                          size={32}
                          color={editedColor}
                        />
                      </Pressable>
                    ) : (
                      <View
                        style={[
                          styles.projectIconLarge,
                          { backgroundColor: (project.color || colors.primary) + "20" },
                        ]}
                      >
                        <Feather
                          name={(project.icon as any) || "folder"}
                          size={32}
                          color={project.color || colors.primary}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      {isEditing ? (
                        <>
                          <TextInput
                            value={editedTitle}
                            onChangeText={setEditedTitle}
                            style={[
                              styles.editInput,
                              {
                                color: colors.text,
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                              },
                            ]}
                            placeholder="Título del proyecto"
                            placeholderTextColor={colors.textSecondary}
                            returnKeyType="next"
                            blurOnSubmit={false}
                            onSubmitEditing={() => Keyboard.dismiss()}
                          />
                          <TextInput
                            value={editedDescription}
                            onChangeText={setEditedDescription}
                            style={[
                              styles.editInput,
                              styles.editInputMultiline,
                              {
                                color: colors.text,
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                              },
                            ]}
                            placeholder="Descripción (opcional)"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            returnKeyType="done"
                            blurOnSubmit={true}
                          />
                        </>
                      ) : (
                        <>
                          <ThemedText type="h3" numberOfLines={2}>
                            {project.title}
                          </ThemedText>
                          {project.description && (
                            <ThemedText
                              type="body"
                              style={{ color: colors.textSecondary, marginTop: 4 }}
                              numberOfLines={2}
                            >
                              {project.description}
                            </ThemedText>
                          )}
                          <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
                            Creado {formatDate(project.createdAt)}
                          </ThemedText>
                        </>
                      )}
                    </View>
                  </View>

                  <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
                    <Feather name="x" size={24} color={colors.text} />
                  </Pressable>
                </View>

                {/* Color Picker - Solo en modo edición */}
                {isEditing && (
                  <View style={styles.editSection}>
                    <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 8 }}>
                      Color del proyecto
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.colorPicker}>
                        {AVAILABLE_COLORS.map((color) => (
                          <Pressable
                            key={color}
                            onPress={() => setEditedColor(color)}
                            style={[
                              styles.colorOption,
                              { backgroundColor: color },
                              editedColor === color && styles.colorOptionSelected,
                            ]}
                          >
                            {editedColor === color && (
                              <Feather name="check" size={16} color="#fff" />
                            )}
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>

                    <ThemedText type="small" style={{ fontWeight: "600", marginTop: 16, marginBottom: 8 }}>
                      Icono del proyecto
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.iconPicker}>
                        {AVAILABLE_ICONS.map((icon) => (
                          <Pressable
                            key={icon}
                            onPress={() => setEditedIcon(icon)}
                            style={[
                              styles.iconOption,
                              { backgroundColor: colors.backgroundSecondary },
                              editedIcon === icon && {
                                backgroundColor: editedColor + "20",
                                borderColor: editedColor,
                                borderWidth: 2,
                              },
                            ]}
                          >
                            <Feather
                              name={icon as any}
                              size={20}
                              color={editedIcon === icon ? editedColor : colors.text}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.content}
                  contentContainerStyle={{ paddingBottom: Spacing.md }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                >
                  {/* Estadísticas generales */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="bar-chart-2" size={18} color={colors.primary} />
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        Estadísticas
                      </ThemedText>
                    </View>

                    <View style={styles.statsGrid}>
                      <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                        <Feather name="list" size={20} color={colors.primary} />
                        <ThemedText type="h3" style={{ marginTop: 8 }}>
                          {totalTasks}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          Total tareas
                        </ThemedText>
                      </View>

                      <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                        <Feather name="check-circle" size={20} color={colors.success} />
                        <ThemedText type="body" style={{ fontWeight: "700", color: colors.success }}>
                          {`${completionRate}%`}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          Completado
                        </ThemedText>
                      </View>
                    </View>

                    {/* Barra de progreso */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          Progreso del proyecto
                        </ThemedText>
                        <ThemedText type="body" style={{ fontWeight: "700", color: colors.success }}>
                          {`${doneTasks}/${totalTasks}`}
                        </ThemedText>
                      </View>
                      <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: colors.success,
                              width: `${completionRate}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Distribución por estado */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="pie-chart" size={18} color={colors.primary} />
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        Distribución por estado
                      </ThemedText>
                    </View>

                    <View style={styles.statusList}>
                      {[
                        { status: "TODO", count: todoTasks, label: "Por Hacer", color: colors.warning },
                        { status: "DOING", count: doingTasks, label: "En Progreso", color: colors.info },
                        { status: "REVIEW", count: reviewTasks, label: "Revisión", color: colors.secondary },
                        { status: "DONE", count: doneTasks, label: "Completado", color: colors.success },
                      ].map((item) => {
                        const percentage = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                        return (
                          <View
                            key={item.status}
                            style={[styles.statusItem, { backgroundColor: colors.backgroundSecondary }]}
                          >
                            <View style={styles.statusItemLeft}>
                              <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                              <ThemedText type="body">{item.label}</ThemedText>
                            </View>
                            <View style={styles.statusItemRight}>
                              <ThemedText type="body" style={{ fontWeight: "700" }}>
                                {item.count}
                              </ThemedText>
                              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                                {`(${percentage}%)`}
                              </ThemedText>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Prioridades */}
                  {(highPriority > 0 || mediumPriority > 0 || lowPriority > 0) && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Feather name="alert-circle" size={18} color={colors.primary} />
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          Por prioridad
                        </ThemedText>
                      </View>

                      <View style={styles.priorityGrid}>
                        {highPriority > 0 && (
                          <View style={[styles.priorityCard, { backgroundColor: "#EF444420" }]}>
                            <Feather name="arrow-up" size={16} color="#EF4444" />
                            <ThemedText type="h4" style={{ color: "#EF4444", marginTop: 4 }}>
                              {highPriority}
                            </ThemedText>
                            <ThemedText type="small" style={{ color: "#EF4444" }}>
                              Alta
                            </ThemedText>
                          </View>
                        )}
                        {mediumPriority > 0 && (
                          <View style={[styles.priorityCard, { backgroundColor: "#F59E0B20" }]}>
                            <Feather name="minus" size={16} color="#F59E0B" />
                            <ThemedText type="h4" style={{ color: "#F59E0B", marginTop: 4 }}>
                              {mediumPriority}
                            </ThemedText>
                            <ThemedText type="small" style={{ color: "#F59E0B" }}>
                              Media
                            </ThemedText>
                          </View>
                        )}
                        {lowPriority > 0 && (
                          <View style={[styles.priorityCard, { backgroundColor: "#10B98120" }]}>
                            <Feather name="arrow-down" size={16} color="#10B981" />
                            <ThemedText type="h4" style={{ color: "#10B981", marginTop: 4 }}>
                              {lowPriority}
                            </ThemedText>
                            <ThemedText type="small" style={{ color: "#10B981" }}>
                              Baja
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Actividad reciente */}
                  {recentTasks.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Feather name="clock" size={18} color={colors.primary} />
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          Actividad reciente
                        </ThemedText>
                      </View>

                      <View style={styles.activityList}>
                        {recentTasks.map((task) => (
                          <View
                            key={task.id}
                            style={[styles.activityItem, { backgroundColor: colors.backgroundSecondary }]}
                          >
                            <View
                              style={[
                                styles.activityIcon,
                                { backgroundColor: getStatusColor(task.status) + "20" },
                              ]}
                            >
                              <Feather
                                name={getStatusIcon(task.status) as any}
                                size={14}
                                color={getStatusColor(task.status)}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText type="body" numberOfLines={1}>
                                {task.title}
                              </ThemedText>
                              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                                {formatDate(task.createdAt)}
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Acciones - Fijas en la parte inferior */}
                <View
                  style={[
                    styles.actionsContainer,
                    {
                      backgroundColor: colors.cardBackground,
                      borderTopColor: colors.border,
                    }
                  ]}
                >
                  {isEditing ? (
                    <View style={styles.editActions}>
                      <Pressable
                        onPress={handleCancelEdit}
                        style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary, flex: 1 }]}
                      >
                        <Feather name="x" size={18} color={colors.text} />
                        <ThemedText type="body">Cancelar</ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={handleSaveEdit}
                        style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
                      >
                        <Feather name="check" size={18} color="#fff" />
                        <ThemedText type="body" style={{ color: "#fff" }}>
                          Guardar
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <Pressable
                        onPress={() => setIsEditing(true)}
                        style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                      >
                        <Feather name="edit-2" size={18} color={colors.primary} />
                        <ThemedText type="body">Editar proyecto</ThemedText>
                        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                      </Pressable>

                      <Pressable
                        onPress={handleDelete}
                        style={[styles.actionButton, { backgroundColor: colors.danger + "15" }]}
                      >
                        <Feather name="trash-2" size={18} color={colors.danger} />
                        <ThemedText type="body" style={{ color: colors.danger }}>
                          Eliminar proyecto
                        </ThemedText>
                        <Feather name="chevron-right" size={18} color={colors.danger} />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "92%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  projectIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  editSection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  editInputMultiline: {
    fontSize: 15,
    fontWeight: "400",
    minHeight: 60,
    textAlignVertical: "top",
  },
  colorPicker: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#fff",
  },
  iconPicker: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  progressSection: {
    marginTop: Spacing.sm,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusList: {
    gap: Spacing.sm,
  },
  statusItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  statusItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  priorityGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  priorityCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  activityList: {
    gap: Spacing.sm,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: "space-between",
  },
  editActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});