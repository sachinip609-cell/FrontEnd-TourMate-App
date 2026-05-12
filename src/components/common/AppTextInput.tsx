import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';
import { ComponentSize } from '../../constants/AppSizes';
import { Radius } from '../../theme/tokens';

interface AppTextInputProps extends TextInputProps {
  label: string;
  rightLabel?: string;
  onRightLabelPress?: () => void;
  containerStyle?: ViewStyle;
}

const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  rightLabel,
  onRightLabelPress,
  containerStyle,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={Typography.inputLabel}>{label}</Text>
        {rightLabel ? (
          <TouchableOpacity
            onPress={onRightLabelPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={Typography.rightLabelText}>{rightLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.inputPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={Colors.primary}
        underlineColorAndroid="transparent"
        allowFontScaling={false}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.inputText,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: ComponentSize.inputPaddingH,
    height: ComponentSize.inputHeight,
    paddingVertical: ComponentSize.inputPaddingV,
    textAlignVertical: 'center',
    color: Colors.textPrimary,
  },
});

export default AppTextInput;
