import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Ionicons wrapper — same icon set/names as the mockup app. */
export function Icon({
  name,
  size = 24,
  color = colors.ink,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
