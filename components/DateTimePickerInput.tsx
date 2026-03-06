import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface DateTimePickerInputProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minimumDate?: Date;
  icon?: string;
}

export function DateTimePickerInput({
  label,
  value,
  onChange,
  minimumDate = new Date(),
  icon = "bell"
}: DateTimePickerInputProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState(value || new Date());

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);

      if (selectedDate) {
        if (mode === 'date') {
          setTempDate(selectedDate);
          setTimeout(() => {
            setMode('time');
            setShow(true);
          }, 100);
        } else {
          setTempDate(selectedDate);
          onChange(selectedDate);
        }
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShow(false);
    setMode('date');
  };

  const handleCancel = () => {
    setTempDate(value || new Date());
    setShow(false);
    setMode('date');
  };

  const showDatePicker = () => {
    setMode('date');
    setShow(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={showDatePicker}
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
            {value ? formatDateTime(value) : label}
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
                mode="datetime"
                display="spinner"
                onChange={handleDateTimeChange}
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

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode={mode}
          display="default"
          onChange={handleDateTimeChange}
          minimumDate={mode === 'date' ? minimumDate : undefined}
          is24Hour={true}
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