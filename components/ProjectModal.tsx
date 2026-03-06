import { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import TutorialOverlay, { TutorialStep } from "@/components/Tutorialoverlay";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export const MODAL_TUTORIAL_STEP_OFFSET = 2;
export const MODAL_TUTORIAL_STEP_COUNT = 4;

export interface ProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    color: string;
    icon: string;
  }) => Promise<void>;
  initialData?: {
    title: string;
    description: string;
    color: string;
    icon: string;
  };
  mode: "create" | "edit";
  showTutorial?: boolean;
  tutorialStep?: number;
  onTutorialNext?: () => void;
  onTutorialBack?: () => void;
  onTutorialSkip?: () => void;
}

const PROJECT_COLORS = [
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#10B981" },
  { name: "Morado", value: "#8B5CF6" },
  { name: "Rojo", value: "#EF4444" },
  { name: "Naranja", value: "#F59E0B" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Turquesa", value: "#06B6D4" },
  { name: "Amarillo", value: "#EAB308" },
];

const PROJECT_ICONS = [
  "folder", "briefcase", "package", "code", "coffee", "heart", "star", "zap",
  "target", "flag", "bookmark", "gift", "aperture", "camera", "film", "music",
  "headphones", "book", "edit", "droplet", "feather", "sun", "moon", "cloud",
];

export function ProjectModal({
  visible,
  onClose,
  onSave,
  initialData,
  mode,
  showTutorial = false,
  tutorialStep = 0,
  onTutorialNext,
  onTutorialBack,
  onTutorialSkip,
}: ProjectModalProps) {
  const { isDark, theme } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [saving, setSaving] = useState(false);

  const titleFieldRef = useRef<View>(null);
  const descFieldRef = useRef<View>(null);
  const customizeFieldRef = useRef<View>(null);
  const saveButtonRef = useRef<View>(null);

  const SPOTLIGHT_PADDING = 10;

  const [titleLayout, setTitleLayout] = useState({
    cx: SCREEN_WIDTH / 2,
    cy: SCREEN_HEIGHT * 0.30,
    w: SCREEN_WIDTH - 100,
    h: 60,
  });
  const [descLayout, setDescLayout] = useState({
    cx: SCREEN_WIDTH / 2,
    cy: SCREEN_HEIGHT * 0.45,
    w: SCREEN_WIDTH - 100,
    h: 110,
  });
  const [customizeLayout, setCustomizeLayout] = useState({
    cx: SCREEN_WIDTH / 2,
    cy: SCREEN_HEIGHT * 0.62,
    w: SCREEN_WIDTH - 100,
    h: 200,
  });
  const [saveButtonLayout, setSaveButtonLayout] = useState({
    cx: SCREEN_WIDTH / 2,
    cy: SCREEN_HEIGHT * 0.84,
    w: (SCREEN_WIDTH - 120) / 2,
    h: 56,
  });

  const localStep = tutorialStep - MODAL_TUTORIAL_STEP_OFFSET;
  const isModalTutorialActive =
    showTutorial &&
    tutorialStep >= MODAL_TUTORIAL_STEP_OFFSET &&
    tutorialStep < MODAL_TUTORIAL_STEP_OFFSET + MODAL_TUTORIAL_STEP_COUNT;

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
          h: h + SPOTLIGHT_PADDING * 2
        });
      }
    });
  };

  const measureAllElements = () => {
    measureElement(titleFieldRef, setTitleLayout);
    measureElement(descFieldRef, setDescLayout);
    measureElement(customizeFieldRef, setCustomizeLayout);
    measureElement(saveButtonRef, setSaveButtonLayout);
  };

  useEffect(() => {
    if (isModalTutorialActive) {
      setTimeout(measureAllElements, 300);
      measureInterval.current = setInterval(measureAllElements, 250);

      return () => {
        if (measureInterval.current) {
          clearInterval(measureInterval.current);
          measureInterval.current = null;
        }
      };
    }
  }, [isModalTutorialActive, localStep]);

  useEffect(() => {
    if (visible) {
      setTimeout(measureAllElements, 900);
    }
  }, [visible]);

  useEffect(() => {
    if (isModalTutorialActive) {
      Keyboard.dismiss();
    }
  }, [localStep]);

  const modalTutorialSteps: TutorialStep[] = [
    {
      targetX: titleLayout.cx,
      targetY: titleLayout.cy,
      targetWidth: titleLayout.w,
      targetHeight: titleLayout.h,
      title: "Dale un nombre",
      description: 'Escribe un nombre descriptivo para tu proyecto.',
      shape: "rect",
      allowInteraction: true,
      canNext: title.trim().length >= 1,
    },
    {
      targetX: descLayout.cx,
      targetY: descLayout.cy,
      targetWidth: descLayout.w,
      targetHeight: descLayout.h,
      title: "Añade una descripción",
      description: "Describe de qué trata (opcional).",
      shape: "rect",
      allowInteraction: true,
      canNext: true,
    },
    {
      targetX: customizeLayout.cx,
      targetY: customizeLayout.cy,
      targetWidth: customizeLayout.w,
      targetHeight: customizeLayout.h,
      title: "Personaliza",
      description: "Elige un icono y color.",
      shape: "rect",
      allowInteraction: true,
      canNext: true,
    },
    {
      targetX: saveButtonLayout.cx,
      targetY: saveButtonLayout.cy,
      targetWidth: saveButtonLayout.w,
      targetHeight: saveButtonLayout.h,
      title: "¡Crea tu proyecto!",
      description: "Presiona para crear.",
      shape: "rect",
      allowInteraction: true,
      canNext: false,
    },
  ];

  const step2Advanced = useRef(false);

  useEffect(() => {
    if (!isModalTutorialActive || localStep !== 0) {
      step2Advanced.current = false;
      return;
    }
  }, [title, localStep, isModalTutorialActive, onTutorialNext]);

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setSelectedColor(initialData.color || PROJECT_COLORS[0].value);
        setSelectedIcon(initialData.icon || "folder");
      } else {
        setTitle("");
        setDescription("");
        setSelectedColor(PROJECT_COLORS[0].value);
        setSelectedIcon("folder");
      }
      step2Advanced.current = false;
    }
  }, [visible, mode, initialData]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      if (mode === "create") {
        setTitle("");
        setDescription("");
        setSelectedColor(PROJECT_COLORS[0].value);
        setSelectedIcon("folder");
      }
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isModalTutorialActive) return;

    if (mode === "create") {
      setTitle("");
      setDescription("");
      setSelectedColor(PROJECT_COLORS[0].value);
      setSelectedIcon("folder");
    }
    onClose();
  };

  const activeBorder = (isActive: boolean) => ({
    borderColor: isActive ? colors.primary : colors.border,
    borderWidth: isActive ? 2 : 1,
  });

  const getFieldZIndex = (fieldLocalStep: number) => {
    if (!isModalTutorialActive) return 1;
    return localStep === fieldLocalStep ? 999999 : 1;
  };

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
        keyboardVerticalOffset={0}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: isModalTutorialActive ? 'transparent' : colors.overlay }]}
          onPress={handleClose}
        >
          <Pressable
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.cardBackground,
                zIndex: 1,
              }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isModalTutorialActive}
              style={{ zIndex: 1 }}
              contentContainerStyle={{ zIndex: 1 }}
            >
              <View style={styles.header}>
                <View>
                  <ThemedText type="h3">
                    {mode === "create" ? "Nuevo proyecto" : "Editar proyecto"}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: colors.textSecondary, marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {mode === "create"
                      ? "Organiza tus tareas"
                      : "Actualiza la información"}
                  </ThemedText>
                </View>
                <Pressable onPress={handleClose} hitSlop={8}>
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View
                ref={titleFieldRef}
                style={[
                  styles.field,
                  {
                    zIndex: getFieldZIndex(0),
                    elevation: isModalTutorialActive && localStep === 0 ? 999999 : 0,
                  }
                ]}
                collapsable={false}
              >
                <ThemedText type="body" style={styles.label}>
                  Nombre del proyecto *
                </ThemedText>
                <View
                  style={[
                    styles.input,
                    { backgroundColor: colors.backgroundSecondary },
                    activeBorder(isModalTutorialActive && localStep === 0),
                    isModalTutorialActive && localStep === 0 ? {
                      zIndex: 999999,
                      elevation: 999999,
                      position: 'relative',
                    } : {}
                  ]}
                >
                  <Feather name="edit-3" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.inputText, { color: theme.text }]}
                    placeholder="ej. Desarrollo Web"
                    placeholderTextColor={colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    autoFocus={mode === "create" && !showTutorial}
                    editable={!isModalTutorialActive || localStep === 0}
                  />
                </View>
              </View>

              <View
                ref={descFieldRef}
                style={[
                  styles.field,
                  {
                    zIndex: getFieldZIndex(1),
                    elevation: isModalTutorialActive && localStep === 1 ? 999999 : 0,
                  }
                ]}
                collapsable={false}
              >
                <ThemedText type="body" style={styles.label}>
                  Descripción (opcional)
                </ThemedText>
                <View
                  style={[
                    styles.textAreaContainer,
                    { backgroundColor: colors.backgroundSecondary },
                    activeBorder(isModalTutorialActive && localStep === 1),
                    isModalTutorialActive && localStep === 1 ? {
                      zIndex: 999999,
                      elevation: 999999,
                      position: 'relative',
                    } : {}
                  ]}
                >
                  <TextInput
                    style={[styles.textArea, { color: theme.text }]}
                    placeholder="Describe tu proyecto..."
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    editable={!isModalTutorialActive || localStep === 1}
                  />
                </View>
              </View>

              <View
                ref={customizeFieldRef}
                style={{
                  zIndex: getFieldZIndex(2),
                  elevation: isModalTutorialActive && localStep === 2 ? 999999 : 0,
                  position: 'relative',
                }}
                collapsable={false}
              >
                <View style={styles.field}>
                  <ThemedText type="body" style={styles.label}>
                    Icono del proyecto
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.iconScroll}
                    scrollEnabled={!isModalTutorialActive || localStep === 2}
                  >
                    {PROJECT_ICONS.map((icon) => (
                      <Pressable
                        key={icon}
                        onPress={() => setSelectedIcon(icon)}
                        disabled={isModalTutorialActive && localStep !== 2}
                        style={[
                          styles.iconOption,
                          {
                            backgroundColor:
                              selectedIcon === icon
                                ? selectedColor + "20"
                                : colors.backgroundSecondary,
                            borderWidth: selectedIcon === icon ? 2 : 1,
                            borderColor:
                              selectedIcon === icon ? selectedColor : colors.border,
                          },
                        ]}
                      >
                        <Feather
                          name={icon as any}
                          size={24}
                          color={selectedIcon === icon ? selectedColor : colors.textSecondary}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.field}>
                  <ThemedText type="body" style={styles.label}>
                    Color del proyecto
                  </ThemedText>
                  <View style={styles.colorGrid}>
                    {PROJECT_COLORS.map((color) => (
                      <Pressable
                        key={color.value}
                        onPress={() => setSelectedColor(color.value)}
                        disabled={isModalTutorialActive && localStep !== 2}
                        style={[
                          styles.colorOption,
                          {
                            backgroundColor: color.value,
                            borderWidth: selectedColor === color.value ? 3 : 0,
                            borderColor: colors.text,
                          },
                        ]}
                      >
                        {selectedColor === color.value && (
                          <Feather name="check" size={20} color="#fff" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.preview,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.previewHeader}>
                  <Feather name="eye" size={16} color={colors.textSecondary} />
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Vista previa
                  </ThemedText>
                </View>
                <View style={styles.previewCard}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor + "20" }]}>
                    <Feather name={selectedIcon as any} size={20} color={selectedColor} />
                  </View>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {title || "Nombre del proyecto"}
                  </ThemedText>
                  {description ? (
                    <ThemedText
                      type="small"
                      style={{ color: colors.textSecondary, marginTop: 4 }}
                      numberOfLines={2}
                    >
                      {description}
                    </ThemedText>
                  ) : null}
                </View>
              </View>

              <View style={styles.buttons}>
                <Pressable
                  onPress={handleClose}
                  style={[styles.button, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Cancelar
                  </ThemedText>
                </Pressable>

                <View
                  ref={saveButtonRef}
                  collapsable={false}
                  style={[
                    { flex: 1 },
                    {
                      zIndex: getFieldZIndex(3),
                      elevation: isModalTutorialActive && localStep === 3 ? 999999 : 0,
                      position: 'relative',
                    }
                  ]}
                >
                  <Pressable
                    onPress={handleSave}
                    disabled={!title.trim() || saving || (isModalTutorialActive && localStep !== 3)}
                    style={[
                      styles.button,
                      styles.buttonPrimary,
                      {
                        backgroundColor: title.trim() ? selectedColor : colors.backgroundSecondary,
                        opacity: title.trim() && !saving ? 1 : 0.5,
                      },
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Feather name={mode === "create" ? "plus" : "check"} size={18} color="#fff" />
                        <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                          {mode === "create" ? "Crear proyecto" : "Guardar cambios"}
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      {isModalTutorialActive && (
        <TutorialOverlay
          step={localStep}
          steps={modalTutorialSteps}
          onNext={onTutorialNext ?? (() => { })}
          onBack={onTutorialBack ?? (() => { })}
          onSkip={onTutorialSkip ?? (() => { })}
          isModalTutorial
          mascot={localStep === modalTutorialSteps.length - 1 ? 'peep' : 'peepup'}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing["2xl"],
  },
  field: {
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  label: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    height: 52,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
  },
  textAreaContainer: {
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    minHeight: 75,
  },
  textArea: {
    fontSize: 16,
    minHeight: 55,
  },
  iconScroll: {
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  preview: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  previewCard: {
    alignItems: "flex-start",
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPrimary: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});