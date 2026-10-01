import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';

const initialMeals = [
  { id: '1', name: 'Café da manhã', detail: 'Registre sua primeira refeição' },
  { id: '2', name: 'Almoço', detail: 'Registre sua refeição principal' },
  { id: '3', name: 'Jantar', detail: 'Registre sua última refeição' },
];

// Os registros ficam apenas na memória por enquanto; conecte o serviço ao Supabase depois.
export default function RefeicoesScreen() {
  const [meals, setMeals] = useState(initialMeals);
  function addMeal() {
    const id = String(Date.now());
    setMeals((current) => [...current, { id, name: `Lanche ${current.length - 2}`, detail: 'Refeição adicionada hoje' }]);
    Alert.alert('Refeição adicionada', 'Depois você poderá preencher os alimentos e as quantidades.');
  }
  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Refeições</Text>
        <Text style={styles.subtitle}>Acompanhe o que você comeu hoje.</Text>
        {meals.map((meal) => (
          <View key={meal.id} style={styles.card}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.subtitle}>{meal.detail}</Text>
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={addMeal} style={styles.button}><Text style={styles.buttonText}>+ Adicionar refeição</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Define os estilos visuais do elemento "screen".
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },
  // Define os estilos visuais do elemento "content".
  content: {
    flexGrow: 1,
    gap: 14,
    padding: 20
  },
  // Define os estilos visuais do elemento "title".
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12
  },
  // Define os estilos visuais do elemento "subtitle".
  subtitle: {
    color: colors.mutedText,
    fontSize: 14
  },
  // Define os estilos visuais do elemento "card".
  card: {
    backgroundColor: colors.lightBlue,
    borderRadius: 16,
    gap: 8,
    padding: 18
  },
  // Define os estilos visuais do elemento "mealName".
  mealName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700'
  },
  // Define os estilos visuais do elemento "button".
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 8
  },
  // Define os estilos visuais do elemento "buttonText".
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700'
  },
});
