import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { ThemeSurface } from '../../components/ThemeSurface';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getMeals, MEAL_TYPES, type Meal } from '../../services/mealService';

export default function RefeicoesScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMeals = useCallback(async () => {
    setError('');
    try {
      setMeals(await getMeals());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os alimentos de hoje.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (!isSupabaseConfigured) {
      setError('Configure o Supabase e entre na sua conta para registrar alimentos.');
      setIsLoading(false);
    } else {
      void loadMeals();
    }
  }, [loadMeals]));

  function openFoodPicker(category: string) {
    router.push({ pathname: '/alimentos-escolher', params: { refeicao: category } });
  }

  function showPaidPhotoNotice() {
    Alert.alert('Identificar alimento pela foto', 'A identificação por imagem vai usar uma API paga e ainda não está conectada.');
  }

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

  return (
    <ThemeSurface><View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alimentos de hoje</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Identificar alimento pela foto" onPress={showPaidPhotoNotice} style={styles.cameraButton}>
          <Ionicons name="camera" size={24} color={colors.white} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>CALORIAS REGISTRADAS</Text>
            <Text style={styles.totalValue}>{totalCalories} <Text style={styles.kcal}>kcal</Text></Text>
          </View>
          <Ionicons name="flame" size={29} color={colors.primary} />
        </View>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {MEAL_TYPES.map((category) => {
          const categoryMeals = meals.filter((meal) => meal.category === category);
          const categoryCalories = categoryMeals.reduce((sum, meal) => sum + meal.calories, 0);
          return (
            <View key={category} style={styles.mealSection}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>{category}</Text>
                <Text style={styles.sectionCalories}>{categoryCalories} kcal</Text>
              </View>
              {categoryMeals.map((meal) => (
                <View key={meal.id} style={styles.foodRow}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{meal.name}</Text>
                    <Text style={styles.foodDetail}>{meal.detail}</Text>
                  </View>
                  <Text style={styles.foodCalories}>{meal.calories} kcal</Text>
                </View>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel={`Adicionar alimento em ${category}`} onPress={() => openFoodPicker(category)} style={styles.addButton}>
                <Ionicons name="add" size={25} color={colors.white} />
              </Pressable>
            </View>
          );
        })}
        <Pressable accessibilityRole="button" onPress={showPaidPhotoNotice} style={styles.photoLink}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.photoLinkText}>Identificar alimento pela foto · recurso pago</Text>
        </Pressable>
      </ScrollView>
    </View></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#83CCF1', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  cameraButton: { alignItems: 'center', backgroundColor: '#111111', borderRadius: 24, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: 18, padding: 16, paddingBottom: 32 },
  totalCard: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', padding: 17 },
  totalLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  totalValue: { color: colors.primary, fontSize: 27, fontWeight: '800', marginTop: 3 },
  kcal: { fontSize: 15, fontWeight: '600' },
  mealSection: { gap: 9 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { backgroundColor: '#B5D9FF', borderRadius: 5, color: colors.text, fontSize: 15, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  sectionCalories: { color: colors.mutedText, fontSize: 12, fontWeight: '600' },
  foodRow: { alignItems: 'center', backgroundColor: '#F2F2F2', borderBottomColor: '#222222', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 13, paddingVertical: 8 },
  foodInfo: { flex: 1, gap: 3 },
  foodName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  foodDetail: { color: colors.mutedText, fontSize: 12 },
  foodCalories: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  addButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#2498EF', borderRadius: 16, height: 32, justifyContent: 'center', marginTop: 2, width: 32 },
  photoLink: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 7, padding: 8 },
  photoLinkText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13 },
});
