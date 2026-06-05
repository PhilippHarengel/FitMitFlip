import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';

// Grouped inset list, the core iOS list idiom.
//
//   SECTION HEADER
//   ┌─────────────────────────────┐
//   │ row 1                     ›  │
//   │───────────────(hairline)─────│
//   │ row 2                     ›  │
//   └─────────────────────────────┘
//
// ListSection draws the rounded container + hairline separators between rows;
// ListRow is one tappable row with an optional leading SF Symbol, a trailing
// value, and a chevron.
export function ListSection({ header, children }: { header?: string; children: React.ReactNode }) {
  const t = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={{ gap: t.spacing.sm }}>
      {header && (
        <Text style={[styles.header, { color: t.colors.secondaryLabel }]}>{header.toUpperCase()}</Text>
      )}
      <View style={{ backgroundColor: t.colors.card, borderRadius: t.radius.card, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.separator, marginLeft: t.spacing.lg }} />
            )}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  value,
  onPress,
  chevron = true,
  destructive = false,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
}) {
  const t = useTheme();
  const showChevron = chevron && !!onPress;
  const titleColor = destructive ? t.colors.destructive : t.colors.label;

  const body = (pressed: boolean) => (
    <View style={[styles.row, { paddingHorizontal: t.spacing.lg }, pressed && { opacity: 0.6 }]}>
      {icon && <Icon name={icon} color={iconColor ?? t.colors.accent} size={20} style={styles.icon} />}
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
      {value != null && (
        <Text style={[styles.value, { color: t.colors.secondaryLabel }]} numberOfLines={1}>{value}</Text>
      )}
      {showChevron && <Icon name="chevron.right" color={t.colors.secondaryLabel} size={14} />}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{({ pressed }) => body(pressed)}</Pressable>;
  }
  return body(false);
}

const styles = StyleSheet.create({
  header: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 12, gap: 6 },
  icon: { width: 26 },
  title: { flex: 1, fontSize: 17 },
  value: { fontSize: 17 },
});
