import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from "react-native";
import { Alert, Linking } from "react-native";
import { requestNotificationPermissions } from "@/src/services/notifications";
import { Feather } from "@expo/vector-icons";
import { DateTimePickerInput } from "@/components/DateTimePickerInput";
import { DatePickerInput } from "@/components/DatePickerInput";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TutorialOverlay, { TutorialStep } from "@/components/Tutorialoverlay";
import { Task } from "@/src/services/firestore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export const TASK_MODAL_TUTORIAL_STEP_OFFSET = 8;
export const TASK_MODAL_TUTORIAL_STEP_COUNT = 6;

interface TaskFormModalProps {
  visible: boolean;
  task: Task | null;
  status?: Task["status"];
  onClose: () => void;
  onSave: (taskData: {
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
  showTutorial?: boolean;
  tutorialStep?: number;
  onTutorialNext?: () => void;
  onTutorialBack?: () => void;
  onTutorialSkip?: () => void;
}

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

const PAGE_LABELS = ["Básico", "Fechas", "Extra"];

const getPriorityColor = (priority: "Alta" | "Media" | "Baja") => {
  switch (priority) {
    case "Alta": return "#EF4444";
    case "Media": return "#F59E0B";
    case "Baja": return "#10B981";
  }
};

// Maps tutorial localStep (0-5) to stepper page (0-2)
const getTutorialPage = (ls: number): number => {
  if (ls <= 1) return 0;
  if (ls <= 3) return 1;
  return 2;
};

// Maps field index (0-5) to stepper page (0-2)
const getFieldPage = (fieldStep: number): number => Math.floor(fieldStep / 2);

export function TaskFormModal({
  visible,
  task,
  status,
  onClose,
  onSave,
  showTutorial = false,
  tutorialStep = 0,
  onTutorialNext,
  onTutorialBack,
  onTutorialSkip,
}: TaskFormModalProps) {
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

  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Alta" | "Media" | "Baja" | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  // 🎯 STEPPER: 3 páginas — 0:(título+desc) | 1:(prioridad+fecha) | 2:(recordatorio+etiquetas)
  const [currentFormStep, setCurrentFormStep] = useState(0);

  // Tutorial derived state
  const localStep = tutorialStep - TASK_MODAL_TUTORIAL_STEP_OFFSET;
  const isModalTutorialActive =
    showTutorial &&
    tutorialStep >= TASK_MODAL_TUTORIAL_STEP_OFFSET &&
    tutorialStep < TASK_MODAL_TUTORIAL_STEP_OFFSET + TASK_MODAL_TUTORIAL_STEP_COUNT;

  // When tutorial advances between localSteps that belong to different pages,
  // auto-advance the stepper so only the relevant page shows.
  useEffect(() => {
    if (isModalTutorialActive && visible) {
      const targetPage = getTutorialPage(localStep);
      setCurrentFormStep(targetPage);
    }
  }, [localStep, isModalTutorialActive, visible]);

  // Close keyboard when tutorial step changes
  useEffect(() => {
    if (isModalTutorialActive) {
      Keyboard.dismiss();
    }
  }, [localStep]);

  // ─── Refs for tutorial spotlight measurement ──────────────────────────────
  const titleFieldRef = useRef<View>(null);
  const descFieldRef = useRef<View>(null);
  const priorityFieldRef = useRef<View>(null);
  const dueDateFieldRef = useRef<View>(null);
  const reminderFieldRef = useRef<View>(null);
  const saveButtonRef = useRef<View>(null);

  const SPOTLIGHT_PADDING = 10;

  const [titleLayout, setTitleLayout] = useState({
    cx: SCREEN_WIDTH / 2, cy: SCREEN_HEIGHT * 0.25,
    w: SCREEN_WIDTH - 100, h: 60,
  });
  const [descLayout, setDescLayout] = useState({
    cx: SCREEN_WIDTH / 2, cy: SCREEN_HEIGHT * 0.35,
    w: SCREEN_WIDTH - 100, h: 110,
  });
  const [priorityLayout, setPriorityLayout] = useState({
    cx: SCREEN_WIDTH / 2, cy: SCREEN_HEIGHT * 0.35,
    w: SCREEN_WIDTH - 100, h: 60,
  });
  const [dueDateLayout, setDueDateLayout] = useState({
    cx: SCREEN_WIDTH / 2, cy: SCREEN_HEIGHT * 0.5,
    w: SCREEN_WIDTH - 100, h: 100,
  });
  const [reminderLayout, setReminderLayout] = useState({
    cx: SCREEN_WIDTH / 2, cy: SCREEN_HEIGHT * 0.35,
    w: SCREEN_WIDTH - 100, h: 80,
  });
  const [saveButtonLayout, setSaveButtonLayout] = useState({
    cx: SCREEN_WIDTH / 2, cy: SCREEN_HEIGHT * 0.85,
    w: (SCREEN_WIDTH - 120) / 2, h: 56,
  });

  const measureInterval = useRef<NodeJS.Timeout | null>(null);

  const measureElement = (
    ref: React.RefObject<View | null>,
    setter: (layout: { cx: number; cy: number; w: number; h: number }) => void
  ) => {
    ref.current?.measure((_x, _y, w, h, pageX, pageY) => {
      if (w > 0 && h > 0) {
        setter({
          cx: pageX + w / 2,
          cy: pageY + h / 2,
          w: w + SPOTLIGHT_PADDING * 2,
          h: h + SPOTLIGHT_PADDING * 2,
        });
      }
    });
  };

  const measureAllElements = () => {
    measureElement(titleFieldRef, setTitleLayout);
    measureElement(descFieldRef, setDescLayout);
    measureElement(priorityFieldRef, setPriorityLayout);
    measureElement(dueDateFieldRef, setDueDateLayout);
    measureElement(reminderFieldRef, setReminderLayout);
    measureSaveButton();
  };

  const measureSaveButton = () => {
    saveButtonRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        setSaveButtonLayout({
          cx: x + w / 2,
          cy: y + h / 2,
          w: w + SPOTLIGHT_PADDING * 2,
          h: h + SPOTLIGHT_PADDING * 2,
        });
      }
    });
  };

  // Poll measurements while tutorial is active
  useEffect(() => {
    if (isModalTutorialActive && visible) {
      const initial = setTimeout(measureAllElements, 300);
      measureInterval.current = setInterval(measureAllElements, 250);
      return () => {
        clearTimeout(initial);
        if (measureInterval.current) {
          clearInterval(measureInterval.current);
          measureInterval.current = null;
        }
      };
    }
  }, [isModalTutorialActive, localStep, currentFormStep, visible]);

  // Extra re-measure when arriving at save button step
  useEffect(() => {
    if (!isModalTutorialActive || !visible || localStep !== 5) return;
    const t1 = setTimeout(measureSaveButton, 80);
    const t2 = setTimeout(measureSaveButton, 250);
    const t3 = setTimeout(measureSaveButton, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [localStep, isModalTutorialActive, visible]);

  // ─── Tutorial spotlight steps ─────────────────────────────────────────────
  const taskModalTutorialSteps: TutorialStep[] = [
    {
      targetX: titleLayout.cx, targetY: titleLayout.cy,
      targetWidth: titleLayout.w, targetHeight: titleLayout.h,
      title: "Dale un título",
      description: "Escribe un nombre descriptivo para tu tarea.",
      shape: "rect", allowInteraction: true,
      canNext: title.trim().length >= 3,
    },
    {
      targetX: descLayout.cx, targetY: descLayout.cy,
      targetWidth: descLayout.w, targetHeight: descLayout.h,
      title: "Añade una descripción",
      description: "Describe los detalles (opcional).",
      shape: "rect", allowInteraction: true, canNext: true,
    },
    {
      targetX: priorityLayout.cx, targetY: priorityLayout.cy,
      targetWidth: priorityLayout.w, targetHeight: priorityLayout.h,
      title: "Establece la prioridad",
      description: "Selecciona qué tan urgente es esta tarea.",
      shape: "rect", allowInteraction: true, canNext: true,
    },
    {
      targetX: dueDateLayout.cx, targetY: dueDateLayout.cy,
      targetWidth: dueDateLayout.w, targetHeight: dueDateLayout.h,
      title: "Fecha límite",
      description: "Usa los atajos rápidos para establecer una fecha.",
      shape: "rect", allowInteraction: true, canNext: true,
    },
    {
      targetX: reminderLayout.cx, targetY: reminderLayout.cy,
      targetWidth: reminderLayout.w, targetHeight: reminderLayout.h,
      title: "Configura recordatorios",
      description: "Activa notificaciones para no olvidar esta tarea.",
      shape: "rect", allowInteraction: true, canNext: true,
    },
    {
      targetX: saveButtonLayout.cx, targetY: saveButtonLayout.cy,
      targetWidth: saveButtonLayout.w, targetHeight: saveButtonLayout.h,
      title: "¡Crea tu primera tarea!",
      description: "Presiona para guardar.",
      shape: "rect", allowInteraction: true, canNext: false,
    },
  ];

  // ─── Reset when modal closes ──────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setTitle("");
      setDescription("");
      setPriority(undefined);
      setDueDate(undefined);
      setStartDate(undefined);
      setReminderDate(undefined);
      setReminderEnabled(false);
      setLabels([]);
      setNewLabelName("");
      setShowLabelInput(false);
      setCurrentFormStep(0);
    }
  }, [visible]);

  // ─── Populate fields when editing ────────────────────────────────────────
  useEffect(() => {
    if (task && visible) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setDueDate(
        task.dueDate
          ? task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)
          : undefined
      );
      setStartDate(
        task.startDate
          ? task.startDate.toDate ? task.startDate.toDate() : new Date(task.startDate)
          : undefined
      );
      setReminderDate(
        task.reminderDate
          ? task.reminderDate.toDate ? task.reminderDate.toDate() : new Date(task.reminderDate)
          : undefined
      );
      setReminderEnabled(task.reminderEnabled || false);
      setLabels(task.labels || []);
    }
  }, [task, visible]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) return;

    if (reminderEnabled && reminderDate) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permisos necesarios",
          "Para recibir recordatorios, necesitamos permiso para enviar notificaciones.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Configuración",
              onPress: () => {
                if (Platform.OS === "ios") Linking.openURL("app-settings:");
                else Linking.openSettings();
              },
            },
          ]
        );
        return;
      }
      if (reminderDate <= new Date()) {
        Alert.alert("Fecha inválida", "La fecha del recordatorio debe ser en el futuro.");
        return;
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate,
      startDate,
      reminderDate: reminderEnabled ? reminderDate : undefined,
      reminderEnabled,
      labels: labels.length > 0 ? labels : undefined,
    });
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

  const handleClose = () => {
    if (isModalTutorialActive) return;
    onClose();
  };

  // ─── Stepper helpers ──────────────────────────────────────────────────────
  const shouldShowField = (fieldStep: number) =>
    currentFormStep === getFieldPage(fieldStep);

  const canNavigateTo = (page: number) => {
    if (isModalTutorialActive) return false;
    return task !== null || page <= currentFormStep;
  };

  const handleNextFormStep = () => {
    if (currentFormStep < 2) setCurrentFormStep(currentFormStep + 1);
  };

  const handlePrevFormStep = () => {
    if (currentFormStep > 0) setCurrentFormStep(currentFormStep - 1);
  };

  const getFieldZIndex = (fieldLocalStep: number) => {
    if (!isModalTutorialActive) return 1;
    return localStep === fieldLocalStep ? 99998 : 1;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          style={[
            styles.overlay,
            {
              backgroundColor: isModalTutorialActive
                ? "transparent"
                : "rgba(0,0,0,0.5)",
            },
          ]}
          onPress={handleClose}
        >
          <Pressable
            style={[styles.content, { backgroundColor: colors.cardBackground, zIndex: 1 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              style={{ zIndex: 1 }}
              contentContainerStyle={{ zIndex: 1 }}
            >
              {/* ── Header ─────────────────────────────────────────────────── */}
              <View style={styles.header}>
                <View>
                  <ThemedText type="h4">
                    {task ? "Editar tarea" : "Nueva tarea"}
                  </ThemedText>
                  {!task && status && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                        backgroundColor: colors.backgroundSecondary,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Feather
                        name={COLUMN_ICONS[status] as any}
                        size={12}
                        color={colors.primary}
                      />
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {COLUMN_TITLES[status]}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <Pressable onPress={handleClose} hitSlop={8}>
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              </View>

              {/* ── Stepper dots ─────────────────────────────────────────── */}
              <View style={styles.stepperContainer}>
                {[0, 1, 2].map((page) => (
                  <Pressable
                    key={page}
                    onPress={() => canNavigateTo(page) && setCurrentFormStep(page)}
                    hitSlop={10}
                    disabled={!canNavigateTo(page)}
                  >
                    <View
                      style={[
                        styles.stepDot,
                        {
                          width: currentFormStep === page ? 20 : 8,
                          backgroundColor:
                            currentFormStep === page
                              ? colors.primary
                              : currentFormStep > page
                                ? colors.primary + "70"
                                : colors.backgroundSecondary,
                        },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>

              {/* ── Page label ─────────────────────────────────────────────── */}
              <ThemedText
                type="small"
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginBottom: 16,
                  marginTop: -4,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {PAGE_LABELS[currentFormStep]} · {currentFormStep + 1} / 3
              </ThemedText>

              {/* ── PÁGINA 0 — Título ──────────────────────────────────────── */}
              {shouldShowField(0) && (
                <View
                  ref={titleFieldRef}
                  style={[
                    styles.section,
                    {
                      zIndex: getFieldZIndex(0),
                      elevation: isModalTutorialActive && localStep === 0 ? 99998 : 0,
                    },
                  ]}
                  collapsable={false}
                >
                  <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                    Título *
                  </ThemedText>
                  <View
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor:
                          isModalTutorialActive && localStep === 0
                            ? colors.primary
                            : colors.border,
                        borderWidth: isModalTutorialActive && localStep === 0 ? 2 : 1,
                      },
                      isModalTutorialActive && localStep === 0
                        ? { zIndex: 99998, elevation: 99998, position: "relative" }
                        : {},
                    ]}
                  >
                    <TextInput
                      style={[styles.inputText, { color: colors.text }]}
                      placeholder="¿Qué hay que hacer?"
                      placeholderTextColor={colors.textSecondary}
                      value={title}
                      onChangeText={setTitle}
                      editable={!isModalTutorialActive || localStep === 0}
                      autoFocus={currentFormStep === 0 && !isModalTutorialActive}
                    />
                  </View>
                </View>
              )}

              {/* ── PÁGINA 0 — Descripción ─────────────────────────────────── */}
              {shouldShowField(1) && (
                <View
                  ref={descFieldRef}
                  style={[
                    styles.section,
                    {
                      zIndex: getFieldZIndex(1),
                      elevation: isModalTutorialActive && localStep === 1 ? 99998 : 0,
                    },
                  ]}
                  collapsable={false}
                >
                  <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                    Descripción
                  </ThemedText>
                  <View
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor:
                          isModalTutorialActive && localStep === 1
                            ? colors.primary
                            : colors.border,
                        borderWidth: isModalTutorialActive && localStep === 1 ? 2 : 1,
                      },
                      isModalTutorialActive && localStep === 1
                        ? { zIndex: 99998, elevation: 99998, position: "relative" }
                        : {},
                    ]}
                  >
                    <TextInput
                      style={[styles.inputText, styles.textAreaInput, { color: colors.text }]}
                      placeholder="Añade más detalles..."
                      placeholderTextColor={colors.textSecondary}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      editable={!isModalTutorialActive || localStep === 1}
                    />
                  </View>
                </View>
              )}

              {/* ── PÁGINA 1 — Prioridad ───────────────────────────────────── */}
              {shouldShowField(2) && (
                <View
                  ref={priorityFieldRef}
                  style={[
                    styles.section,
                    {
                      zIndex: getFieldZIndex(2),
                      elevation: isModalTutorialActive && localStep === 2 ? 99998 : 0,
                      position: "relative",
                    },
                  ]}
                  collapsable={false}
                >
                  <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                    Prioridad
                  </ThemedText>
                  <View style={styles.optionsRow}>
                    {PRIORITY_OPTIONS.map((p) => {
                      const isSelected = priority === p;
                      const priorityColor = getPriorityColor(p);
                      return (
                        <Pressable
                          key={p}
                          onPress={() => setPriority(isSelected ? undefined : p)}
                          disabled={isModalTutorialActive && localStep !== 2}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? priorityColor
                                : colors.backgroundSecondary,
                              borderColor: isSelected ? priorityColor : colors.border,
                            },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              color: isSelected ? "#fff" : colors.text,
                              fontWeight: "600",
                            }}
                          >
                            {p}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ── PÁGINA 1 — Fecha límite ────────────────────────────────── */}
              {shouldShowField(3) && (
                <View
                  ref={dueDateFieldRef}
                  style={[
                    styles.section,
                    {
                      zIndex: getFieldZIndex(3),
                      elevation: isModalTutorialActive && localStep === 3 ? 99998 : 0,
                      position: "relative",
                    },
                  ]}
                  collapsable={false}
                >
                  <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                    Fecha límite
                  </ThemedText>
                  <View style={styles.optionsRow}>
                    <Pressable
                      onPress={() => handleSetDueDate(1)}
                      disabled={isModalTutorialActive && localStep !== 3}
                      style={[
                        styles.chip,
                        {
                          flex: 1,
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border,
                          flexDirection: "column",
                          gap: 4,
                        },
                      ]}
                    >
                      <Feather name="calendar" size={14} color={colors.textSecondary} />
                      <ThemedText type="small" style={{ color: colors.text }}>
                        Mañana
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSetDueDate(7)}
                      disabled={isModalTutorialActive && localStep !== 3}
                      style={[
                        styles.chip,
                        {
                          flex: 1,
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border,
                          flexDirection: "column",
                          gap: 4,
                        },
                      ]}
                    >
                      <Feather name="calendar" size={14} color={colors.textSecondary} />
                      <ThemedText type="small" style={{ color: colors.text }}>
                        7 días
                      </ThemedText>
                    </Pressable>
                    {dueDate && (
                      <Pressable
                        onPress={() => setDueDate(undefined)}
                        disabled={isModalTutorialActive && localStep !== 3}
                        style={[
                          styles.chip,
                          {
                            flex: 1,
                            backgroundColor: colors.backgroundSecondary,
                            borderColor: colors.border,
                            flexDirection: "column",
                            gap: 4,
                          },
                        ]}
                      >
                        <Feather name="x" size={14} color={colors.textSecondary} />
                      </Pressable>
                    )}
                  </View>
                  {dueDate && (
                    <View style={styles.datePreview}>
                      <Feather name="calendar" size={12} color={colors.primary} />
                      <ThemedText type="small" style={{ color: colors.primary }}>
                        {dueDate.toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </ThemedText>
                    </View>
                  )}
                  <DatePickerInput
                    label="Fecha personalizada"
                    value={dueDate}
                    onChange={setDueDate}
                    minimumDate={new Date()}
                    icon="calendar"
                  />
                </View>
              )}

              {/* ── PÁGINA 2 — Recordatorio ────────────────────────────────── */}
              {shouldShowField(4) && (
                <View
                  ref={reminderFieldRef}
                  style={[
                    styles.section,
                    {
                      zIndex: getFieldZIndex(4),
                      elevation: isModalTutorialActive && localStep === 4 ? 99998 : 0,
                      position: "relative",
                    },
                  ]}
                  collapsable={false}
                >
                  <View style={styles.labelHeader}>
                    <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                      Recordatorio
                    </ThemedText>
                    <Pressable
                      onPress={() => setReminderEnabled(!reminderEnabled)}
                      disabled={isModalTutorialActive && localStep !== 4}
                      style={[
                        styles.toggleButton,
                        {
                          backgroundColor: reminderEnabled
                            ? colors.primary
                            : colors.backgroundSecondary,
                          borderColor: reminderEnabled ? colors.primary : colors.border,
                        },
                      ]}
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
                          fontWeight: "600",
                        }}
                      >
                        {reminderEnabled ? "Activado" : "Desactivado"}
                      </ThemedText>
                    </Pressable>
                  </View>

                  {reminderEnabled && (
                    <>
                      <View style={styles.optionsRow}>
                        <Pressable
                          onPress={() => {
                            const reminder = new Date();
                            reminder.setHours(reminder.getHours() + 1);
                            setReminderDate(reminder);
                          }}
                          disabled={isModalTutorialActive && localStep !== 4}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: colors.backgroundSecondary,
                              borderColor: colors.border,
                              flex: 1,
                            },
                          ]}
                        >
                          <Feather name="zap" size={14} color={colors.textSecondary} />
                          <ThemedText
                            type="small"
                            style={{ color: colors.text, textAlign: "center" }}
                          >
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
                          disabled={isModalTutorialActive && localStep !== 4}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: colors.backgroundSecondary,
                              borderColor: colors.border,
                              flex: 1,
                            },
                          ]}
                        >
                          <Feather name="sunrise" size={14} color={colors.textSecondary} />
                          <ThemedText
                            type="small"
                            style={{ color: colors.text, textAlign: "center" }}
                          >
                            Mañana 9 AM
                          </ThemedText>
                        </Pressable>
                      </View>

                      <DateTimePickerInput
                        label="Seleccionar fecha y hora personalizada"
                        value={reminderDate}
                        onChange={setReminderDate}
                        minimumDate={new Date()}
                        icon="bell"
                      />

                      {reminderDate && (
                        <View
                          style={[
                            styles.warningBox,
                            {
                              backgroundColor: colors.primary + "15",
                              borderColor: colors.primary,
                            },
                          ]}
                        >
                          <Feather name="info" size={16} color={colors.primary} />
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              type="small"
                              style={{ color: colors.primary, fontWeight: "600" }}
                            >
                              Recordatorio programado
                            </ThemedText>
                            <ThemedText
                              type="small"
                              style={{ color: colors.primary, fontSize: 11 }}
                            >
                              {reminderDate.toLocaleString("es-ES", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </ThemedText>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* ── PÁGINA 2 — Etiquetas ───────────────────────────────────── */}
              {shouldShowField(5) && (
                <View style={styles.section}>
                  <View style={styles.labelHeader}>
                    <ThemedText type="small" style={[styles.label, { color: colors.text }]}>
                      Etiquetas
                    </ThemedText>
                    {!showLabelInput && (
                      <Pressable
                        onPress={() => setShowLabelInput(true)}
                        style={styles.addButton}
                      >
                        <Feather name="plus" size={14} color={colors.primary} />
                        <ThemedText
                          type="small"
                          style={{ color: colors.primary, fontWeight: "600" }}
                        >
                          Añadir
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>

                  {showLabelInput && (
                    <View style={styles.labelInputRow}>
                      <View
                        style={[
                          styles.labelInput,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderColor: colors.border,
                            flex: 1,
                          },
                        ]}
                      >
                        <TextInput
                          style={[styles.inputText, { color: colors.text }]}
                          placeholder="Nombre de etiqueta"
                          placeholderTextColor={colors.textSecondary}
                          value={newLabelName}
                          onChangeText={setNewLabelName}
                          onSubmitEditing={handleAddLabel}
                        />
                      </View>
                      <Pressable
                        onPress={handleAddLabel}
                        disabled={!newLabelName.trim()}
                        style={[
                          styles.iconButton,
                          {
                            backgroundColor: newLabelName.trim()
                              ? colors.primary
                              : colors.backgroundSecondary,
                          },
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
                        style={[
                          styles.iconButton,
                          { backgroundColor: colors.backgroundSecondary },
                        ]}
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
                              borderColor: label.color,
                            },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={[styles.labelText, { color: label.color }]}
                          >
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
              )}
            </ScrollView>

            {/* ── Footer ─────────────────────────────────────────────────────
             *
             * SIN rama especial para tutorial. Los botones normales siempre
             * se renderizan igual, con o sin tutorial activo.
             *
             * El tutorial avanza las páginas automáticamente via el useEffect
             * que escucha localStep → getTutorialPage. Los botones del modal
             * (Siguiente / Atrás / Crear) siguen siendo funcionales y visibles
             * en todo momento. El TutorialOverlay pone su propio card encima
             * con "Siguiente" / "Atrás" para guiar, pero los botones del form
             * no deben ocultarse.
             *
             ─────────────────────────────────────────────────────────────── */}
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.cardBackground,
                  borderTopColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, 20),
                },
              ]}
            >
              {currentFormStep < 2 ? (
                <>
                  {currentFormStep > 0 && (
                    <Pressable
                      onPress={handlePrevFormStep}
                      style={[styles.button, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <Feather name="arrow-left" size={16} color={colors.text} />
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        Atrás
                      </ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleNextFormStep}
                    disabled={currentFormStep === 0 && !title.trim()}
                    style={[
                      styles.button,
                      {
                        flex: 1,
                        backgroundColor:
                          currentFormStep === 0 && !title.trim()
                            ? colors.backgroundSecondary
                            : colors.primary,
                        opacity: currentFormStep === 0 && !title.trim() ? 0.5 : 1,
                      },
                    ]}
                  >
                    <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                      Siguiente
                    </ThemedText>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={handlePrevFormStep}
                    style={[styles.button, { backgroundColor: colors.backgroundSecondary }]}
                  >
                    <Feather name="arrow-left" size={16} color={colors.text} />
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      Atrás
                    </ThemedText>
                  </Pressable>

                  {/* saveButtonRef aquí — siempre visible, measureInWindow funciona */}
                  <View
                    ref={saveButtonRef}
                    collapsable={false}
                    onLayout={measureSaveButton}
                    style={{ flex: 1, position: "relative" }}
                  >
                    <Pressable
                      onPress={handleSave}
                      disabled={!title.trim()}
                      style={[
                        styles.button,
                        {
                          backgroundColor: title.trim()
                            ? colors.primary
                            : colors.backgroundSecondary,
                          opacity: title.trim() ? 1 : 0.5,
                        },
                      ]}
                    >
                      <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                        {task ? "Guardar" : "Crear"}
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      {isModalTutorialActive && (
        <TutorialOverlay
          step={localStep}
          steps={taskModalTutorialSteps}
          onNext={onTutorialNext ?? (() => { })}
          onBack={onTutorialBack ?? (() => { })}
          onSkip={onTutorialSkip ?? (() => { })}
          isModalTutorial
          mascot={localStep === taskModalTutorialSteps.length - 1 ? "peep" : "peepup"}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: 20,
    position: "relative",
  },
  label: {
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
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  datePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  labelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addButton: {
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
  labelTag: {
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
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    marginTop: 10,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
});