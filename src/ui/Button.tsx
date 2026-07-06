import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { AppText } from './AppText';
import { colors, radii, spacing } from './theme';

export type ButtonTone = 'accent' | 'ink' | 'danger' | 'ghost' | 'surface';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

const bg: Record<ButtonTone, string> = {
  accent: colors.accent,
  ink: colors.ink,
  danger: colors.danger,
  ghost: 'transparent',
  surface: colors.surface,
};
const fg: Record<ButtonTone, string> = {
  accent: colors.accentInk,
  ink: colors.surface,
  danger: colors.surface,
  ghost: colors.ink,
  surface: colors.ink,
};

/** Pill CTA. */
export function Button({
  label,
  onPress,
  tone = 'accent',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.btn,
        { backgroundColor: bg[tone] },
        tone === 'ghost' && styles.ghostBorder,
        tone === 'surface' && styles.surfaceBorder,
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg[tone]} />
        ) : (
          <>
            {icon}
            <AppText variant="button" color={fg[tone]}>
              {label}
            </AppText>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ghostBorder: { borderWidth: 1.5, borderColor: colors.ink },
  surfaceBorder: { borderWidth: 1, borderColor: colors.hairline },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
