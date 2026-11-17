import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#101dbb" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#101dbb' } }} />
    </>
  );
}
