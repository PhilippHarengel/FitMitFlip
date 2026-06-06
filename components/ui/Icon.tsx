import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

// Single wrapper around expo-symbols. Routing all SF Symbol usage through here
// means the whole app can swap icon backends in one file if needed. SF Symbols
// are iOS-only; on Android/web SymbolView renders the `fallback` (none here,
// since the app ships iOS-first).
export type IconName = SymbolViewProps['name'];

export function Icon({
  name,
  color,
  size = 22,
  weight = 'regular',
  style,
}: {
  name: IconName;
  color?: string;
  size?: number;
  weight?: SymbolViewProps['weight'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={name}
      tintColor={color}
      size={size}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={style}
    />
  );
}
