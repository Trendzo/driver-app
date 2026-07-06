import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  toScale?: number;
  /** Accepted for API parity with the mockup; no-op (no expo-haptics here). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Press-to-scale wrapper. */
export function PressableScale({
  toScale = 0.97,
  disabled,
  style,
  children,
  onPress,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(toScale, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 130 });
      }}
      style={[style, animStyle, disabled ? { opacity: 0.5 } : null]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
