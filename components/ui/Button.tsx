import React from 'react';
import { Pressable, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';

type Variant = 'filled' | 'tinted' | 'plain';

// Themed button. filled = solid accent (primary CTA), tinted = accent text on a
// faint accent wash, plain = accent text only. Optional leading SF Symbol.
export function Button({
  title,
  onPress,
  variant = 'filled',
  icon,
  disabled = false,
  destructive = false,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const t = useTheme();
  const tint = destructive ? t.colors.destructive : t.colors.accent;

  const filled = variant === 'filled';
  const fg = filled ? '#FFFFFF' : tint;
  const bg: ViewStyle['backgroundColor'] =
    variant === 'filled' ? tint : variant === 'tinted' ? withAlpha(tint, 0.12) : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.spacing.sm,
        minHeight: 48,
        paddingHorizontal: t.spacing.lg,
        borderRadius: t.radius.control,
        backgroundColor: bg,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      {icon && <Icon name={icon} color={fg} size={18} weight="semibold" />}
      <Text style={{ color: fg, fontSize: 17, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

// #RRGGBB + alpha → #RRGGBBAA (tinted-button wash).
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
