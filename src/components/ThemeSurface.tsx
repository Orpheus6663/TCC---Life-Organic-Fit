import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { translateText, useAppLanguage } from '../i18n/language';

const SCREEN_MODE_KEY = '@lifeorganicfit/screen-mode';
const DarkModeContext = createContext(false);

// Restores the saved mode once and shares the native appearance state with every route.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();

  useEffect(() => {
    let isActive = true;
    void AsyncStorage.getItem(SCREEN_MODE_KEY).then((mode) => {
      if (isActive && (mode === 'dark' || mode === 'light')) Appearance.setColorScheme(mode);
    });
    return () => { isActive = false; };
  }, []);

  return <DarkModeContext.Provider value={colorScheme === 'dark'}>{children}</DarkModeContext.Provider>;
}

function parseColor(color: unknown) {
  if (typeof color !== 'string') return null;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].split('').map((part) => part + part).join('') : match[1];
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function luminance([red, green, blue]: number[]) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function darkTextColor(color: unknown) {
  const rgb = parseColor(color);
  if (!rgb) return color;
  const [red, green, blue] = rgb;
  if (Math.max(...rgb) - Math.min(...rgb) < 38) return luminance(rgb) > 0.52 ? '#F2F5F8' : '#B8C3CE';
  if (red > green * 1.25 && red > blue * 1.25) return '#FFA29A';
  if (blue > red * 1.25 && blue > green * 1.08) return '#9ACBFF';
  if (green > red * 1.18 && green > blue * 1.08) return '#91D8AB';
  return luminance(rgb) > 0.52 ? '#F2F5F8' : color;
}

function darkSurfaceColor(color: unknown, isRoot: boolean) {
  const rgb = parseColor(color);
  if (!rgb) return color;
  const light = luminance(rgb);
  if (light > 0.83) return isRoot ? '#101820' : '#1B2631';
  if (light > 0.45) return '#253544';
  return color;
}

function transformStyle(style: unknown, isRoot: boolean, isText: boolean) {
  const flattened = StyleSheet.flatten(style as never);
  if (!flattened || typeof flattened !== 'object') return style;
  const updated: Record<string, unknown> = { ...flattened };
  if (updated.backgroundColor) updated.backgroundColor = darkSurfaceColor(updated.backgroundColor, isRoot);
  if (updated.borderColor) updated.borderColor = darkSurfaceColor(updated.borderColor, false);
  if (updated.borderBottomColor) updated.borderBottomColor = darkSurfaceColor(updated.borderBottomColor, false);
  if (updated.borderTopColor) updated.borderTopColor = darkSurfaceColor(updated.borderTopColor, false);
  updated.color = updated.color ? darkTextColor(updated.color) : isText ? '#F2F5F8' : undefined;
  return updated;
}

// Applies dark colors to existing screen styles while preserving the app's blue accents.
export function ThemeSurface({ children }: { children: React.ReactNode }) {
  const isDark = useContext(DarkModeContext);
  const { language } = useAppLanguage();
  if (!isDark && language === 'pt-BR') return <>{children}</>;

  function transform(node: React.ReactNode, isRoot = false): React.ReactNode {
    if (typeof node === 'string') return translateText(node, language);
    if (typeof node === 'number' || node === null || node === undefined || typeof node === 'boolean') return node;
    return React.Children.map(node, (child) => {
      if (!React.isValidElement<Record<string, unknown>>(child)) return child;

      const props = child.props;
      const isText = child.type === Text || child.type === TextInput;
      const nextProps: Record<string, unknown> = {};
      if (isDark && (props.style || isText)) nextProps.style = transformStyle(props.style ?? {}, isRoot, isText);
      if (props.contentContainerStyle) nextProps.contentContainerStyle = isDark ? transformStyle(props.contentContainerStyle, false, false) : props.contentContainerStyle;
      if (typeof props.color === 'string') nextProps.color = isDark ? darkTextColor(props.color) : props.color;
      for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder', 'label', 'title']) {
        if (typeof props[prop] === 'string') nextProps[prop] = translateText(props[prop] as string, language);
      }
      if (child.type === TextInput && typeof props.placeholderTextColor === 'string') {
        nextProps.placeholderTextColor = isDark ? darkTextColor(props.placeholderTextColor) : props.placeholderTextColor;
      }
      if ('children' in props) nextProps.children = transform(props.children as React.ReactNode);
      return React.cloneElement(child, nextProps);
    });
  }

  const translatedChildren = transform(children, true);
  return isDark ? <View style={styles.darkRoot}>{translatedChildren}</View> : <>{translatedChildren}</>;
}

const styles = StyleSheet.create({
  darkRoot: { backgroundColor: '#101820', flex: 1 },
});
