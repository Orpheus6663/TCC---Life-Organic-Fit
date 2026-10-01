import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Navegação raiz: autenticação e abas ficam em grupos de rotas separados.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="tabs" />
      </Stack>
    </>
  );
}
