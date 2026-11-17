import type { TextInputProps } from 'react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';

type InputProps = TextInputProps & { label?: string };

export function Input({ label, style, onBlur, onFocus, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mutedText}
        style={[styles.input, isFocused && styles.inputFocused, style]}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Define os estilos visuais do elemento "wrapper".
  wrapper: {
    gap: 7
  },
  // Define os estilos visuais do elemento "label".
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600'
  },
  // Define os estilos visuais do elemento "input".
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    height: 52,
    paddingHorizontal: 16
  },
  // Define os estilos visuais do elemento "inputFocused".
  inputFocused: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 2
  },
});
