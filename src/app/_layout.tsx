import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../components/ThemeSurface';
import { LanguageProvider } from '../i18n/language';

// Navegação raiz: autenticação e abas ficam em grupos de rotas separados.
export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/cadastro" />
          <Stack.Screen name="auth/questionario" />
          <Stack.Screen name="tabs" />
          <Stack.Screen name="configuracoes" />
          <Stack.Screen name="preferencias" />
          <Stack.Screen name="alimentos-escolher" />
        </Stack>
      </ThemeProvider>
    </LanguageProvider>
  );
}
