import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Pressable,
  TextInput,
  Animated,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ProjectDetailsModal } from "@/components/ProjectDetailsModal";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/src/firebaseConfig";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TaskCard } from "@/components/TaskCard";
import {
  TaskFormModal,
  TASK_MODAL_TUTORIAL_STEP_OFFSET,
  TASK_MODAL_TUTORIAL_STEP_COUNT,
} from "@/components/TaskFormModal";
import { LayoutSelector, LayoutMode, LAYOUT_OPTIONS } from "@/components/LayoutSelector";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useTutorial } from "@/src/contexts/Tutorialcontext";
import TutorialOverlay, { TutorialStep } from "@/components/Tutorialoverlay";
import {
  Task,
  subscribeToTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
  deleteProject,
} from "@/src/services/firestore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootNavigator";

type ProjectRouteProp = RouteProp<RootStackParamList, "Project">;

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const STATUSES: Task["status"][] = ["TODO", "DOING", "REVIEW", "DONE"];

const COLUMN_TITLES: Record<Task["status"], string> = {
  TODO: "Por Hacer",
  DOING: "En Progreso",
  REVIEW: "Revisión",
  DONE: "Completado",
};

const COLUMN_ICONS: Record<Task["status"], string> = {
  TODO: "circle",
  DOING: "play-circle",
  REVIEW: "eye",
  DONE: "check-circle",
};

// ─── Tutorial step constants ───────────────────────────────────────────────────
const PROJECT_SCREEN_TUTORIAL_STEP_START = 7;
const TASK_MODAL_LAST_STEP =
  TASK_MODAL_TUTORIAL_STEP_OFFSET + TASK_MODAL_TUTORIAL_STEP_COUNT - 1; // 13
const DRAG_TASK_STEP =
  TASK_MODAL_TUTORIAL_STEP_OFFSET + TASK_MODAL_TUTORIAL_STEP_COUNT; // 14
const EDIT_DELETE_TASK_STEP = DRAG_TASK_STEP + 1;  // 15
const LAYOUT_SELECTOR_STEP = DRAG_TASK_STEP + 2;  // 16
const LAYOUT_MODAL_INTRO_STEP = DRAG_TASK_STEP + 3;  // 17
const COMPACT_MODE_STEP = DRAG_TASK_STEP + 4;  // 18
const GRID_MODE_STEP = DRAG_TASK_STEP + 5;  // 19
const READONLY_MODE_STEP = DRAG_TASK_STEP + 6;  // 20
const SELECT_GRID_STEP = DRAG_TASK_STEP + 7;  // 21
const BACK_BUTTON_STEP = DRAG_TASK_STEP + 8;  // 22
const FINAL_STEP = DRAG_TASK_STEP + 9;  // 23

// ─── ProjectScreen ─────────────────────────────────────────────────────────────
export default function ProjectScreen() {
  const route = useRoute<ProjectRouteProp>();
  const navigation = useNavigation();
  const { projectId, projectTitle } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { isDark, themeKey } = useTheme();
  const {
    showTutorial,
    currentStep,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorial();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("compact");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [selectedStatusForNewTask, setSelectedStatusForNewTask] =
    useState<Task["status"]>("TODO");
  const [dropTargetStatus, setDropTargetStatus] = useState<Task["status"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [readonlyFilter, setReadonlyFilter] = useState<Task["status"] | "ALL">("ALL");
  const [projectDetailsVisible, setProjectDetailsVisible] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // ─── Tutorial tracking ─────────────────────────────────────────────────────
  const [firstTaskId, setFirstTaskId] = useState<string | null>(null);
  const [taskDraggedOnce, setTaskDraggedOnce] = useState(false);
  const [projectWelcomeDone, setProjectWelcomeDone] = useState(false);

  const [optionLayouts, setOptionLayouts] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});

  const [optionLayoutsReady, setOptionLayoutsReady] = useState(false);

  const backBtnRef = useRef<View>(null);

  const [backButtonLayout, setBackButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 40,
    height: 40,
  });

  const measureBackButton = useCallback(() => {
    requestAnimationFrame(() => {
      backBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        if (width > 0 && height > 0) {
          setBackButtonLayout({ x: pageX, y: pageY, width, height });
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!showTutorial || currentStep !== BACK_BUTTON_STEP) return;
    const doMeasure = () => {
      backBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        if (width > 0 && height > 0) {
          setBackButtonLayout({ x: pageX, y: pageY, width, height });
        }
      });
    };
    doMeasure();
    const interval = setInterval(doMeasure, 300);
    return () => clearInterval(interval);
  }, [showTutorial, currentStep]);

  const handleOptionMeasure = useCallback(
    (mode: LayoutMode, layout: { x: number; y: number; width: number; height: number }) => {
      setOptionLayouts((prev) => {
        const next = { ...prev, [mode]: layout };
        if (next.compact && next.grid && next.readonly) {
          setOptionLayoutsReady(true);
        }
        return next;
      });
    },
    []
  );

  // ─── Refs drag-and-drop ────────────────────────────────────────────────────
  const sectionRefs = useRef<Record<Task["status"], View | null>>({
    TODO: null, DOING: null, REVIEW: null, DONE: null,
  });
  const sectionCache = useRef<Record<Task["status"], { y: number; height: number }>>({
    TODO: { y: 0, height: 0 }, DOING: { y: 0, height: 0 },
    REVIEW: { y: 0, height: 0 }, DONE: { y: 0, height: 0 },
  });
  const gridSectionRefs = useRef<Record<Task["status"], View | null>>({
    TODO: null, DOING: null, REVIEW: null, DONE: null,
  });
  const gridSectionCache = useRef<
    Record<Task["status"], { x: number; y: number; width: number; height: number }>
  >({
    TODO: { x: 0, y: 0, width: 0, height: 0 },
    DOING: { x: 0, y: 0, width: 0, height: 0 },
    REVIEW: { x: 0, y: 0, width: 0, height: 0 },
    DONE: { x: 0, y: 0, width: 0, height: 0 },
  });

  const firstTaskCardRef = useRef<View>(null);

  const addBtnRef = useRef<View>(null);
  const [addButtonLayout, setAddButtonLayout] = useState({
    x: screenWidth - 56,
    y: 180,
    width: 28,
    height: 28,
  });

  useEffect(() => {
    if (addBtnRef.current) {
      setTimeout(() => {
        addBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
          setAddButtonLayout({ x: pageX, y: pageY, width, height });
        });
      }, 500);
    }
  }, []);

  const layoutSelectorRef = useRef<View>(null);
  const [layoutSelectorLayout, setLayoutSelectorLayout] = useState({
    x: screenWidth - 56,
    y: 50,
    width: 36,
    height: 36,
  });

  useEffect(() => {
    if (layoutSelectorRef.current) {
      setTimeout(() => {
        layoutSelectorRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            setLayoutSelectorLayout({ x: pageX, y: pageY, width, height });
          }
        });
      }, 600);
    }
  }, []);

  useEffect(() => {
    if (
      showTutorial &&
      currentStep === LAYOUT_SELECTOR_STEP &&
      layoutSelectorRef.current
    ) {
      setTimeout(() => {
        layoutSelectorRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            setLayoutSelectorLayout({ x: pageX, y: pageY, width, height });
          }
        });
      }, 300);
    }
  }, [showTutorial, currentStep]);

  useEffect(() => {
    if (
      showTutorial &&
      currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START &&
      projectWelcomeDone &&
      addBtnRef.current
    ) {
      setTimeout(() => {
        addBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            setAddButtonLayout({ x: pageX, y: pageY, width, height });
          }
        });
      }, 500);
    }
  }, [showTutorial, currentStep, projectWelcomeDone]);

  const [firstTaskLayout, setFirstTaskLayout] = useState({
    x: Spacing.md,
    y: 260,
    width: screenWidth - Spacing.md * 2,
    height: 100,
  });

  useEffect(() => {
    if (
      !firstTaskCardRef.current || !firstTaskId ||
      (currentStep !== DRAG_TASK_STEP && currentStep !== EDIT_DELETE_TASK_STEP)
    ) return;
    const measure = () => {
      firstTaskCardRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        if (width > 0 && height > 0) {
          setFirstTaskLayout({ x: pageX, y: pageY, width, height });
        }
      });
    };
    measure();
    const interval = setInterval(measure, 400);
    return () => clearInterval(interval);
  }, [currentStep, firstTaskId]);

  // ─── Derived tutorial state ────────────────────────────────────────────────
  const isProjectScreenTutorialActive =
    showTutorial &&
    (currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START ||
      currentStep === DRAG_TASK_STEP ||
      currentStep === EDIT_DELETE_TASK_STEP ||
      currentStep === LAYOUT_SELECTOR_STEP ||
      currentStep === LAYOUT_MODAL_INTRO_STEP ||
      currentStep === COMPACT_MODE_STEP ||
      currentStep === GRID_MODE_STEP ||
      currentStep === READONLY_MODE_STEP ||
      currentStep === SELECT_GRID_STEP ||
      currentStep === BACK_BUTTON_STEP ||
      currentStep === FINAL_STEP);

  const layoutSelectorForceOpen =
    showTutorial &&
    (currentStep === LAYOUT_MODAL_INTRO_STEP ||
      currentStep === COMPACT_MODE_STEP ||
      currentStep === GRID_MODE_STEP ||
      currentStep === READONLY_MODE_STEP ||
      currentStep === SELECT_GRID_STEP);

  // ─── Tutorial steps ────────────────────────────────────────────────────────
  const optionCenter = (mode: string) => {
    const l = optionLayouts[mode];
    if (l) return { x: l.x + l.width / 2, y: l.y + l.height / 2, w: l.width + 20, h: l.height + 20 };
    return { x: screenWidth / 2, y: screenHeight / 2, w: screenWidth - 64, h: 76 };
  };

  const projectScreenTutorialSteps: TutorialStep[] = [
    // localStep 0 — Welcome
    {
      targetX: screenWidth / 2,
      targetY: screenHeight / 2 - 100,
      targetWidth: 200,
      targetHeight: 200,
      title: "¡Tu proyecto está listo!",
      description: "Aquí podrás gestionar tus tareas, asignar prioridades, fechas límite y recordatorios para mantenerte organizado.",
      shape: "circle" as const,
      allowInteraction: false,
      canNext: true,
    },
    // localStep 1 — Botón + TODO
    {
      targetX: addButtonLayout.x + addButtonLayout.width / 2,
      targetY: addButtonLayout.y + addButtonLayout.height / 2,
      targetWidth: 60,
      targetHeight: 60,
      title: "Crea tu primera tarea",
      description: "Presiona el botón + para añadir una tarea a tu proyecto.",
      shape: "circle" as const,
      allowInteraction: true,
      canNext: false,
    },
    // localStep 2 — Arrastrar tarea
    {
      targetX: firstTaskLayout.x + firstTaskLayout.width / 2,
      targetY: firstTaskLayout.y + firstTaskLayout.height / 2,
      targetWidth: firstTaskLayout.width + 20,
      targetHeight: firstTaskLayout.height + 20,
      title: "Arrastra tu tarea",
      description: "Mantén presionada la tarea y arrástrala a otra columna para cambiar su estado.",
      shape: "rect" as const,
      allowInteraction: true,
      canNext: false,
    },
    // localStep 3 — Editar/Eliminar
    {
      targetX: firstTaskLayout.x + firstTaskLayout.width / 2,
      targetY: firstTaskLayout.y + firstTaskLayout.height / 2,
      targetWidth: firstTaskLayout.width + 20,
      targetHeight: firstTaskLayout.height + 20,
      title: "Gestiona tus tareas",
      description: "Puedes editar o eliminar tareas usando los botones en la esquina superior derecha de cada tarjeta.",
      shape: "rect" as const,
      allowInteraction: true,
      canNext: true,
    },
    // localStep 4 — Botón LayoutSelector
    {
      targetX: layoutSelectorLayout.x + layoutSelectorLayout.width / 2,
      targetY: layoutSelectorLayout.y + layoutSelectorLayout.height / 2,
      targetWidth: layoutSelectorLayout.width + 20,
      targetHeight: layoutSelectorLayout.height + 20,
      title: "Cambia la vista",
      description: "Toca este botón para explorar las diferentes formas de ver tus tareas.",
      shape: "circle" as const,
      allowInteraction: true,
      canNext: false,
    },
    // localStep 5 — Intro del modal
    {
      targetX: screenWidth / 2,
      targetY: screenHeight / 2,
      targetWidth: 0,
      targetHeight: 0,
      title: "Selector de vista",
      description: "Desde aquí puedes elegir cómo ver las tareas de tu proyecto. Tienes 3 opciones disponibles.",
      shape: "circle" as const,
      allowInteraction: false,
      canNext: true,
    },
    // localStep 6 — Compacto
    {
      targetX: optionCenter("compact").x,
      targetY: optionCenter("compact").y,
      targetWidth: optionCenter("compact").w,
      targetHeight: optionCenter("compact").h,
      title: "Modo Compacto",
      description: "Vista vertical con columnas. Es el modo principal para gestionar tareas rápidamente.",
      shape: "rect" as const,
      allowInteraction: false,
      canNext: true,
    },
    // localStep 7 — Cuadrícula
    {
      targetX: optionCenter("grid").x,
      targetY: optionCenter("grid").y,
      targetWidth: optionCenter("grid").w,
      targetHeight: optionCenter("grid").h,
      title: "Modo Cuadrícula",
      description: "Tablero Kanban con 4 columnas. Ideal para tener una visión global del proyecto.",
      shape: "rect" as const,
      allowInteraction: false,
      canNext: true,
    },
    // localStep 8 — Solo Lectura
    {
      targetX: optionCenter("readonly").x,
      targetY: optionCenter("readonly").y,
      targetWidth: optionCenter("readonly").w,
      targetHeight: optionCenter("readonly").h,
      title: "Modo Solo Lectura",
      description: "Busca y filtra tareas sin editar. Perfecto para revisar el estado del proyecto.",
      shape: "rect" as const,
      allowInteraction: false,
      canNext: true,
    },
    // localStep 9 — Selecciona Cuadrícula
    {
      targetX: optionCenter("grid").x,
      targetY: optionCenter("grid").y,
      targetWidth: optionCenter("grid").w,
      targetHeight: optionCenter("grid").h,
      title: "¡Selecciona Cuadrícula!",
      description: "Toca la opción Cuadrícula para cambiar la vista y continuar.",
      shape: "rect" as const,
      allowInteraction: true,
      canNext: false,
    },
    // localStep 10 — Botón volver
    {
      targetX: backButtonLayout.x + backButtonLayout.width / 2,
      targetY: backButtonLayout.y + backButtonLayout.height / 2,
      targetWidth: backButtonLayout.width + 16,
      targetHeight: backButtonLayout.height + 16,
      title: "¡Explora la vista!",
      description: "Ya conoces todas las vistas. Cuando quieras, toca la flecha de la izquierda para volver al menú principal.",
      shape: "circle" as const,
      allowInteraction: true,
      canNext: false,
    },
    // localStep 11 — Final
    {
      targetX: screenWidth / 2,
      targetY: screenHeight / 2 - 100,
      targetWidth: 200,
      targetHeight: 200,
      title: "¡Tutorial completado! 🎉",
      description: "Ya conoces todas las herramientas para gestionar tus proyectos. ¡Manos a la obra!\n\nPuedes repetir este tutorial desde Configuración en el Dashboard.",
      shape: "circle" as const,
      allowInteraction: false,
      canNext: true,
    },
  ];

  const getLocalTutorialStep = (): number => {
    if (currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START && !projectWelcomeDone) return 0;
    if (currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START && projectWelcomeDone) return 1;
    if (currentStep === DRAG_TASK_STEP) return 2;
    if (currentStep === EDIT_DELETE_TASK_STEP) return 3;
    if (currentStep === LAYOUT_SELECTOR_STEP) return 4;
    if (currentStep === LAYOUT_MODAL_INTRO_STEP) return 5;
    if (currentStep === COMPACT_MODE_STEP) return 6;
    if (currentStep === GRID_MODE_STEP) return 7;
    if (currentStep === READONLY_MODE_STEP) return 8;
    if (currentStep === SELECT_GRID_STEP) return 9;
    if (currentStep === BACK_BUTTON_STEP) return 10;
    if (currentStep === FINAL_STEP) return 11;
    return -1;
  };

  const localTutorialStep = getLocalTutorialStep();

  const modalTutorialSteps = projectScreenTutorialSteps.slice(5, 10);
  const modalLocalStep = localTutorialStep >= 5 && localTutorialStep <= 9
    ? localTutorialStep - 5
    : -1;

  const layoutSelectorTutorialOverlay =
    layoutSelectorForceOpen && modalLocalStep >= 0 ? (
      <TutorialOverlay
        step={modalLocalStep}
        steps={modalTutorialSteps}
        onNext={() => {
          if (modalLocalStep < 4) nextStep();
        }}
        onBack={prevStep}
        onSkip={skipTutorial}
        isModalTutorial={true}
        noOverlay={modalLocalStep === 0}
        mascot={
          modalLocalStep === 0
            ? "wc"
            : modalLocalStep === 4
              ? "peep"
              : "peepup"
        }
        onSpotlightPress={
          modalLocalStep === 4
            ? () => handleLayoutModeChange("grid")
            : undefined
        }
      />
    ) : null;

  // ─── Drag & drop ───────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getTasksByStatus = useCallback(
    (status: Task["status"]) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  const handleGridTaskDragMove = useCallback(
    (taskId: string, moveX: number, moveY: number) => {
      if (!draggingTaskId || layoutMode !== "grid") return;
      let foundTarget = false;
      for (const status of STATUSES) {
        const ref = gridSectionRefs.current[status];
        if (ref) {
          ref.measureInWindow((x, y, width, height) => {
            gridSectionCache.current[status] = { x, y, width, height };
            if (
              moveX >= x - 30 && moveX <= x + width + 30 &&
              moveY >= y - 100 && moveY <= y + height + 100
            ) {
              if (dropTargetStatus !== status) {
                setDropTargetStatus(status);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              foundTarget = true;
            }
          });
        }
      }
      setTimeout(() => {
        if (!foundTarget && dropTargetStatus !== null) setDropTargetStatus(null);
      }, 50);
    },
    [draggingTaskId, dropTargetStatus, layoutMode]
  );

  const handleTaskDragStart = useCallback((taskId: string) => {
    setDraggingTaskId(taskId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleTaskDragMove = useCallback(
    (taskId: string, moveY: number) => {
      if (!draggingTaskId) return;
      let foundInCache = false;
      for (const status of STATUSES) {
        const { y, height } = sectionCache.current[status];
        if (y > 0 && height > 0 && moveY >= y && moveY <= y + height) {
          if (dropTargetStatus !== status) {
            setDropTargetStatus(status);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          foundInCache = true;
          return;
        }
      }
      if (!foundInCache) {
        STATUSES.forEach((status) => {
          const ref = sectionRefs.current[status];
          if (ref) {
            ref.measureInWindow((x, y, width, height) => {
              sectionCache.current[status] = { y, height };
              if (moveY >= y && moveY <= y + height) {
                if (dropTargetStatus !== status) {
                  setDropTargetStatus(status);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }
            });
          }
        });
      }
      if (!foundInCache && dropTargetStatus !== null) setDropTargetStatus(null);
    },
    [draggingTaskId, dropTargetStatus]
  );

  const handleTaskDragEnd = useCallback(
    async (taskId: string, gestureState: { moveX: number; moveY: number }) => {
      const { moveX, moveY } = gestureState;
      let targetStatus: Task["status"] | null = null;

      if (layoutMode === "grid") {
        for (const status of STATUSES) {
          const { x, y, width, height } = gridSectionCache.current[status];
          if (x > 0 && y > 0 && width > 0 && height > 0) {
            if (
              moveX >= x - 20 && moveX <= x + width + 20 &&
              moveY >= y - 50 && moveY <= y + height + 50
            ) {
              targetStatus = status;
              break;
            }
          }
        }
      } else {
        for (const status of STATUSES) {
          const { y, height } = sectionCache.current[status];
          if (y > 0 && height > 0 && moveY >= y && moveY <= y + height) {
            targetStatus = status;
            break;
          }
        }
        if (!targetStatus) {
          const measurements = await Promise.all(
            STATUSES.map(
              (status) =>
                new Promise<{ status: Task["status"]; y: number; height: number }>(
                  (resolve) => {
                    const ref = sectionRefs.current[status];
                    if (ref) {
                      ref.measureInWindow((x, y, width, height) =>
                        resolve({ status, y, height })
                      );
                    } else {
                      resolve({ status, y: 0, height: 0 });
                    }
                  }
                )
            )
          );
          for (const { status, y, height } of measurements) {
            if (moveY >= y && moveY <= y + height) {
              targetStatus = status;
              break;
            }
          }
        }
      }

      const currentTask = tasks.find((t) => t.id === taskId);
      if (targetStatus && currentTask && targetStatus !== currentTask.status) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
        );
        try {
          await updateTaskStatus(projectId, taskId, targetStatus);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (
            showTutorial && currentStep === DRAG_TASK_STEP &&
            taskId === firstTaskId && !taskDraggedOnce
          ) {
            setTaskDraggedOnce(true);
            setTimeout(() => nextStep(), 800);
          }
        } catch {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: currentTask.status } : t
            )
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "No se pudo mover la tarea");
        }
      }
      setDraggingTaskId(null);
      setDropTargetStatus(null);
    },
    [projectId, tasks, layoutMode, showTutorial, currentStep, firstTaskId, taskDraggedOnce, nextStep]
  );

  const handleAddTask = useCallback(
    async (
      status: Task["status"],
      taskData: {
        title: string;
        description: string;
        priority?: "Alta" | "Media" | "Baja";
        dueDate?: Date;
        startDate?: Date;
        reminderDate?: Date;
        reminderEnabled?: boolean;
        assignee?: string;
        labels?: Array<{ name: string; color: string }>;
      }
    ) => {
      try {
        const newTaskId = await createTask(projectId, { ...taskData, status });
        if (showTutorial && !firstTaskId && newTaskId) {
          setFirstTaskId(newTaskId);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error("Error creating task:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [projectId, showTutorial, firstTaskId]
  );

  const handleEditTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) setEditingTask(task);
    },
    [tasks]
  );

  const handleSaveEdit = useCallback(
    async (taskData: {
      title: string;
      description: string;
      priority?: "Alta" | "Media" | "Baja";
      dueDate?: Date;
      startDate?: Date;
      reminderDate?: Date;
      reminderEnabled?: boolean;
      assignee?: string;
      labels?: Array<{ name: string; color: string }>;
    }) => {
      if (!editingTask) return;
      try {
        await updateTask(projectId, editingTask.id, taskData);
        setEditingTask(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error("Error updating task:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [projectId, editingTask]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(projectId, taskId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [projectId]
  );

  const handleToggleSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    Alert.alert(
      "Eliminar tareas",
      `¿Eliminar ${selectedTaskIds.size} tarea(s) seleccionada(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(
                Array.from(selectedTaskIds).map((id) => deleteTask(projectId, id))
              );
              setSelectedTaskIds(new Set());
              setSelectionMode(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert("Error", "No se pudieron eliminar algunas tareas");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }, [selectedTaskIds, projectId]);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
    }
  }, [tasks, selectedTaskIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
    setSelectionMode(false);
  }, []);

  // ─── Modal unificado: cierra tanto creación como edición ──────────────────
  const handleModalClose = useCallback(() => {
    setEditingTask(null);
    setAddTaskModalVisible(false);
  }, []);

  // ─── Save unificado: detecta si es edición o creación ────────────────────
  const handleModalSave = useCallback(
    (taskData: {
      title: string;
      description: string;
      priority?: "Alta" | "Media" | "Baja";
      dueDate?: Date;
      startDate?: Date;
      reminderDate?: Date;
      reminderEnabled?: boolean;
      assignee?: string;
      labels?: Array<{ name: string; color: string }>;
    }) => {
      if (editingTask) {
        // Modo edición — handleSaveEdit ya llama setEditingTask(null)
        handleSaveEdit(taskData);
      } else {
        // Modo creación
        handleAddTask(selectedStatusForNewTask, taskData);
        setAddTaskModalVisible(false);
        if (showTutorial && currentStep === TASK_MODAL_LAST_STEP) {
          setTimeout(() => nextStep(), 300);
        }
      }
    },
    [editingTask, handleSaveEdit, handleAddTask, selectedStatusForNewTask, showTutorial, currentStep, nextStep]
  );

  const handleAddButtonPress = useCallback(() => {
    setSelectedStatusForNewTask("TODO");
    setAddTaskModalVisible(true);
    if (showTutorial && currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START && projectWelcomeDone) {
      setTimeout(() => nextStep(), 300);
    }
  }, [showTutorial, currentStep, projectWelcomeDone, nextStep]);

  const handleLayoutModeChange = useCallback(
    (mode: LayoutMode) => {
      setLayoutMode(mode);
      if (showTutorial && currentStep === SELECT_GRID_STEP && mode === "grid") {
        setTimeout(() => nextStep(), 500);
      }
    },
    [showTutorial, currentStep, nextStep]
  );

  // ─── Pulse animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (dropTargetStatus) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [dropTargetStatus, pulseAnim]);

  const colors = isDark ? Colors.dark : Colors.light;

  // ─── Medición secciones compact ────────────────────────────────────────────
  useEffect(() => {
    const measureAll = () => {
      STATUSES.forEach((status) => {
        const ref = sectionRefs.current[status];
        if (ref) {
          ref.measureInWindow((x, y, width, height) => {
            if (y > 0 && height > 0) sectionCache.current[status] = { y, height };
          });
        }
      });
    };
    measureAll();
    const timers = [
      setTimeout(measureAll, 100),
      setTimeout(measureAll, 300),
      setTimeout(measureAll, 600),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, [tasks, loading]);

  // ─── Firestore ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToTasks(projectId, (tasksData) => {
      setTasks(tasksData);
      setLoading(false);
    });
    return unsubscribe;
  }, [projectId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "projects", projectId), (docSnap) => {
      if (docSnap.exists()) setCurrentProject({ id: docSnap.id, ...docSnap.data() });
    });
    return unsubscribe;
  }, [projectId]);

  useEffect(() => {
    if (
      showTutorial &&
      currentStep === DRAG_TASK_STEP &&
      firstTaskId && tasks.some((t) => t.id === firstTaskId)
    ) {
      setTimeout(() => {
        if (firstTaskCardRef.current) {
          firstTaskCardRef.current.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
              setFirstTaskLayout({ x, y, width, height });
            }
          });
        }
      }, 500);
    }
  }, [showTutorial, currentStep, firstTaskId, tasks]);

  // ─── Medición columnas grid ────────────────────────────────────────────────
  useEffect(() => {
    if (layoutMode !== "grid") return;
    const measureAll = () => {
      STATUSES.forEach((status) => {
        const ref = gridSectionRefs.current[status];
        if (ref) {
          ref.measureInWindow((x, y, width, height) => {
            if (x > 0 && y > 0 && width > 0 && height > 0)
              gridSectionCache.current[status] = { x, y, width, height };
          });
        }
      });
    };
    measureAll();
    const interval = setInterval(measureAll, 100);
    const timers = [
      setTimeout(measureAll, 100), setTimeout(measureAll, 300),
      setTimeout(measureAll, 600), setTimeout(measureAll, 1000),
    ];
    return () => { clearInterval(interval); timers.forEach((t) => clearTimeout(t)); };
  }, [layoutMode, tasks, draggingTaskId]);

  useEffect(() => {
    if (currentStep < PROJECT_SCREEN_TUTORIAL_STEP_START) setProjectWelcomeDone(false);
  }, [currentStep]);

  // ─── Navigation header ─────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View
          ref={backBtnRef}
          collapsable={false}
          onLayout={measureBackButton}
        >
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </View>
      ),
      headerRight: () => (
        <View style={[
          styles.headerRight,
          isProjectScreenTutorialActive &&
            currentStep !== LAYOUT_SELECTOR_STEP &&
            currentStep !== SELECT_GRID_STEP
            ? { zIndex: 0 }
            : {},
        ]}>
          {!selectionMode ? (
            <>
              <View
                ref={layoutSelectorRef}
                collapsable={false}
                onLayout={() => {
                  setTimeout(() => {
                    layoutSelectorRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
                      if (width > 0 && height > 0) {
                        setLayoutSelectorLayout({ x: pageX, y: pageY, width, height });
                      }
                    });
                  }, 100);
                }}
                pointerEvents={
                  isProjectScreenTutorialActive &&
                    currentStep !== LAYOUT_SELECTOR_STEP &&
                    currentStep !== SELECT_GRID_STEP
                    ? "none"
                    : "auto"
                }
              >
                <LayoutSelector
                  currentLayout={layoutMode}
                  onLayoutChange={handleLayoutModeChange}
                  forceOpen={layoutSelectorForceOpen}
                  onOptionMeasure={handleOptionMeasure}
                  tutorialOverlay={layoutSelectorTutorialOverlay}
                />
              </View>
              <Pressable
                onPress={() => setSelectionMode(true)}
                disabled={isProjectScreenTutorialActive}
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    opacity: isProjectScreenTutorialActive ? 0.5 : 1,
                  },
                ]}
                hitSlop={8}
              >
                <Feather name="check-square" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => setProjectDetailsVisible(true)}
                disabled={isProjectScreenTutorialActive}
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isProjectScreenTutorialActive ? 0.5 : 1,
                  },
                ]}
                hitSlop={8}
              >
                <Feather name="info" size={18} color="#fff" />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleToggleSelectAll}
                style={[styles.headerButton, { backgroundColor: colors.info }]}
                hitSlop={8}
              >
                <Feather
                  name={selectedTaskIds.size === tasks.length ? "x-circle" : "check-circle"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
              <Pressable
                onPress={handleDeleteSelected}
                disabled={selectedTaskIds.size === 0}
                style={[
                  styles.headerButton,
                  {
                    backgroundColor:
                      selectedTaskIds.size > 0 ? colors.danger : colors.backgroundSecondary,
                    opacity: selectedTaskIds.size > 0 ? 1 : 0.5,
                  },
                ]}
                hitSlop={8}
              >
                <Feather name="trash-2" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={handleClearSelection}
                style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </>
          )}
        </View>
      ),
    });
  }, [
    navigation, layoutMode, colors, selectionMode, selectedTaskIds,
    tasks.length, isProjectScreenTutorialActive, currentStep,
    handleToggleSelectAll, handleDeleteSelected, handleClearSelection,
    handleLayoutModeChange, layoutSelectorLayout, measureBackButton,
  ]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  // ─── Helpers ref/layout primera tarea ──────────────────────────────────────
  const makeFirstTaskRef = (taskId: string, index: number) =>
    taskId === firstTaskId && index === 0 ? firstTaskCardRef : null;

  const makeFirstTaskOnLayout = (taskId: string, index: number) =>
    taskId === firstTaskId && index === 0
      ? () => {
        setTimeout(() => {
          firstTaskCardRef.current?.measure(
            (_x, _y, w, h, pageX, pageY) => {
              if (w > 0 && h > 0)
                setFirstTaskLayout({ x: pageX, y: pageY, width: w, height: h });
            }
          );
        }, 200);
      }
      : undefined;

  // ─── Modal unificado (compartido por las 3 vistas) ─────────────────────────
  const sharedTaskFormModal = (
    <TaskFormModal
      visible={addTaskModalVisible || editingTask !== null}
      task={editingTask}
      status={editingTask ? undefined : selectedStatusForNewTask}
      onClose={handleModalClose}
      onSave={handleModalSave}
      showTutorial={showTutorial}
      tutorialStep={currentStep}
      onTutorialNext={nextStep}
      onTutorialBack={prevStep}
      onTutorialSkip={skipTutorial}
    />
  );

  // ─── ProjectDetails modal compartido ──────────────────────────────────────
  const sharedProjectDetailsModal = currentProject ? (
    <ProjectDetailsModal
      visible={projectDetailsVisible}
      onClose={() => setProjectDetailsVisible(false)}
      project={currentProject}
      tasks={tasks}
      onDelete={async () => {
        try {
          await deleteProject(projectId);
          navigation.goBack();
        } catch {
          Alert.alert("Error", "No se pudo eliminar el proyecto");
        }
      }}
    />
  ) : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA READONLY
  // ═══════════════════════════════════════════════════════════════════════════
  if (layoutMode === "readonly") {
    const filteredTasks = tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        readonlyFilter === "ALL" || task.status === readonlyFilter;
      return matchesSearch && matchesFilter;
    });

    return (
      <ThemedView style={styles.container}>
        <View style={styles.readonlyHeader}>
          <View
            style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar tareas..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
            showsHorizontalScrollIndicator={false}
          >
            <Pressable
              onPress={() => setReadonlyFilter("ALL")}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    readonlyFilter === "ALL" ? colors.primary : colors.backgroundSecondary,
                  borderColor: readonlyFilter === "ALL" ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: readonlyFilter === "ALL" ? "#fff" : colors.text,
                  fontWeight: "600",
                }}
              >
                Todas ({tasks.length})
              </ThemedText>
            </Pressable>
            {STATUSES.map((status) => {
              const count = getTasksByStatus(status).length;
              const isActive = readonlyFilter === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setReadonlyFilter(status)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.backgroundSecondary,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={COLUMN_ICONS[status] as any}
                    size={14}
                    color={isActive ? "#fff" : colors.text}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: isActive ? "#fff" : colors.text, fontWeight: "600" }}
                  >
                    {COLUMN_TITLES[status]} ({count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.readonlyContent,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <View key={task.id} style={styles.readonlyTaskWrapper}>
                <View
                  style={[
                    styles.readonlyStatusBadge,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Feather
                    name={COLUMN_ICONS[task.status] as any}
                    size={12}
                    color={colors.primary}
                  />
                  <ThemedText type="small" style={{ fontSize: 11, fontWeight: "600" }}>
                    {COLUMN_TITLES[task.status]}
                  </ThemedText>
                </View>
                <View pointerEvents="none">
                  <TaskCard
                    task={task}
                    onDragStart={() => { }}
                    onDragEnd={() => { }}
                    onDelete={() => { }}
                    onEdit={() => { }}
                    onDragMove={() => { }}
                  />
                </View>
              </View>
            ))
          ) : (
            <View
              style={[styles.readonlyEmpty, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Feather
                name="inbox"
                size={48}
                color={colors.textSecondary}
                style={{ opacity: 0.5 }}
              />
              <ThemedText
                type="body"
                style={{ color: colors.textSecondary, marginTop: 12 }}
              >
                {searchQuery ? "No se encontraron tareas" : "No hay tareas"}
              </ThemedText>
              {searchQuery && (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  style={[styles.clearSearchButton, { backgroundColor: colors.primary }]}
                >
                  <ThemedText type="small" style={{ color: "#fff", fontWeight: "600" }}>
                    Limpiar búsqueda
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {sharedTaskFormModal}
        {sharedProjectDetailsModal}
      </ThemedView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA GRID
  // ═══════════════════════════════════════════════════════════════════════════
  if (layoutMode === "grid") {
    const columnWidth = (screenWidth - Spacing.md * 3) / 2;

    const renderGridColumn = (status: Task["status"]) => {
      const isDropTarget = dropTargetStatus === status;
      const statusTasks = getTasksByStatus(status);

      return (
        <View
          key={status}
          style={[styles.gridColumn, { width: columnWidth }]}
          ref={(ref) => {
            gridSectionRefs.current[status] = ref;
            if (ref) {
              setTimeout(() => {
                ref.measureInWindow((x, y, width, height) => {
                  gridSectionCache.current[status] = { x, y, width, height };
                });
              }, 100);
            }
          }}
          collapsable={false}
        >
          {draggingTaskId && (
            <View
              style={[
                styles.gridDropIndicatorTop,
                {
                  backgroundColor: isDropTarget ? colors.primary : colors.border,
                  opacity: isDropTarget ? 1 : 0.3,
                },
              ]}
            />
          )}

          <View
            style={[
              styles.gridColumnHeader,
              {
                backgroundColor: isDropTarget
                  ? colors.primary + "20"
                  : colors.backgroundSecondary,
                borderColor: isDropTarget ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Feather name={COLUMN_ICONS[status] as any} size={16} color={colors.primary} />
              <ThemedText type="body" style={{ fontWeight: "700", fontSize: 13 }}>
                {COLUMN_TITLES[status]}
              </ThemedText>
              <View style={[styles.gridCount, { backgroundColor: colors.backgroundTertiary }]}>
                <ThemedText type="small" style={{ fontSize: 10, fontWeight: "700" }}>
                  {statusTasks.length}
                </ThemedText>
              </View>
            </View>

            {status === "TODO" ? (
              <View ref={addBtnRef} collapsable={false}>
                <Pressable
                  onPress={handleAddButtonPress}
                  disabled={
                    currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START && !projectWelcomeDone
                  }
                  hitSlop={6}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    opacity:
                      currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START && !projectWelcomeDone
                        ? 0.3
                        : 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Feather name="plus" size={12} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setSelectedStatusForNewTask(status);
                  setAddTaskModalVisible(true);
                }}
                hitSlop={6}
                style={{ padding: 4 }}
              >
                <Feather name="plus" size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {draggingTaskId && (
            <Animated.View
              style={[
                styles.gridDropPlaceholder,
                {
                  backgroundColor: isDropTarget
                    ? colors.primary + "25"
                    : colors.backgroundSecondary,
                  borderColor: isDropTarget ? colors.primary : colors.border,
                  borderWidth: isDropTarget ? 3 : 1,
                  transform: isDropTarget ? [{ scale: pulseAnim }] : [],
                  minHeight: 60,
                },
              ]}
            >
              <Feather
                name={isDropTarget ? "corner-down-right" : "circle"}
                size={20}
                color={isDropTarget ? colors.primary : colors.textSecondary}
              />
              <ThemedText
                type="small"
                style={{
                  color: isDropTarget ? colors.primary : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: isDropTarget ? "700" : "500",
                }}
              >
                {isDropTarget ? "✓ Soltar aquí" : "Zona de caída"}
              </ThemedText>
            </Animated.View>
          )}

          <View style={styles.gridTasksWrapper}>
            <ScrollView
              style={styles.gridTasksScroll}
              contentContainerStyle={styles.gridTasksContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled={!draggingTaskId}
            >
              {statusTasks.map((task, index) => {
                const isBeingDragged = task.id === draggingTaskId;
                return (
                  <View
                    key={task.id}
                    ref={makeFirstTaskRef(task.id, index)}
                    style={[isBeingDragged && styles.draggingTaskPlaceholder]}
                    collapsable={false}
                    onLayout={makeFirstTaskOnLayout(task.id, index)}
                  >
                    <Pressable
                      onPress={() => selectionMode && handleToggleSelection(task.id)}
                      onLongPress={() => {
                        if (!selectionMode) {
                          setSelectionMode(true);
                          handleToggleSelection(task.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                      disabled={!selectionMode && draggingTaskId !== null}
                      style={{ position: "relative" }}
                    >
                      {selectionMode && (
                        <View
                          style={[
                            styles.selectionCheckbox,
                            {
                              backgroundColor: selectedTaskIds.has(task.id)
                                ? colors.primary
                                : colors.backgroundSecondary,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          {selectedTaskIds.has(task.id) && (
                            <Feather name="check" size={14} color="#fff" />
                          )}
                        </View>
                      )}
                      <View pointerEvents={selectionMode ? "none" : "auto"}>
                        <TaskCard
                          task={task}
                          compact={true}
                          onDragStart={() => handleTaskDragStart(task.id)}
                          onDragEnd={(gestureState) =>
                            handleTaskDragEnd(task.id, gestureState)
                          }
                          onDelete={() => handleDeleteTask(task.id)}
                          onEdit={() => handleEditTask(task.id)}
                          onDragMove={(moveX, moveY) =>
                            handleGridTaskDragMove(task.id, moveX, moveY)
                          }
                        />
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      );
    };

    return (
      <>
        <ThemedView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.gridContainer,
              { paddingTop: Spacing.md, paddingBottom: insets.bottom + Spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <View style={styles.gridRow}>
              {renderGridColumn("TODO")}
              {renderGridColumn("DOING")}
            </View>
            <View style={styles.gridRow}>
              {renderGridColumn("REVIEW")}
              {renderGridColumn("DONE")}
            </View>
          </ScrollView>

          {sharedTaskFormModal}
          {sharedProjectDetailsModal}
        </ThemedView>

        <Modal
          visible={
            isProjectScreenTutorialActive &&
            !loading &&
            localTutorialStep >= 0 &&
            localTutorialStep !== 2 &&
            (localTutorialStep < 5 || localTutorialStep === 10)
          }
          transparent
          animationType="none"
          statusBarTranslucent
          hardwareAccelerated
          presentationStyle="overFullScreen"
        >
          <TutorialOverlay
            step={localTutorialStep}
            steps={projectScreenTutorialSteps}
            onNext={() => {
              if (localTutorialStep === 0) setProjectWelcomeDone(true);
              else if (currentStep === EDIT_DELETE_TASK_STEP) nextStep();
              else if (currentStep === FINAL_STEP) {
                // Dashboard handles completion at step 23 — back button spotlight
                // already called nextStep() + goBack(), this is a safety fallback
                navigation.goBack();
              }
            }}
            onBack={prevStep}
            onSkip={skipTutorial}
            mascot={
              localTutorialStep === 0 ? 'wc' :
                localTutorialStep === 1 ? 'peep' :
                  localTutorialStep === 3 ? 'peep' :
                    localTutorialStep >= 4 && localTutorialStep <= 7 ? 'peepup' :
                      'none'
            }
            onSpotlightPress={
              localTutorialStep === 1 ? handleAddButtonPress :
                localTutorialStep === 4 ? () => nextStep() :
                  localTutorialStep === 10 ? () => { nextStep(); navigation.goBack(); } :
                    undefined
            }
          />
        </Modal>

        {isProjectScreenTutorialActive && !loading && localTutorialStep === 2 && (
          <TutorialOverlay
            step={localTutorialStep}
            steps={projectScreenTutorialSteps}
            onNext={() => { }}
            onBack={prevStep}
            onSkip={skipTutorial}
            bannerOnly
          />
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA COMPACT (por defecto)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.compactContainer,
            { paddingTop: Spacing.md, paddingBottom: insets.bottom + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {STATUSES.map((status) => {
            const statusTasks = getTasksByStatus(status);
            const draggingTask = draggingTaskId
              ? tasks.find((t) => t.id === draggingTaskId)
              : null;
            const isSourceColumn = draggingTask?.status === status;
            const isDropTarget = dropTargetStatus === status;

            return (
              <View
                key={status}
                style={[
                  styles.compactSection,
                  isSourceColumn && draggingTaskId && { opacity: 0.6 },
                ]}
                ref={(ref) => { sectionRefs.current[status] = ref; }}
                onLayout={() => {
                  const ref = sectionRefs.current[status];
                  if (ref) {
                    ref.measureInWindow((x, y, width, height) => {
                      sectionCache.current[status] = { y, height };
                    });
                  }
                }}
                collapsable={false}
              >
                {isSourceColumn && draggingTaskId && (
                  <View
                    style={[styles.sourceIndicator, { backgroundColor: colors.textSecondary }]}
                  >
                    <Feather name="arrow-up" size={12} color="#fff" />
                    <ThemedText
                      type="small"
                      style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}
                    >
                      Origen
                    </ThemedText>
                  </View>
                )}

                {draggingTaskId && (
                  <Animated.View
                    style={[
                      styles.dropIndicatorTop,
                      {
                        backgroundColor: isDropTarget ? colors.primary : colors.border,
                        opacity: isDropTarget ? 1 : 0.5,
                        transform: isDropTarget ? [{ scaleX: pulseAnim }] : [],
                      },
                    ]}
                  />
                )}

                <View style={styles.compactHeader}>
                  <View style={styles.compactHeaderLeft}>
                    <Feather
                      name={COLUMN_ICONS[status] as any}
                      size={20}
                      color={colors.primary}
                    />
                    <ThemedText type="h4" style={styles.compactTitle}>
                      {COLUMN_TITLES[status]}
                    </ThemedText>
                    <View
                      style={[styles.compactCount, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <ThemedText type="small" style={{ fontWeight: "600" }}>
                        {statusTasks.length}
                      </ThemedText>
                    </View>
                  </View>

                  {status === "TODO" ? (
                    <View ref={addBtnRef} collapsable={false}>
                      <Pressable
                        onPress={handleAddButtonPress}
                        disabled={
                          currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START &&
                          !projectWelcomeDone
                        }
                        hitSlop={8}
                        style={[
                          styles.addButton,
                          {
                            backgroundColor: colors.primary,
                            opacity:
                              currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START &&
                                !projectWelcomeDone
                                ? 0.3
                                : 1,
                          },
                        ]}
                      >
                        <Feather name="plus" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setSelectedStatusForNewTask(status);
                        setAddTaskModalVisible(true);
                      }}
                      disabled={currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START}
                      hitSlop={8}
                      style={[
                        styles.addButton,
                        {
                          backgroundColor: colors.primary,
                          opacity:
                            currentStep === PROJECT_SCREEN_TUTORIAL_STEP_START ? 0.3 : 1,
                        },
                      ]}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                    </Pressable>
                  )}
                </View>

                {draggingTaskId && (
                  <Animated.View
                    style={[
                      styles.dropPlaceholder,
                      {
                        backgroundColor: isDropTarget
                          ? colors.primary + "25"
                          : colors.backgroundSecondary,
                        borderColor: isDropTarget ? colors.primary : colors.border,
                        borderWidth: isDropTarget ? 2 : 1,
                        transform: isDropTarget ? [{ scale: pulseAnim }] : [],
                      },
                    ]}
                  >
                    <Feather
                      name={isDropTarget ? "corner-down-right" : "circle"}
                      size={20}
                      color={isDropTarget ? colors.primary : colors.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={{
                        color: isDropTarget ? colors.primary : colors.textSecondary,
                        fontWeight: isDropTarget ? "600" : "500",
                      }}
                    >
                      {isDropTarget ? "Soltar aquí" : "Zona de caída"}
                    </ThemedText>
                  </Animated.View>
                )}

                {statusTasks.length > 0 ? (
                  <View style={styles.compactTasksContainer}>
                    {statusTasks.map((task, index) => {
                      const isBeingDragged = task.id === draggingTaskId;
                      return (
                        <View
                          key={task.id}
                          ref={makeFirstTaskRef(task.id, index)}
                          style={[
                            styles.taskWrapper,
                            isBeingDragged && { height: 50, opacity: 0.4 },
                          ]}
                          collapsable={false}
                          onLayout={makeFirstTaskOnLayout(task.id, index)}
                        >
                          <Pressable
                            onPress={() => selectionMode && handleToggleSelection(task.id)}
                            onLongPress={() => {
                              if (!selectionMode) {
                                setSelectionMode(true);
                                handleToggleSelection(task.id);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              }
                            }}
                            disabled={!selectionMode && draggingTaskId !== null}
                            style={{ position: "relative" }}
                          >
                            {selectionMode && (
                              <View
                                style={[
                                  styles.selectionCheckbox,
                                  {
                                    backgroundColor: selectedTaskIds.has(task.id)
                                      ? colors.primary
                                      : colors.backgroundSecondary,
                                    borderColor: colors.border,
                                  },
                                ]}
                              >
                                {selectedTaskIds.has(task.id) && (
                                  <Feather name="check" size={14} color="#fff" />
                                )}
                              </View>
                            )}
                            <View pointerEvents={selectionMode ? "none" : "auto"}>
                              <TaskCard
                                task={task}
                                compact={true}
                                onDragStart={() => handleTaskDragStart(task.id)}
                                onDragEnd={(gestureState) =>
                                  handleTaskDragEnd(task.id, gestureState)
                                }
                                onDelete={() => handleDeleteTask(task.id)}
                                onEdit={() => handleEditTask(task.id)}
                                onDragMove={(moveX, moveY) =>
                                  handleGridTaskDragMove(task.id, moveX, moveY)
                                }
                              />
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  !draggingTaskId && (
                    <View
                      style={[
                        styles.emptyStateCompact,
                        { backgroundColor: colors.backgroundSecondary },
                      ]}
                    >
                      <Feather
                        name="inbox"
                        size={24}
                        color={colors.textSecondary}
                        style={{ opacity: 0.5 }}
                      />
                      <ThemedText
                        type="small"
                        style={{ color: colors.textSecondary, fontSize: 12 }}
                      >
                        Sin tareas
                      </ThemedText>
                    </View>
                  )
                )}

                {draggingTaskId && (
                  <Animated.View
                    style={[
                      styles.dropIndicatorBottom,
                      {
                        backgroundColor: isDropTarget ? colors.primary : colors.border,
                        opacity: isDropTarget ? 1 : 0.5,
                        transform: isDropTarget ? [{ scaleX: pulseAnim }] : [],
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {sharedTaskFormModal}
        {sharedProjectDetailsModal}
      </ThemedView>

      <Modal
        visible={
          isProjectScreenTutorialActive &&
          !loading &&
          localTutorialStep >= 0 &&
          localTutorialStep !== 2 &&
          (localTutorialStep < 5 || localTutorialStep === 10)
        }
        transparent
        animationType="none"
        statusBarTranslucent
        hardwareAccelerated
        presentationStyle="overFullScreen"
      >
        <TutorialOverlay
          step={localTutorialStep}
          steps={projectScreenTutorialSteps}
          onNext={() => {
            if (localTutorialStep === 0) setProjectWelcomeDone(true);
            else if (currentStep === EDIT_DELETE_TASK_STEP) nextStep();
            else if (currentStep === FINAL_STEP) {
              // Dashboard handles completion at step 23 — back button spotlight
              // already called nextStep() + goBack(), this is a safety fallback
              navigation.goBack();
            }
          }}
          onBack={prevStep}
          onSkip={skipTutorial}
          mascot={
            localTutorialStep === 0 ? 'wc' :
              localTutorialStep === 1 ? 'peep' :
                localTutorialStep === 3 ? 'peep' :
                  localTutorialStep >= 4 && localTutorialStep <= 7 ? 'peepup' :
                    'none'
          }
          onSpotlightPress={
            localTutorialStep === 1 ? handleAddButtonPress :
              localTutorialStep === 4 ? () => nextStep() :
                localTutorialStep === 10 ? () => { nextStep(); navigation.goBack(); } :
                  undefined
          }
        />
      </Modal>

      {isProjectScreenTutorialActive && !loading && localTutorialStep === 2 && (
        <TutorialOverlay
          step={localTutorialStep}
          steps={projectScreenTutorialSteps}
          onNext={() => { }}
          onBack={prevStep}
          onSkip={skipTutorial}
          bannerOnly
        />
      )}
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 12, alignItems: "center" },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Grid ────────────────────────────────────────────────────────────────────
  gridContainer: { paddingHorizontal: Spacing.md },
  gridRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md },
  gridColumn: { backgroundColor: "transparent", flex: 1, minHeight: 400 },
  gridColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    zIndex: 1,
  },
  gridCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: "center",
  },
  gridTasksWrapper: { flex: 1 },
  gridTasksScroll: { flex: 1 },
  gridTasksContent: { paddingBottom: 8, gap: 8 },
  draggingTaskPlaceholder: { opacity: 0.3, height: 60 },
  gridDropIndicatorTop: { height: 3, borderRadius: 2, marginBottom: 6, zIndex: 50 },
  gridDropPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    zIndex: 50,
  },
  // ── Compact ─────────────────────────────────────────────────────────────────
  compactContainer: { padding: Spacing.md },
  compactSection: { marginBottom: Spacing.lg, position: "relative" },
  compactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  compactHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  compactTitle: { fontSize: 20, fontWeight: "700" },
  compactCount: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: "center",
  },
  compactTasksContainer: {},
  taskWrapper: {},
  emptyStateCompact: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dropPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  dropIndicatorTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    zIndex: 100,
  },
  dropIndicatorBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    zIndex: 100,
  },
  sourceIndicator: {
    position: "absolute",
    top: -8,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
  },
  // ── Readonly ─────────────────────────────────────────────────────────────────
  readonlyHeader: { padding: Spacing.md, gap: Spacing.md },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterScroll: { flexGrow: 0 },
  filterScrollContent: { gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  readonlyContent: { padding: Spacing.md },
  readonlyTaskWrapper: { marginBottom: Spacing.md, position: "relative" },
  readonlyStatusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  readonlyEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl * 2,
    borderRadius: BorderRadius.lg,
    minHeight: 300,
  },
  clearSearchButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  // ── Selection ────────────────────────────────────────────────────────────────
  selectionCheckbox: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});