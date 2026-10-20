import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../constants/colors';
import { translateText, useAppLanguage } from '../../i18n/language';

// Cada arquivo de tela dentro desta pasta aparece como uma aba.
export default function TabsLayout() {
  const { language } = useAppLanguage();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.white,
      tabBarInactiveTintColor: colors.white,
      tabBarStyle: { backgroundColor: colors.primary, borderTopColor: colors.primary },
    }}>
      <Tabs.Screen name="home" options={{ title: translateText('Início', language), tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      {/* Abre o fórum de postagens anônimas no lugar da antiga aba Água. */}
      <Tabs.Screen name="forum" options={{ title: translateText('Fórum', language), tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="refeicoes" options={{ title: translateText('Refeições', language), tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="progresso" options={{ title: translateText('Progresso', language), tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
      {/* Aba da assistente de IA, posicionada antes da aba Perfil. */}
      <Tabs.Screen name="ia" options={{ title: translateText('IA', language), tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="perfil" options={{ title: translateText('Perfil', language), tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
