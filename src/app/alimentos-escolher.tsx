import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';
import { addFoodToMeal, getFoodCatalog, MEAL_TYPES, type MealType } from '../services/mealService';

function asMealType(value: string | string[] | undefined): MealType {
  const candidate = Array.isArray(value) ? value[0] : value;
  return MEAL_TYPES.includes(candidate as MealType) ? candidate as MealType : 'Lanches';
}

export default function AlimentosEscolherScreen() {
  const params = useLocalSearchParams<{ refeicao?: string | string[] }>();
  const category = asMealType(params.refeicao);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState('');
  const foods = useMemo(() => getFoodCatalog().filter((food) => food.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))), [search]);

  async function addFood(foodId: string) {
    const food = getFoodCatalog().find((item) => item.id === foodId);
    if (!food) return;
    setSavingId(foodId);
    try {
      await addFoodToMeal(food, category);
      router.back();
    } catch (reason) {
      Alert.alert('Não foi possível adicionar', reason instanceof Error ? reason.message : 'Tente novamente.');
    } finally {
      setSavingId('');
    }
  }

  function showPaidPhotoNotice() {
    Alert.alert('Identificar alimento pela foto', 'A identificação por imagem vai usar uma API paga e ainda não está conectada.');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Escolher alimento</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Identificar alimento pela foto" onPress={showPaidPhotoNotice} style={styles.cameraButton}>
          <Ionicons name="camera" size={22} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.context}><Text style={styles.contextText}>Adicionar em <Text style={styles.contextStrong}>{category}</Text></Text></View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={19} color={colors.mutedText} />
        <TextInput onChangeText={setSearch} placeholder="Buscar alimento" placeholderTextColor={colors.mutedText} style={styles.searchInput} value={search} />
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {foods.map((food) => (
          <View key={food.id} style={styles.foodRow}>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodDetail}>{food.serving} · {food.calories} kcal</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${food.name}`} disabled={Boolean(savingId)} onPress={() => void addFood(food.id)} style={[styles.addButton, savingId && styles.disabled]}>
              {savingId === food.id ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="add" size={24} color={colors.white} />}
            </Pressable>
          </View>
        ))}
        {foods.length === 0 ? <Text style={styles.empty}>Nenhum alimento encontrado.</Text> : null}
        <Pressable accessibilityRole="button" onPress={showPaidPhotoNotice} style={styles.paidFeature}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.paidFeatureText}>Reconhecer pela foto · recurso pago</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#83CCF1', flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14 },
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 36 },
  headerTitle: { color: colors.text, flex: 1, fontSize: 19, fontWeight: '800' },
  cameraButton: { alignItems: 'center', backgroundColor: '#111111', borderRadius: 22, height: 42, justifyContent: 'center', width: 42 },
  context: { paddingHorizontal: 20, paddingTop: 14 },
  contextText: { color: colors.mutedText, fontSize: 13 },
  contextStrong: { color: colors.text, fontWeight: '700' },
  searchBox: { alignItems: 'center', backgroundColor: '#F2F2F2', borderRadius: 15, flexDirection: 'row', gap: 9, marginHorizontal: 16, marginVertical: 13, paddingHorizontal: 13 },
  searchInput: { color: colors.text, flex: 1, height: 46 },
  list: { gap: 10, paddingHorizontal: 12, paddingBottom: 28 },
  foodRow: { alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 17, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  foodInfo: { flex: 1, gap: 3 },
  foodName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  foodDetail: { color: colors.mutedText, fontSize: 12 },
  addButton: { alignItems: 'center', backgroundColor: '#2498EF', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  disabled: { opacity: 0.65 },
  empty: { color: colors.mutedText, padding: 20, textAlign: 'center' },
  paidFeature: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 7, padding: 12 },
  paidFeatureText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
