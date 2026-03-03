import React, { useRef, useState } from "react";
import { Alert, Platform, Linking } from "react-native";
import { requestNotificationPermissions } from "@/src/services/notifications";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  LayoutChangeEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { DateTimePickerInput } from "@/components/DateTimePickerInput";
import { ThemedText } from "@/components/ThemedText";
import { TaskCard } from "@/components/TaskCard";
import { useTheme } from "@/src/contexts/ThemeContext";

import { Task } from "@/src/services/firestore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface ColumnProps {
  title: string;
  status: Task["status"];
  tasks: Task[];
  onTaskDragStart: (taskId: string) => void;
  onTaskDragEnd: (
    taskId: string,
    gestureState: { moveX: number; moveY: number }
  ) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (taskId: string) => void;
  onAddTask: (taskData: {
    title: string;
    description: string;
    priority?: "Alta" | "Media" | "Baja";
    dueDate?: Date;
    startDate?: Date;
    reminderDate?: Date;
    reminderEnabled?: boolean;
    assignee?: string;
    labels?: Array<{ name: string; color: string }>;
  }) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  isDropTarget: boolean;
  availableAssignees?: string[];
}

const COLUMN_ICONS: Record<Task["status"], string> = {
  TODO: "circle",
  DOING: "play-circle",
  REVIEW: "eye",
  DONE: "check-circle",
};

const COLUMN_TITLES: Record<Task["status"], string> = {
  TODO: "Por Hacer",
  DOING: "En Progreso",
  REVIEW: "Revisión",
  DONE: "Completado",
};

const PRIORITY_OPTIONS: Array<"Alta" | "Media" | "Baja"> = [
  "Alta",
  "Media",
  "Baja",
];

const LABEL_COLORS = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1",
  "#3949AB", "#1E88E5", "#039BE5", "#00ACC1",
  "#00897B", "#43A047", "#7CB342", "#C0CA33",
  "#FDD835", "#FFB300", "#FB8C00", "#F4511E",
];

const getPriorityColor = (priority: "Alta" | "Media" | "Baja") => {
  switch (priority) {
    case "Alta":
      return "#EF4444"; // Rojo
    case "Media":
      return "#F59E0B"; // Amarillo/Naranja
    case "Baja":
      return "#10B981"; // Verde
  }
};

export function Column({
  title,
  status,
  tasks,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDelete,
  onTaskEdit,
  onAddTask,
  onLayout,
  isDropTarget,
  availableAssignees = [],
}: ColumnProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<"Alta" | "Media" | "Baja" | undefined>();
  const [selectedAssignee, setSelectedAssignee] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);

  const resetForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setSelectedPriority(undefined);
    setSelectedAssignee(undefined);
    setDueDate(undefined);
    setStartDate(undefined);
    setReminderDate(undefined);
    setReminderEnabled(false);
    setLabels([]);
    setNewLabelName("");
    setShowLabelInput(false);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    // Validar permisos SOLO si el recordatorio está habilitado
    if (reminderEnabled && reminderDate) {
      const hasPermission = await requestNotificationPermissions();

      if (!hasPermission) {
        Alert.alert(
          'Permisos necesarios',
          'Para recibir recordatorios, necesitamos permiso para enviar notificaciones.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Configuración',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }

      // Validar que la fecha no sea en el pasado
      if (reminderDate <= new Date()) {
        Alert.alert(
          'Fecha inválida',
          'La fecha del recordatorio debe ser en el futuro.'
        );
        return;
      }
    }

    onAddTask({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      priority: selectedPriority,
      dueDate: dueDate,
      startDate: startDate,
      reminderDate: reminderEnabled ? reminderDate : undefined,
      reminderEnabled: reminderEnabled,
      assignee: selectedAssignee,
      labels: labels.length > 0 ? labels : undefined,
    });

    resetForm();
    setModalVisible(false);
  };

  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    const randomColor = LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
    setLabels([...labels, { name: newLabelName.trim(), color: randomColor }]);
    setNewLabelName("");
    setShowLabelInput(false);
  };

  const handleRemoveLabel = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  const handleSetDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDueDate(date);
  };


  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDropTarget
            ? colors.backgroundTertiary
            : colors.columnBackground,
        },
      ]}
      onLayout={onLayout}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather
            name={COLUMN_ICONS[status] as any}
            size={18}
            color={colors.primary}
          />
          <ThemedText type="h4" style={styles.title}>
            {COLUMN_TITLES[status]}
          </ThemedText>
          <View
            style={[styles.count, { backgroundColor: colors.backgroundSecondary }]}
          >
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {tasks.length}
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          hitSlop={8}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={16} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={() => onTaskDragStart(task.id)}
            onDragEnd={(gestureState) => onTaskDragEnd(task.id, gestureState)}
            onDelete={() => onTaskDelete(task.id)}
            onEdit={() => onTaskEdit(task.id)}
            onDragMove={(moveX, moveY) => { }}
          />
        ))}

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText
              type="small"
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              Sin tareas
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Header del Modal */}
              <View style={styles.modalHeader}>
                <View>
                  <ThemedText type="h4" style={styles.modalTitle}>
                    Nueva tarea
                  </ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Feather name={COLUMN_ICONS[status] as any} size={12} color={colors.primary} />
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {COLUMN_TITLES[status]}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                  hitSlop={8}
                  style={styles.closeButton}
                >
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              </View>

              {/* Título */}
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: colors.text }]}>
                  Título *
                </ThemedText>
                <View style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputText, { color: colors.text }]}
                    placeholder="¿Qué hay que hacer?"
                    placeholderTextColor={colors.textSecondary}
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    autoFocus
                  />
                </View>
              </View>

              {/* Descripción */}
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: colors.text }]}>
                  Descripción
                </ThemedText>
                <View style={[styles.textArea, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputText, styles.textAreaInput, { color: colors.text }]}
                    placeholder="Añade más detalles..."
                    placeholderTextColor={colors.textSecondary}
                    value={newTaskDescription}
                    onChangeText={setNewTaskDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Prioridad */}
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: colors.text }]}>
                  Prioridad
                </ThemedText>
                <View style={styles.optionsRow}>
                  {PRIORITY_OPTIONS.map((priority) => {
                    const isSelected = selectedPriority === priority;
                    const priorityColor = getPriorityColor(priority);

                    return (
                      <Pressable
                        key={priority}
                        onPress={() => setSelectedPriority(isSelected ? undefined : priority)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.backgroundSecondary,
                            borderColor: isSelected ? priorityColor : colors.border,
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={[styles.chipText, { color: isSelected ? "#fff" : colors.text }]}
                        >
                          {priority}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Fecha límite */}
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: colors.text }]}>
                  Fecha límite
                </ThemedText>
                <View style={styles.optionsRow}>
                  <Pressable
                    onPress={() => handleSetDueDate(1)}
                    style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  >
                    <Feather name="calendar" size={14} color={colors.textSecondary} />
                    <ThemedText type="small" style={{ color: colors.text }}>Mañana</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSetDueDate(7)}
                    style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  >
                    <Feather name="calendar" size={14} color={colors.textSecondary} />
                    <ThemedText type="small" style={{ color: colors.text }}>7 días</ThemedText>
                  </Pressable>
                  {dueDate && (
                    <Pressable
                      onPress={() => setDueDate(undefined)}
                      style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    >
                      <Feather name="x" size={14} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>
                {dueDate && (
                  <View style={styles.datePreview}>
                    <Feather name="calendar" size={12} color={colors.primary} />
                    <ThemedText type="small" style={{ color: colors.primary }}>
                      {dueDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Asignado a - Solo si hay assignees disponibles */}
              {availableAssignees.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="small" style={[styles.sectionLabel, { color: colors.text }]}>
                    Asignado a
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionsRow}>
                      {availableAssignees.map((assignee) => {
                        const isSelected = selectedAssignee === assignee;
                        return (
                          <Pressable
                            key={assignee}
                            onPress={() => setSelectedAssignee(isSelected ? undefined : assignee)}
                            style={[
                              styles.assigneeChip,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.backgroundSecondary,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <View style={[styles.avatar, { backgroundColor: isSelected ? "#fff" : colors.primary }]}>
                              <ThemedText type="small" style={[styles.avatarText, { color: isSelected ? colors.primary : "#fff" }]}>
                                {assignee.charAt(0)}
                              </ThemedText>
                            </View>
                            <ThemedText type="small" style={{ color: isSelected ? "#fff" : colors.text }}>
                              {assignee}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Etiquetas */}
              <View style={styles.section}>
                <View style={styles.labelHeader}>
                  <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                    Etiquetas
                  </ThemedText>
                  {!showLabelInput && (
                    <Pressable onPress={() => setShowLabelInput(true)} style={styles.addButton}>
                      <Feather name="plus" size={14} color={colors.primary} />
                      <ThemedText type="small" style={{ color: colors.primary, fontWeight: "600" }}>
                        Añadir
                      </ThemedText>
                    </Pressable>
                  )}
                </View>

                {showLabelInput && (
                  <View style={styles.labelInputRow}>
                    <View style={[
                      styles.labelInput,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                        flex: 1
                      }
                    ]}>
                      <TextInput
                        style={[styles.inputText, { color: colors.text }]}
                        placeholder="Nombre de etiqueta"
                        placeholderTextColor={colors.textSecondary}
                        value={newLabelName}
                        onChangeText={setNewLabelName}
                        onSubmitEditing={handleAddLabel}
                        autoFocus={true}
                        returnKeyType="done"
                        blurOnSubmit={false}
                      />
                    </View>
                    <Pressable
                      onPress={handleAddLabel}
                      disabled={!newLabelName.trim()}
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor: newLabelName.trim() ? colors.primary : colors.backgroundSecondary
                        }
                      ]}
                    >
                      <Feather
                        name="check"
                        size={16}
                        color={newLabelName.trim() ? "#fff" : colors.textSecondary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowLabelInput(false);
                        setNewLabelName("");
                      }}
                      style={[styles.iconButton, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <Feather name="x" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                )}

                {labels.length > 0 && (
                  <View style={styles.labelsContainer}>
                    {labels.map((label, index) => (
                      <View
                        key={index}
                        style={[
                          styles.labelTag,
                          {
                            backgroundColor: label.color + "20",
                            borderColor: label.color
                          }
                        ]}
                      >
                        <ThemedText type="small" style={[styles.labelText, { color: label.color }]}>
                          {label.name}
                        </ThemedText>
                        <Pressable onPress={() => handleRemoveLabel(index)} hitSlop={4}>
                          <Feather name="x" size={12} color={label.color} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>


              <View style={styles.section}>
                <View style={styles.labelHeader}>
                  <ThemedText type="small" style={[styles.sectionLabel, { color: colors.text }]}>
                    Recordatorio
                  </ThemedText>
                  <Pressable
                    onPress={() => setReminderEnabled(!reminderEnabled)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      backgroundColor: reminderEnabled ? colors.primary : colors.backgroundSecondary,
                      borderColor: reminderEnabled ? colors.primary : colors.border,
                    }}
                  >
                    <Feather
                      name={reminderEnabled ? "bell" : "bell-off"}
                      size={14}
                      color={reminderEnabled ? "#fff" : colors.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={{
                        color: reminderEnabled ? "#fff" : colors.text,
                        fontWeight: "600"
                      }}
                    >
                      {reminderEnabled ? "Activado" : "Desactivado"}
                    </ThemedText>
                  </Pressable>
                </View>

                {reminderEnabled && (
                  <>
                    {/* Atajos rápidos */}
                    <View style={styles.optionsRow}>
                      <Pressable
                        onPress={() => {
                          const reminder = new Date();
                          reminder.setHours(reminder.getHours() + 1);
                          setReminderDate(reminder);
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderColor: colors.border
                          }
                        ]}
                      >
                        <Feather name="zap" size={14} color={colors.textSecondary} />
                        <ThemedText type="small" style={{ color: colors.text }}>
                          En 1 hora
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          const reminder = new Date();
                          reminder.setDate(reminder.getDate() + 1);
                          reminder.setHours(9, 0, 0, 0);
                          setReminderDate(reminder);
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderColor: colors.border
                          }
                        ]}
                      >
                        <Feather name="sunrise" size={14} color={colors.textSecondary} />
                        <ThemedText type="small" style={{ color: colors.text }}>
                          Mañana 9 AM
                        </ThemedText>
                      </Pressable>
                    </View>

                    {/* Selector personalizado */}
                    <DateTimePickerInput
                      label="Seleccionar fecha y hora"
                      value={reminderDate}
                      onChange={setReminderDate}
                      minimumDate={new Date()}
                      icon="bell"
                    />

                    {/* Preview */}
                    {reminderDate && (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        backgroundColor: colors.primary + "15",
                        borderColor: colors.primary,
                        marginTop: 10
                      }}>
                        <Feather name="info" size={16} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <ThemedText type="small" style={{ color: colors.primary, fontWeight: "600" }}>
                            Recordatorio programado
                          </ThemedText>
                          <ThemedText type="small" style={{ color: colors.primary, fontSize: 11 }}>
                            {reminderDate.toLocaleString("es-ES", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            {/* Botones de acción - Fuera del scroll */}
            <View style={[styles.modalFooter, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
              <Pressable
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
                style={[styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
                style={[
                  styles.createButton,
                  {
                    backgroundColor: newTaskTitle.trim() ? colors.primary : colors.backgroundSecondary,
                    opacity: newTaskTitle.trim() ? 1 : 0.5,
                  },
                ]}
              >
                <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>Crear tarea</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: Spacing.columnWidth,
    minWidth: 280,
    borderRadius: BorderRadius.lg,
    padding: Spacing.columnPadding,
    marginRight: Spacing.md,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
  },
  count: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingBottom: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  modalTitle: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: 10,
    fontSize: 14,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  inputText: {
    fontSize: 15,
  },
  textArea: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textAreaInput: {
    minHeight: 66,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontWeight: "600",
  },
  assigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
  },
  datePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  labelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addLabelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  labelInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  labelInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  labelsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  labelTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});