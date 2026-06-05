import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme';

// Themed modal sheet with the iOS Cancel / Title / Save header. Replaces the
// header pattern that was duplicated across every modal in the app.
//
//   ┌─ Cancel ──── Title ──── Save ─┐   ← header (hairline under)
//   │  children (scrolls by default) │
//   └────────────────────────────────┘
export function Sheet({
  visible,
  title,
  onClose,
  leftLabel = 'Cancel',
  rightLabel,
  onRight,
  rightDisabled = false,
  children,
  scroll = true,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  leftLabel?: string;
  rightLabel?: string;
  onRight?: () => void;
  rightDisabled?: boolean;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const t = useTheme();

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: t.colors.separator,
        backgroundColor: t.colors.bg,
      }}
    >
      <TouchableOpacity onPress={onClose} hitSlop={8}>
        <Text style={{ fontSize: 17, color: t.colors.accent }}>{leftLabel}</Text>
      </TouchableOpacity>
      <Text
        style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: t.colors.label, marginHorizontal: t.spacing.sm }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {rightLabel && onRight ? (
        <TouchableOpacity onPress={onRight} hitSlop={8} disabled={rightDisabled}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: rightDisabled ? t.colors.secondaryLabel : t.colors.accent }}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 50 }} />
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}>
        {header}
        {scroll ? (
          <ScrollView contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: t.spacing.lg }}>{children}</View>
        )}
      </View>
    </Modal>
  );
}
