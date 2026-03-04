import React, { useState, useRef, ReactNode } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Colors } from "@/constants/theme";

export type LayoutMode = "grid" | "readonly" | "compact";

interface LayoutSelectorProps {
  currentLayout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  onButtonLayout?: (layout: { cx: number; cy: number; width: number; height: number }) => void;
  // ── Tutorial props ──────────────────────────────────────────────────────────
  /** Mantiene el modal abierto (durante el tutorial) */
  forceOpen?: boolean;
  /** Overlay del tutorial renderizado dentro del Modal, encima de las opciones */
  tutorialOverlay?: ReactNode;
  /** Callback para que el padre reciba las posiciones de cada opción */
  onOptionMeasure?: (mode: LayoutMode, layout: { x: number; y: number; width: number; height: number }) => void;
}

export const LAYOUT_OPTIONS = [
  {
    mode: "compact" as LayoutMode,
    icon: "list",
    title: "Compacto",
    description: "Vista vertical con todas las tareas (Principal)",
  },
  {
    mode: "grid" as LayoutMode,
    icon: "grid",
    title: "Cuadrícula",
    description: "Columnas lado a lado en formato Kanban",
  },
  {
    mode: "readonly" as LayoutMode,
    icon: "search",
    title: "Solo Lectura",
    description: "Buscar y ver tareas sin editar",
  },
];

export function LayoutSelector({
  currentLayout,
  onLayoutChange,
  onButtonLayout,
  forceOpen = false,
  tutorialOverlay,
  onOptionMeasure,
}: LayoutSelectorProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [modalVisible, setModalVisible] = useState(false);

  const btnRef = useRef<View>(null);

  const measureBtn = () => {
    btnRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      if (w > 0 && h > 0 && onButtonLayout) {
        onButtonLayout({
          cx: pageX + w / 2,
          cy: pageY + h / 2,
          width: w,
          height: h,
        });
      }
    });
  };

  const isOpen = modalVisible || forceOpen;

  const handleSelect = (mode: LayoutMode) => {
    onLayoutChange(mode);
    setModalVisible(false);
  };

  const currentOption = LAYOUT_OPTIONS.find((opt) => opt.mode === currentLayout);

  return (
    <>
      <View
        ref={btnRef}
        collapsable={false}
        onLayout={() => {
          setTimeout(measureBtn, 300);
        }}
      >
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.button, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={8}
        >
          <Feather
            name={(currentOption?.icon as any) || "layout"}
            size={18}
            color={colors.text}
          />
        </Pressable>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !forceOpen && setModalVisible(false)}
      >
        {/* Backdrop — solo cierra si NO está en modo tutorial */}
        <Pressable
          style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={() => !forceOpen && setModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Seleccionar vista</ThemedText>
              {!forceOpen && (
                <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {LAYOUT_OPTIONS.map((option) => {
                const isSelected = currentLayout === option.mode;
                return (
                  <View
                    key={option.mode}
                    collapsable={false}
                    onLayout={() => {
                      // Pequeño delay para que el modal termine de posicionarse
                      setTimeout(() => {
                        // measureInWindow no existe en View directamente, usamos ref trick
                      }, 200);
                    }}
                    ref={(ref) => {
                      if (ref && onOptionMeasure) {
                        setTimeout(() => {
                          ref.measureInWindow((x, y, width, height) => {
                            if (width > 0 && height > 0) {
                              onOptionMeasure(option.mode, { x, y, width, height });
                            }
                          });
                        }, 50);
                      }
                    }}
                  >
                    <Pressable
                      onPress={() => handleSelect(option.mode)}
                      style={[
                        styles.option,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + "20"
                            : colors.backgroundSecondary,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.optionLeft}>
                        <View
                          style={[
                            styles.iconContainer,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.backgroundTertiary,
                            },
                          ]}
                        >
                          <Feather
                            name={option.icon as any}
                            size={20}
                            color={isSelected ? "#fff" : colors.text}
                          />
                        </View>
                        <View style={styles.optionText}>
                          <ThemedText type="body" style={styles.optionTitle}>
                            {option.title}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            style={[styles.optionDescription, { color: colors.textSecondary }]}
                          >
                            {option.description}
                          </ThemedText>
                        </View>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                          <Feather name="check" size={16} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>

        {/* Tutorial overlay renderizado DENTRO del Modal — queda encima de las opciones */}
        {tutorialOverlay}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionText: { flex: 1 },
  optionTitle: { fontWeight: "600", marginBottom: 4 },
  optionDescription: { fontSize: 13, lineHeight: 18 },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});