import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Typography } from '../../theme';
import { Radius } from '../../theme/tokens';
import { ComponentSize } from '../../constants/AppSizes';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  style,
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.white} size="small" />
      ) : (
        <Text style={Typography.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: ComponentSize.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ComponentSize.buttonPaddingH,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});

export default AppButton;
