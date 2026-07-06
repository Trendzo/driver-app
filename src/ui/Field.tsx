import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './AppText';
import { colors, fonts, radii, spacing } from './theme';

interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  required?: boolean;
}

/** Labelled text input on a rounded surface. */
export function Field({ label, error, prefix, required, style, ...rest }: FieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="sectionLabel" color={colors.meta} style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </AppText>
      ) : null}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {prefix ? (
          <AppText variant="bodyMedium" color={colors.ink} style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="meta" color={colors.danger} style={styles.err}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
  },
  fieldError: { borderColor: colors.danger },
  prefix: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  err: { marginLeft: 2 },
});
