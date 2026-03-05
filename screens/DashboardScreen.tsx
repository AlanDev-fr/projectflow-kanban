import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ProjectModal, MODAL_TUTORIAL_STEP_OFFSET, MODAL_TUTORIAL_STEP_COUNT } from "@/components/ProjectModal";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme, type ThemePreference } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTutorial } from "@/src/contexts/Tutorialcontext";
import TutorialOverlay from "@/components/Tutorialoverlay";
import {
  Project,
  subscribeToProjects,
  subscribeToTasks,
  createProject,
  updateProject,
  deleteProject,
  Task,
} from "@/src/services/firestore";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootNavigator";

type DashboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;

interface ProjectWithCounts extends Project {
  taskCounts?: {
    todo: number;
    doing: number;
    review: number;
    done: number;
    total: number;
  };
}

// ─── Tutorial step constants ──────────────────────────────────────────────────
//  Step 0  → Dashboard  : Welcome
//  Step 1  → Dashboard  : FAB spotlight
//  Step 2  → Modal      : Title field
//  Step 3  → Modal      : Description field
//  Step 4  → Modal      : Icon + Color
//  Step 5  → Modal      : "Crear proyecto" button
//  Step 6  → Dashboard  : "Abrir proyecto" button  ← DASHBOARD_STEP_6
const DASHBOARD_STEP_6 = MODAL_TUTORIAL_STEP_OFFSET + MODAL_TUTORIAL_STEP_COUNT;
const TUTORIAL_COMPLETE_STEP = 23;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── StatsCard ────────────────────────────────────────────────────────────────
function StatsCard({ projects }: { projects: ProjectWithCounts[] }) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const totalTasks = projects.reduce((acc, p) => acc + (p.taskCounts?.total || 0), 0);
  const todoTasks = projects.reduce((acc, p) => acc + (p.taskCounts?.todo || 0), 0);
  const doingTasks = projects.reduce((acc, p) => acc + (p.taskCounts?.doing || 0), 0);
  const doneTasks = projects.reduce((acc, p) => acc + (p.taskCounts?.done || 0), 0);
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }, Shadows.card]}>
      <View style={styles.statsHeader}>
        <Feather name="trending-up" size={20} color={colors.primary} />
        <ThemedText type="body" style={{ fontWeight: "600" }}>Resumen General</ThemedText>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="inbox" size={18} color={colors.primary} />
          </View>
          <ThemedText type="h3" style={{ marginTop: 8 }}>{totalTasks}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>Total</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.warning + "20" }]}>
            <Feather name="circle" size={18} color={colors.warning} />
          </View>
          <ThemedText type="h3" style={{ marginTop: 8 }}>{todoTasks}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>Por hacer</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.info + "20" }]}>
            <Feather name="zap" size={18} color={colors.info} />
          </View>
          <ThemedText type="h3" style={{ marginTop: 8 }}>{doingTasks}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>En proceso</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check-circle" size={18} color={colors.success} />
          </View>
          <ThemedText type="h3" style={{ marginTop: 8 }}>{doneTasks}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>Completadas</ThemedText>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Progreso general
          </ThemedText>
          <ThemedText type="body" style={{ fontWeight: "700", color: colors.success }}>
            {`${completionRate}%`}
          </ThemedText>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.backgroundSecondary }]}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: colors.success, width: `${completionRate}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────
interface ProjectCardProps {
  project: ProjectWithCounts;
  onEnter: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Reports the absolute layout of the whole card (for tutorial card spotlight) */
  onCardLayout?: (layout: { cx: number; cy: number; w: number; h: number }) => void;
  /** Reports the absolute layout of the "Abrir proyecto" button (for tutorial step 6) */
  onEnterButtonLayout?: (layout: { cx: number; cy: number; w: number; h: number }) => void;
}

function ProjectCard({
  project,
  onEnter,
  onEdit,
  onDelete,
  onCardLayout,
  onEnterButtonLayout,
}: ProjectCardProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);
  const cardRef = useRef<View>(null);
  const enterBtnRef = useRef<View>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () =>
    (scale.value = withSpring(0.98, { damping: 15, stiffness: 150 }));
  const handlePressOut = () =>
    (scale.value = withSpring(1, { damping: 15, stiffness: 150 }));

  const handleDelete = () => {
    Alert.alert(
      "Eliminar proyecto",
      `¿Estás seguro de que quieres eliminar "${project.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: onDelete },
      ]
    );
  };

  // Measure the whole card
  const measureCard = () => {
    if (!onCardLayout) return;
    cardRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      if (w > 0) onCardLayout({ cx: pageX + w / 2, cy: pageY + h / 2, w, h });
    });
  };

  // Measure the "Abrir proyecto" button (used for tutorial step 6)
  useEffect(() => {
    if (!onEnterButtonLayout) return;
    const timer = setTimeout(() => {
      enterBtnRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
        if (w > 0)
          onEnterButtonLayout({ cx: pageX + w / 2, cy: pageY + h / 2, w, h });
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [onEnterButtonLayout]);

  const counts = project.taskCounts || { todo: 0, doing: 0, review: 0, done: 0, total: 0 };
  const progress = counts.total > 0 ? (counts.done / counts.total) * 100 : 0;

  return (
    <AnimatedPressable
      ref={cardRef}
      onPress={onEnter}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={measureCard}
      style={[
        styles.projectCard,
        { backgroundColor: colors.cardBackground },
        Shadows.card,
        animatedStyle,
      ]}
    >
      <View style={styles.projectCardHeader}>
        <View
          style={[
            styles.projectIcon,
            { backgroundColor: (project.color || colors.primary) + "15" },
          ]}
        >
          <Feather
            name={(project.icon as any) || "folder"}
            size={24}
            color={project.color || colors.primary}
          />
        </View>
        <View style={styles.projectActions}>
          <Pressable onPress={onEdit} style={styles.actionButton} hitSlop={8}>
            <Feather name="edit-2" size={18} color={colors.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionButton} hitSlop={8}>
            <Feather name="trash-2" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ThemedText type="h4" style={styles.projectTitle} numberOfLines={2}>
        {project.title}
      </ThemedText>

      <View style={styles.projectProgress}>
        <View style={styles.projectProgressHeader}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {`${counts.done} de ${counts.total} completadas`}
          </ThemedText>
          <ThemedText type="small" style={{ fontWeight: "700", color: colors.primary }}>
            {`${Math.round(progress)}%`}
          </ThemedText>
        </View>
        <View
          style={[styles.projectProgressBar, { backgroundColor: colors.backgroundSecondary }]}
        >
          <View
            style={[
              styles.projectProgressFill,
              { backgroundColor: colors.primary, width: `${progress}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.taskCounts}>
        <View style={styles.taskCountItem}>
          <View style={[styles.taskCountDot, { backgroundColor: colors.warning }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{counts.todo}</ThemedText>
        </View>
        <View style={styles.taskCountItem}>
          <View style={[styles.taskCountDot, { backgroundColor: colors.info }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{counts.doing}</ThemedText>
        </View>
        <View style={styles.taskCountItem}>
          <View style={[styles.taskCountDot, { backgroundColor: colors.secondary }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{counts.review}</ThemedText>
        </View>
        <View style={styles.taskCountItem}>
          <View style={[styles.taskCountDot, { backgroundColor: colors.success }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{counts.done}</ThemedText>
        </View>
      </View>

      {/* "Abrir proyecto" button — ref measured for step-6 spotlight */}
      <View ref={enterBtnRef} collapsable={false}>
        <View style={[styles.enterButton, { backgroundColor: project.color || colors.primary }]}>
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
            Abrir proyecto
          </ThemedText>
          <Feather name="arrow-right" size={16} color="#fff" />
        </View>
      </View>
    </AnimatedPressable>
  );
}

// ─── DashboardScreen ──────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme, isDark, themePreference, setThemePreference, themeKey } = useTheme();
  const { user, logout } = useAuth();
  const {
    showTutorial,
    currentStep,
    nextStep,
    prevStep,
    skipTutorial,
    restartTutorial,
    completeTutorial,
  } = useTutorial();

  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<ProjectWithCounts | null>(null);

  const colors = isDark ? Colors.dark : Colors.light;
  const screenWidth = Dimensions.get("window").width;
  const isTablet = screenWidth >= 768;

  // ─── FAB layout (step 1 spotlight) ───────────────────────────────────────
  const fabRef = useRef<View>(null);
  const [fabLayout, setFabLayout] = useState({ x: 0, y: 0, width: 60, height: 60 });

  const settingsBtnRef = useRef<View>(null);
  const [settingsLayout, setSettingsLayout] = useState({
    x: 0, y: 0, width: 36, height: 36,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      settingsBtnRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
        if (w > 0) setSettingsLayout({ x: pageX, y: pageY, width: w, height: h });
      });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fabRef.current) {
      setTimeout(() => {
        fabRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setFabLayout({ x: pageX, y: pageY, width, height });
        });
      }, 500);
    }
  }, []);

  // ─── Last-created project tracking (steps 5 → 6) ─────────────────────────
  const [lastCreatedProjectId, setLastCreatedProjectId] = useState<string | null>(null);

  // Step 6 spotlight: "Abrir proyecto" button of the newly created project
  const [enterButtonLayout, setEnterButtonLayout] = useState({
    cx: screenWidth / 2,
    cy: Dimensions.get("window").height * 0.75,
    w: screenWidth - 80,
    h: 48,
  });

  // ─── Dashboard tutorial steps ─────────────────────────────────────────────
  // localStep 0 → global 0 (welcome)
  // localStep 1 → global 1 (FAB)
  // localStep 2 → global 6 (Abrir proyecto)
  const dashboardTutorialSteps = [
    {
      targetX: screenWidth / 2,
      targetY: Dimensions.get("window").height / 2 - 100,
      targetWidth: 200,
      targetHeight: 200,
      title: "¡Bienvenido a ProjectFlow!",
      description: "¿Quieres seguir un tutorial rápido para aprender a usar la aplicación?",
      shape: "circle" as const,
    },
    {
      targetX: fabLayout.x + fabLayout.width / 2,
      targetY: fabLayout.y + fabLayout.height / 2,
      targetWidth: 80,
      targetHeight: 80,
      title: "Crea tu primer proyecto",
      description: "Presiona el botón + para crear un nuevo proyecto y empezar a organizar tus tareas.",
      shape: "circle" as const,
      canNext: false,
    },
    {
      targetX: enterButtonLayout.cx,
      targetY: enterButtonLayout.cy,
      targetWidth: enterButtonLayout.w,
      targetHeight: enterButtonLayout.h,
      title: "¡Tu proyecto está listo!",
      description: "Presiona 'Abrir proyecto' para comenzar a añadir tareas.",
      shape: "rect" as const,
      allowInteraction: true,
      canNext: false,
    },
    {
      targetX: settingsLayout.x + settingsLayout.width / 2,
      targetY: settingsLayout.y + settingsLayout.height / 2,
      targetWidth: settingsLayout.width + 20,
      targetHeight: settingsLayout.height + 20,
      title: "¡Tutorial completado!",
      description: "Ya dominas ProjectFlow. Desde este botón de opciones puedes cambiar el tema de la app o repetir el tutorial cuando quieras. ¡Mucho éxito!",
      shape: "circle" as const,
      allowInteraction: false,
      canNext: true,
    },
  ];

  const getDashboardLocalStep = (): number => {
    if (currentStep === 0) return 0;
    if (currentStep === 1) return 1;
    if (currentStep === DASHBOARD_STEP_6) return 2;
    if (currentStep === TUTORIAL_COMPLETE_STEP) return 3;
    return -1;
  };
  const dashboardLocalStep = getDashboardLocalStep();

  const showDashboardOverlay =
    showTutorial &&
    !loading &&
    (currentStep === 0 || currentStep === 1 || currentStep === DASHBOARD_STEP_6 || currentStep === TUTORIAL_COMPLETE_STEP);

  // ─── handleSaveProject ────────────────────────────────────────────────────
  const handleSaveProject = async (data: {
    title: string;
    description: string;
    color: string;
    icon: string;
  }) => {
    if (!user) return;
    try {
      if (modalMode === "create") {
        const newProjectId = await createProject(data.title, user.uid, {
          description: data.description,
          color: data.color,
          icon: data.icon,
        });
        // If we're on the last modal tutorial step, remember this project id
        const isLastModalStep =
          showTutorial &&
          currentStep === MODAL_TUTORIAL_STEP_OFFSET + MODAL_TUTORIAL_STEP_COUNT - 1;
        if (isLastModalStep && newProjectId) {
          setLastCreatedProjectId(newProjectId);
        }
      } else if (editingProject) {
        await updateProject(editingProject.id, {
          title: data.title,
          description: data.description,
          color: data.color,
          icon: data.icon,
        });
      }
      setModalVisible(false);
      setEditingProject(null);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el proyecto");
    }
  };

  // ─── Firestore subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];
    const taskCountsMap = new Map<
      string,
      { todo: number; doing: number; review: number; done: number; total: number }
    >();

    const unsubscribeProjects = subscribeToProjects(user.uid, (projectsData) => {
      unsubscribers.forEach((u) => u());
      unsubscribers.length = 0;

      if (projectsData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      projectsData.forEach((project) => {
        const unsub = subscribeToTasks(project.id, (tasks: Task[]) => {
          const counts = { todo: 0, doing: 0, review: 0, done: 0, total: 0 };
          tasks.forEach((task) => {
            counts.total++;
            switch (task.status) {
              case "TODO": counts.todo++; break;
              case "DOING": counts.doing++; break;
              case "REVIEW": counts.review++; break;
              case "DONE": counts.done++; break;
            }
          });
          taskCountsMap.set(project.id, counts);
          setProjects(
            projectsData.map((p) => ({
              ...p,
              taskCounts: taskCountsMap.get(p.id) || {
                todo: 0, doing: 0, review: 0, done: 0, total: 0,
              },
            }))
          );
          setLoading(false);
        });
        unsubscribers.push(unsub);
      });
    });

    return () => {
      unsubscribeProjects();
      unsubscribers.forEach((u) => u());
    };
  }, [user]);

  // ─── When new project appears in list, advance to step 6 ─────────────────
  // After the user presses "Crear proyecto" (step 5), Firestore returns the
  // new project. Once it's in the list we advance to step 6.
  useEffect(() => {
    const isOnLastModalStep =
      showTutorial &&
      currentStep === MODAL_TUTORIAL_STEP_OFFSET + MODAL_TUTORIAL_STEP_COUNT - 1;

    if (
      isOnLastModalStep &&
      lastCreatedProjectId &&
      projects.some((p) => p.id === lastCreatedProjectId)
    ) {
      const t = setTimeout(() => nextStep(), 600); // → step 6
      return () => clearTimeout(t);
    }
  }, [projects, lastCreatedProjectId, currentStep, showTutorial]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleFABPress = () => {
    setModalMode("create");
    setEditingProject(null);
    setModalVisible(true);
    if (showTutorial && currentStep === 1) {
      // Advance to step 2 so ProjectModal's tutorial takes over
      setTimeout(() => nextStep(), 500);
    }
  };

  const handleEditProject = (project: ProjectWithCounts) => {
    setEditingProject(project);
    setModalMode("edit");
    setModalVisible(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
    } catch {
      Alert.alert("Error", "No se pudo eliminar el proyecto");
    }
  };

  /** Navigate to project and advance to step 7 (ProjectScreen tutorial) */
  const handleEnterProject = (project: ProjectWithCounts) => {
    // CAMBIO CRÍTICO: Avanzar al step 7 en lugar de completar
    if (showTutorial && currentStep === DASHBOARD_STEP_6) {
      nextStep(); // → step 7 (ProjectScreen)
    }
    navigation.navigate("Project", {
      projectId: project.id,
      projectTitle: project.title,
    });
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: logout },
    ]);
  };

  // ─── Empty state ──────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundSecondary }]}
      >
        <Feather name="inbox" size={48} color={colors.textSecondary} />
      </View>
      <ThemedText type="h3" style={[styles.emptyTitle, { color: colors.text }]}>
        Sin proyectos aún
      </ThemedText>
      <ThemedText type="body" style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Crea tu primer proyecto para empezar a organizar tus tareas
      </ThemedText>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={20} color="#fff" />
        <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
          Crear proyecto
        </ThemedText>
      </Pressable>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <ThemedView style={styles.container}>
        <View
          key={themeKey}
          style={[
            styles.header,
            {
              paddingTop: insets.top + Spacing.lg,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <View>
              <ThemedText type="h3">Mis Proyectos</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {user?.email}
              </ThemedText>
            </View>
          </View>
          <Pressable
            ref={settingsBtnRef}
            onPress={() => setSettingsModalVisible(true)}
            style={styles.settingsButton}
            hitSlop={8}
          >
            <Feather name="settings" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
          >
            {projects.length > 0 && (
              <View style={styles.statsContainer}>
                <StatsCard projects={projects} />
              </View>
            )}

            {projects.length > 0 && (
              <View style={styles.sectionHeader}>
                <ThemedText type="h4">Tus Proyectos</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {`${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}`}
                </ThemedText>
              </View>
            )}

            {projects.length > 0 ? (
              <View style={[styles.projectsGrid, isTablet && styles.projectsGridTablet]}>
                {projects.map((project) => {
                  const isNewProject = project.id === lastCreatedProjectId;
                  return (
                    <View
                      key={project.id}
                      style={[
                        styles.projectCardWrapper,
                        isTablet && styles.projectCardWrapperTablet,
                      ]}
                    >
                      <ProjectCard
                        project={project}
                        onEnter={() => handleEnterProject(project)}
                        onEdit={() => handleEditProject(project)}
                        onDelete={() => handleDeleteProject(project.id)}
                        onCardLayout={
                          isNewProject
                            ? (layout) =>
                              setEnterButtonLayout({
                                cx: layout.cx,
                                cy: layout.cy,
                                w: layout.w,
                                h: layout.h,
                              })
                            : undefined
                        }
                        onEnterButtonLayout={
                          isNewProject
                            ? (layout) => setEnterButtonLayout(layout)
                            : undefined
                        }
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              renderEmptyState()
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <Pressable
          ref={fabRef}
          onPress={handleFABPress}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + Spacing.xl,
              zIndex: 10000,
            },
            Shadows.fab,
          ]}
        >
          <Feather name="plus" size={28} color="#fff" />
        </Pressable>

        <ProjectModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingProject(null);
            setModalMode("create");
          }}
          onSave={handleSaveProject}
          initialData={
            editingProject
              ? {
                title: editingProject.title,
                description: editingProject.description || "",
                color: editingProject.color || "#3B82F6",
                icon: editingProject.icon || "folder",
              }
              : undefined
          }
          mode={modalMode}
          showTutorial={showTutorial}
          tutorialStep={currentStep}
          onTutorialNext={nextStep}
          onTutorialBack={prevStep}
          onTutorialSkip={skipTutorial}
        />

        {/* Settings modal */}
        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            onPress={() => setSettingsModalVisible(false)}
          >
            <Pressable
              style={[styles.settingsModalContent, { backgroundColor: colors.cardBackground }]}
              onPress={() => { }}
            >
              <ThemedText type="h3" style={styles.modalTitle}>
                Configuración
              </ThemedText>

              <View style={styles.settingsSection}>
                <ThemedText
                  type="body"
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  Tema
                </ThemedText>

                {(["light", "dark", "system"] as const).map((pref) => {
                  const icons = {
                    light: "sun",
                    dark: "moon",
                    system: "smartphone",
                  } as const;
                  const labels = { light: "Claro", dark: "Oscuro", system: "Sistema" };
                  return (
                    <Pressable
                      key={pref}
                      onPress={() => setThemePreference(pref)}
                      style={[
                        styles.settingsOption,
                        {
                          backgroundColor:
                            themePreference === pref
                              ? colors.backgroundTertiary
                              : colors.backgroundSecondary,
                          borderColor:
                            themePreference === pref ? colors.primary : colors.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Feather
                        name={icons[pref]}
                        size={20}
                        color={
                          themePreference === pref
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <ThemedText type="body">{labels[pref]}</ThemedText>
                      {themePreference === pref && (
                        <Feather name="check" size={20} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => {
                  setLastCreatedProjectId(null);
                  setSettingsModalVisible(false);
                  restartTutorial();
                }}
                style={[
                  styles.settingsOption,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Feather name="help-circle" size={20} color={colors.primary} />
                <ThemedText type="body">Repetir tutorial</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  setSettingsModalVisible(false);
                  handleLogout();
                }}
                style={[styles.logoutOptionButton, { backgroundColor: colors.danger }]}
              >
                <Feather name="log-out" size={20} color="#fff" />
                <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                  Cerrar sesión
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setSettingsModalVisible(false)}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <ThemedText type="body">Cerrar</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>

      {/*
       * TutorialOverlay outside ThemedView for maximum z-index.
       * Renders only during Dashboard steps: 0, 1 and 6.
       * Steps 2-5 are handled inside ProjectModal.
       */}
      {showDashboardOverlay && dashboardLocalStep >= 0 && (
        <TutorialOverlay
          step={dashboardLocalStep}
          steps={dashboardTutorialSteps}
          onNext={() => {
            if (dashboardLocalStep === 3) completeTutorial();
            else nextStep();
          }}
          onBack={prevStep}
          onSkip={skipTutorial}
          mascot={
            dashboardLocalStep === 0 ? 'wc' :
              dashboardLocalStep === 1 ? 'peep' :
                dashboardLocalStep === 2 ? 'peepup' :
                  dashboardLocalStep === 3 ? 'wc' :
                    'none'
          }
          isCompletionStep={dashboardLocalStep === 3}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  settingsButton: { padding: Spacing.sm },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: Spacing.xl },
  statsContainer: { marginTop: Spacing.md, marginBottom: Spacing.xl },
  statsCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: { flex: 1, minWidth: "22%", alignItems: "center" },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  progressSection: { marginTop: Spacing.md },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  projectsGrid: { gap: Spacing.lg },
  projectsGridTablet: { flexDirection: "row", flexWrap: "wrap" },
  projectCardWrapper: { width: "100%" },
  projectCardWrapperTablet: { width: "48%" },
  projectCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg },
  projectCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  projectActions: { flexDirection: "row", gap: Spacing.sm },
  actionButton: { padding: Spacing.xs },
  projectTitle: { marginBottom: Spacing.lg },
  projectProgress: { marginBottom: Spacing.lg },
  projectProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  projectProgressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  projectProgressFill: { height: "100%", borderRadius: 3 },
  taskCounts: { flexDirection: "row", gap: Spacing.lg, marginBottom: Spacing.lg },
  taskCountItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  taskCountDot: { width: 8, height: 8, borderRadius: 4 },
  enterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: { marginBottom: Spacing.sm },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalTitle: { marginBottom: Spacing.xl },
  settingsModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
  },
  settingsSection: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
    fontWeight: "600",
  },
  settingsOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  logoutOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
  },
  closeButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
});