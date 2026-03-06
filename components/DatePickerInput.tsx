import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface DatePickerInputProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minimumDate?: Date;
  icon?: string;
}

export function DatePickerInput({
  label,
  value,
  onChange,
  minimumDate = new Date(),
  icon = "calendar"
}: DatePickerInputProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }

    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        onChange(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShow(false);
  };

  const handleCancel = () => {
    setTempDate(value || new Date());
    setShow(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setShow(true)}
          style={[
            styles.dateButton,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: value ? colors.primary : colors.border
            }
          ]}
        >
          <Feather name={icon as any} size={18} color={value ? colors.primary : colors.textSecondary} />
          <ThemedText
            type="body"
            style={{
              color: value ? colors.text : colors.textSecondary,
              flex: 1
            }}
          >
            {value ? formatDate(value) : label}
          </ThemedText>
        </Pressable>

        {value && (
          <Pressable
            onPress={() => onChange(undefined)}
            style={[styles.clearButton, { backgroundColor: colors.backgroundSecondary }]}
            hitSlop={8}
          >
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* iOS: Modal con picker */}
      {Platform.OS === 'ios' && show && (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={handleCancel}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <ThemedText type="h4">{label}</ThemedText>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                locale="es-ES"
                themeVariant={isDark ? "dark" : "light"}
                style={styles.picker}
              />

              <View style={styles.buttonsContainer}>
                <Pressable
                  onPress={handleCancel}
                  style={[styles.button, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Cancelar
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  style={[styles.button, { backgroundColor: colors.primary }]}
                >
                  <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                    Confirmar
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Android: Picker nativo */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minHeight: 52,
  },
  clearButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["2xl"],
  },
  modalHeader: {
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  picker: {
    height: 200,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});