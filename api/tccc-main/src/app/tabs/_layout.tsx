import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../constants/colors';

// Cada arquivo de tela dentro desta pasta aparece como uma aba.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedText,
      tabBarStyle: { backgroundColor: colors.white, borderTopColor: '#E4E7EC' },
    }}>
      <Tabs.Screen name="home" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      {/* Abre o fórum de postagens anônimas no lugar da antiga aba Água. */}
      <Tabs.Screen name="forum" options={{ title: 'Fórum', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="refeicoes" options={{ title: 'Refeições', tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="progresso" options={{ title: 'Progresso', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
      {/* Aba da assistente de IA, posicionada antes da aba Perfil. */}
      <Tabs.Screen name="ia" options={{ title: 'IA', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
