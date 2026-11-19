import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../constants/colors';
import { ThemeSurface } from '../components/ThemeSurface';
import { addFoodToMeal, MEAL_TYPES, type MealType } from '../services/mealService';
import { hasDemoPremium } from '../services/demoPremiumService';
import { searchFoods, type FoodProduct } from '../services/nutritionApi';

function asMealType(value: string | string[] | undefined): MealType {
  const candidate = Array.isArray(value) ? value[0] : value;
  return MEAL_TYPES.includes(candidate as MealType) ? candidate as MealType : 'Lanches';
}

export default function AlimentosEscolherScreen() {
  const params = useLocalSearchParams<{ refeicao?: string | string[] }>();
  const category = asMealType(params.refeicao);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState('');
  const [onlineFoods, setOnlineFoods] = useState<FoodProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchRequest, setSearchRequest] = useState(0);
  const [selectedFood, setSelectedFood] = useState<FoodProduct | null>(null);
  const [servingGrams, setServingGrams] = useState('');
  const foods = useMemo(() => hasSearched ? onlineFoods.map((food) => ({
        ...food,
        id: food.code || food.name,
        name: food.name,
        caloriesPer100g: food.caloriesPer100g,
      })) : [], [hasSearched, onlineFoods]);

  useEffect(() => {
    const term = search.trim();
    let cancelled = false;
    if (!hasSearched) {
      setOnlineFoods([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }
    if (term.length < 2) {
      setOnlineFoods([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    setOnlineFoods([]);
    setIsSearching(true);
    setSearchError('');
    const timeout = setTimeout(() => {
      void searchFoods(term)
        .then((results) => {
          if (!cancelled) setOnlineFoods(results);
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          setOnlineFoods([]);
          setSearchError(reason instanceof Error ? reason.message : 'Não foi possível buscar alimentos online.');
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [hasSearched, search, searchRequest]);

  function searchApi() {
    if (search.trim().length < 2) {
      setSearchError('Digite pelo menos 2 caracteres para pesquisar.');
      setOnlineFoods([]);
      return;
    }
    setSearchError('');
    setHasSearched(true);
    setSearchRequest((current) => current + 1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setHasSearched(false);
    setOnlineFoods([]);
    setSearchError('');
  }

  async function confirmAddFood() {
    if (!selectedFood) return;
    const grams = Number(servingGrams.replace(',', '.'));
    if (!Number.isFinite(grams) || grams <= 0) {
      Alert.alert('Quantidade inválida', 'Informe uma quantidade de gramas maior que zero.');
      return;
    }
    const foodId = selectedFood.code || selectedFood.name;
    setSavingId(foodId);
    try {
      await addFoodToMeal({
        id: foodId,
        name: selectedFood.name,
        serving: `${grams} g`,
        calories: Math.round((selectedFood.caloriesPer100g ?? 0) * grams / 100),
      }, category);
      setSelectedFood(null);
      router.back();
    } catch (reason) {
      Alert.alert('Não foi possível adicionar', reason instanceof Error ? reason.message : 'Tente novamente.');
    } finally {
      setSavingId('');
    }
  }

  async function showPaidPhotoNotice() {
    if (!await hasDemoPremium()) {
      Alert.alert('Recurso Premium', 'Ative o Premium para tirar uma foto do prato.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ver Premium', onPress: () => router.push('/assinatura') },
      ]);
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão da câmera', 'Permita o acesso à câmera para fotografar seu prato.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) {
        Alert.alert('Foto capturada', 'A análise automática do prato ainda não está conectada. A foto não foi enviada nem analisada.');
      }
    } catch {
      Alert.alert('Não foi possível abrir a câmera', 'Confira as permissões e tente novamente.');
    }
  }

  return (
    <ThemeSurface><View style={styles.screen}>
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
        <TextInput onChangeText={updateSearch} onSubmitEditing={() => searchApi()} placeholder="Buscar alimento" placeholderTextColor={colors.mutedText} returnKeyType="search" style={styles.searchInput} value={search} />
      </View>
      <Pressable accessibilityRole="button" disabled={isSearching} onPress={searchApi} style={[styles.searchButton, isSearching && styles.disabled]}>
        {isSearching ? <ActivityIndicator color={colors.white} /> : <Text style={styles.searchButtonText}>Pesquisar na API</Text>}
      </Pressable>
      {search.trim().length >= 2 ? <Text style={styles.searchHint}>Pesquise pelo nome do alimento; a quantidade é escolhida ao adicionar.</Text> : null}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isSearching ? <ActivityIndicator color={colors.primary} /> : null}
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
        {foods.map((food) => (
          <View key={food.id} style={styles.foodRow}>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>{food.name}</Text>
              {food.brand ? <Text style={styles.foodDetail}>{food.brand}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${food.name}`} disabled={Boolean(savingId)} onPress={() => { setServingGrams(''); setSelectedFood(food); }} style={[styles.addButton, savingId && styles.disabled]}>
              <Ionicons name="add" size={24} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {!isSearching && !searchError && foods.length === 0 ? <Text style={styles.empty}>{hasSearched ? 'Nenhum alimento da API com calorias informadas foi encontrado.' : 'Digite pelo menos 2 caracteres e toque em Pesquisar.'}</Text> : null}
        <Pressable accessibilityRole="button" onPress={showPaidPhotoNotice} style={styles.paidFeature}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.paidFeatureText}>Reconhecer pela foto · Premium</Text>
        </Pressable>
      </ScrollView>
      <Modal animationType="fade" transparent visible={Boolean(selectedFood)} onRequestClose={() => setSelectedFood(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Quantidade do alimento</Text>
            <Text style={styles.modalFood}>{selectedFood?.name}</Text>
            <Text style={styles.foodDetail}>Informe quantos gramas você consumiu.</Text>
            <View style={styles.gramsInputRow}>
              <TextInput keyboardType="decimal-pad" onChangeText={setServingGrams} placeholder="Ex.: 80" placeholderTextColor={colors.mutedText} style={styles.gramsInput} value={servingGrams} />
              <Text style={styles.gramsUnit}>g</Text>
            </View>
            {selectedFood?.caloriesPer100g != null && Number(servingGrams.replace(',', '.')) > 0 ? <Text style={styles.foodDetail}>Estimativa: {Math.round(selectedFood.caloriesPer100g * Number(servingGrams.replace(',', '.')) / 100)} kcal</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setSelectedFood(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
              <Pressable disabled={Boolean(savingId)} onPress={() => void confirmAddFood()} style={[styles.confirmButton, savingId && styles.disabled]}>
                {savingId ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.confirmText}>Adicionar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View></ThemeSurface>
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
  searchButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', marginHorizontal: 16, minHeight: 44 },
  searchButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  list: { gap: 10, paddingHorizontal: 12, paddingBottom: 28 },
  foodRow: { alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 17, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  foodInfo: { flex: 1, gap: 3 },
  foodName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  foodDetail: { color: colors.mutedText, fontSize: 12 },
  addButton: { alignItems: 'center', backgroundColor: '#2498EF', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  disabled: { opacity: 0.65 },
  empty: { color: colors.mutedText, padding: 20, textAlign: 'center' },
  searchHint: { color: colors.mutedText, fontSize: 11, marginHorizontal: 20, marginTop: -5 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 20, gap: 12, padding: 20, width: '100%' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalFood: { color: colors.text, fontSize: 16, fontWeight: '600' },
  gramsInputRow: { alignItems: 'center', backgroundColor: '#F2F2F2', borderRadius: 12, flexDirection: 'row', paddingHorizontal: 12 },
  gramsInput: { color: colors.text, flex: 1, fontSize: 18, height: 48 },
  gramsUnit: { color: colors.text, fontSize: 16, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  cancelButton: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', minHeight: 42, paddingHorizontal: 14 },
  cancelText: { color: colors.text, fontWeight: '600' },
  confirmButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 42, minWidth: 100, paddingHorizontal: 14 },
  confirmText: { color: colors.white, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, paddingHorizontal: 8, textAlign: 'center' },
  paidFeature: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 7, padding: 12 },
  paidFeatureText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
