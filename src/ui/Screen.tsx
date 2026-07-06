import React from 'react';
import { StatusBar, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from './theme';

interface ScreenProps {
  children: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  background?: string;
}

/** Canvas wrapper: warm-gray background, safe-area, standard horizontal padding. */
export function Screen({
  children,
  padded = true,
  style,
  edges = ['top', 'bottom'],
  background = colors.canvas,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View
        style={[styles.inner, padded && { paddingHorizontal: spacing.screenH }, style]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1 },
});
