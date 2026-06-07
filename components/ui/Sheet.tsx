import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

// Themed bottom-sheet. Presented as an iOS pageSheet (dimmed parent, rounded
// top, swipe-to-dismiss) with a grabber handle, and the primary action moved to
// a full-width button pinned at the bottom — instead of a nav-bar Save.
//
//   ┌──────── ▬ ────────┐   ← grabber
//   │ Cancel  Title  Goals│   ← header (Cancel only with an action; secondary right)
//   │  children (scrolls) │
//   │ ┌─────────────────┐ │
//   │ │   Save / Done    │ │   ← full-width bottom button
//   └──────────────────────┘
//
// Provide `actionLabel` + `onAction` for a primary action (Save/Add); the header
// then shows "Cancel" to back out. Without an action, the bottom button is
// "Done" and dismisses. `secondaryLabel`/`onSecondary` is an optional header-
// right link (e.g. Nutrients → Goals).
export function Sheet({
  visible,
  title,
  onClose,
  actionLabel,
  onAction,
  actionDisabled = false,
  secondaryLabel,
  onSecondary,
  children,
  scroll = true,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hasAction = !!(actionLabel && onAction);

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.spacing.lg,
        paddingTop: 4,
        paddingBottom: t.spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: t.colors.separator,
        backgroundColor: t.colors.bg,
      }}
    >
      {hasAction ? (
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Text style={{ fontSize: 17, color: t.colors.accent }}>Cancel</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 50 }} />
      )}
      <Text
        style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: t.colors.label, marginHorizontal: t.spacing.sm }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {secondaryLabel && onSecondary ? (
        <TouchableOpacity onPress={onSecondary} hitSlop={8}>
          <Text style={{ fontSize: 17, color: t.colors.accent }}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 50 }} />
      )}
    </View>
  );

  const body = scroll ? (
    <ScrollView contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: t.spacing.lg }}>{children}</View>
  );

  // Full-width bottom button: the primary action, or "Done" to dismiss.
  const onPress = hasAction ? onAction! : onClose;
  const label = hasAction ? actionLabel! : 'Done';
  const disabled = hasAction ? actionDisabled : false;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}
      >
        {/* Grabber handle */}
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' }} />
        </View>
        {header}
        <View style={{ flex: 1 }}>{body}</View>
        {/* Full-width bottom action */}
        <View
          style={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.sm,
            paddingBottom: insets.bottom + t.spacing.sm,
            borderTopWidth: 0.5,
            borderTopColor: t.colors.separator,
            backgroundColor: t.colors.bg,
          }}
        >
          <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={{ backgroundColor: disabled ? t.colors.secondaryLabel : t.colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{label}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
