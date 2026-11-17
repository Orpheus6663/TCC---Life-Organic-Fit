
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';

import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { isSupabaseConfigured } from '../../lib/supabase';

import {
  addMeal,
  getMealsForToday,
  type Meal,
  type MealItemInput,
} from '../../services/mealService';

import {
  searchFoods,
  type FoodProduct,
} from '../../services/nutritionApi';

const CATEGORIES = [
  'Café da manhã',
  'Almoço',
  'Lanche da tarde',
  'Jantar',
];

export default function RefeicoesScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [foods, setFoods] = useState<FoodProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedFood, setSelectedFood] =
    useState<FoodProduct | null>(null);

  const [portionGrams, setPortionGrams] = useState('100');

  const [mealItems, setMealItems] =
    useState<MealItemInput[]>([]);

  // A categoria começa vazia.
  // O usuário escolhe somente na hora de salvar.
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const result = await getMealsForToday();

      setMeals(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as refeições.';

      console.error('Erro ao carregar refeições:', error);
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSearch() {
    const term = searchTerm.trim();

    if (term.length < 2) {
      Alert.alert(
        'Pesquisa',
        'Digite pelo menos dois caracteres para pesquisar.'
      );
      return;
    }

    try {
      setSearching(true);
      setFoods([]);
      setSelectedFood(null);

      const result = await searchFoods(term);

      setFoods(result);

      if (result.length === 0) {
        Alert.alert(
          'Nenhum resultado',
          'Não encontramos alimentos com esse nome. Tente outra pesquisa.'
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível buscar os alimentos.';

      console.error('Erro na pesquisa:', error);
      Alert.alert('Erro na busca', message);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectFood(food: FoodProduct) {
    if (food.caloriesPer100g === null) {
      Alert.alert(
        'Informação nutricional indisponível',
        'Esse produto não possui informação de calorias por 100 g na Open Food Facts. Escolha outro alimento.'
      );
      return;
    }

    setSelectedFood(food);
    setPortionGrams('100');
  }

  function handleAddFood() {
    if (!selectedFood) {
      Alert.alert(
        'Selecione um alimento',
        'Escolha um alimento da lista antes de adicionar.'
      );
      return;
    }

    const grams = Number(
      portionGrams.trim().replace(',', '.')
    );

    if (!Number.isFinite(grams) || grams <= 0) {
      Alert.alert(
        'Quantidade inválida',
        'Informe uma quantidade em gramas maior que zero.'
      );
      return;
    }

    if (selectedFood.caloriesPer100g === null) {
      Alert.alert(
        'Calorias indisponíveis',
        'Não é possível calcular as calorias desse produto.'
      );
      return;
    }

    const newItem: MealItemInput = {
      food_code: selectedFood.code || null,
      food_name: selectedFood.name,
      brand: selectedFood.brand || null,
      grams,
      calories_per_100g: selectedFood.caloriesPer100g,
    };

    setMealItems((current) => [...current, newItem]);

    setSelectedFood(null);
    setPortionGrams('100');
  }

  function handleChangeGrams(index: number, value: string) {
    const normalizedValue = value.replace(',', '.');

    setMealItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          grams: normalizedValue === ''
            ? 0
            : Number(normalizedValue),
        };
      })
    );
  }

  function handleRemoveFood(index: number) {
    setMealItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function getItemCalories(item: MealItemInput) {
    return (
      (item.calories_per_100g * item.grams) / 100
    );
  }

  const totalCalories = mealItems.reduce(
    (total, item) => total + getItemCalories(item),
    0
  );

  async function handleSaveMeal() {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase não configurado',
        'Confira as variáveis de ambiente do Supabase.'
      );
      return;
    }

    if (mealItems.length === 0) {
      Alert.alert(
        'Lista vazia',
        'Adicione pelo menos um alimento antes de salvar.'
      );
      return;
    }

    const invalidItem = mealItems.find(
      (item) =>
        !Number.isFinite(item.grams) ||
        item.grams <= 0
    );

    if (invalidItem) {
      Alert.alert(
        'Quantidade inválida',
        `Confira a quantidade de ${invalidItem.food_name}.`
      );
      return;
    }

    if (!category) {
      Alert.alert(
        'Escolha uma refeição',
        'Selecione Café da manhã, Almoço, Lanche da tarde ou Jantar antes de salvar.'
      );
      return;
    }

    try {
      setSaving(true);

      await addMeal({
        category,
        items: mealItems,
      });

      Alert.alert(
        'Refeição salva!',
        `${category} registrada com ${totalCalories.toFixed(1)} kcal.`
      );

      setMealItems([]);
      setFoods([]);
      setSearchTerm('');
      setSelectedFood(null);
      setCategory(null);
      setPortionGrams('100');

      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar sua refeição.';

      console.error('Erro ao salvar refeição:', error);
      Alert.alert('Erro ao salvar', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Minhas refeições</Text>

        <Text style={styles.subtitle}>
          Pesquise os alimentos, informe as quantidades e
          escolha a refeição na hora de salvar.
        </Text>

        {!isSupabaseConfigured && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              O Supabase não está configurado. Confira seu arquivo .env.
            </Text>
          </View>
        )}

        {/* PESQUISA DE ALIMENTOS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Pesquisar alimentos
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex.: banana, arroz, frango..."
            placeholderTextColor={colors.mutedText}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          <Pressable
            style={[
              styles.primaryButton,
              searching && styles.disabledButton,
            ]}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Pesquisar alimentos
              </Text>
            )}
          </Pressable>

          {foods.map((food, index) => (
            <View
              key={`${food.code || food.name}-${index}`}
              style={styles.foodResult}
            >
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>
                  {food.name}
                </Text>

                {!!food.brand && (
                  <Text style={styles.mutedText}>
                    {food.brand}
                  </Text>
                )}

                <Text style={styles.calorieText}>
                  {food.caloriesPer100g !== null
                    ? `${food.caloriesPer100g} kcal por 100 g`
                    : 'Calorias não informadas'}
                </Text>
              </View>

              <Pressable
                style={styles.smallButton}
                onPress={() => handleSelectFood(food)}
                disabled={food.caloriesPer100g === null}
              >
                <Text style={styles.smallButtonText}>
                  Selecionar
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* ALIMENTO SELECIONADO */}
        {selectedFood && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Adicionar alimento
            </Text>

            <Text style={styles.foodName}>
              {selectedFood.name}
            </Text>

            <Text style={styles.mutedText}>
              Calorias por 100 g: {selectedFood.caloriesPer100g}
            </Text>

            <Text style={styles.fieldLabel}>
              Quantidade em gramas
            </Text>

            <TextInput
              style={styles.input}
              value={portionGrams}
              onChangeText={setPortionGrams}
              keyboardType="decimal-pad"
              placeholder="Ex.: 150"
              placeholderTextColor={colors.mutedText}
            />

            <Pressable
              style={styles.primaryButton}
              onPress={handleAddFood}
            >
              <Text style={styles.primaryButtonText}>
                Adicionar à lista
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setSelectedFood(null)}
            >
              <Text style={styles.cancelButtonText}>
                Cancelar seleção
              </Text>
            </Pressable>
          </View>
        )}

        {/* LISTA DE ALIMENTOS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Alimentos adicionados
          </Text>

          {mealItems.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhum alimento adicionado ainda.
            </Text>
          ) : (
            mealItems.map((item, index) => (
              <View
                key={`${item.food_code || item.food_name}-${index}`}
                style={styles.mealItem}
              >
                <Text style={styles.foodName}>
                  {item.food_name}
                </Text>

                {!!item.brand && (
                  <Text style={styles.mutedText}>
                    {item.brand}
                  </Text>
                )}

                <Text style={styles.fieldLabel}>
                  Quantidade em gramas
                </Text>

                <TextInput
                  style={styles.input}
                  value={String(item.grams)}
                  onChangeText={(value) =>
                    handleChangeGrams(index, value)
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.calorieText}>
                  {getItemCalories(item).toFixed(1)} kcal
                </Text>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveFood(index)}
                >
                  <Text style={styles.removeButtonText}>
                    Remover alimento
                  </Text>
                </Pressable>
              </View>
            ))
          )}

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>
              Total da refeição
            </Text>

            <Text style={styles.totalCalories}>
              {totalCalories.toFixed(1)} kcal
            </Text>
          </View>
        </View>

        {/* ESCOLHA DA REFEIÇÃO E SALVAMENTO */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Salvar refeição
          </Text>

          <Text style={styles.subtitle}>
            Escolha em qual refeição deseja registrar os alimentos:
          </Text>

          <View style={styles.categoryContainer}>
            {CATEGORIES.map((item) => {
              const isSelected = category === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryButton,
                    isSelected && styles.categoryButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              (saving || mealItems.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={handleSaveMeal}
            disabled={saving || mealItems.length === 0}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Salvar refeição
              </Text>
            )}
          </Pressable>
        </View>

        {/* REFEIÇÕES REGISTRADAS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Refeições de hoje
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : meals.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhuma refeição registrada hoje.
            </Text>
          ) : (
            meals.map((meal) => (
              <View key={meal.id} style={styles.savedMeal}>
                <Text style={styles.foodName}>
                  {meal.category || meal.name}
                </Text>

                {!!meal.detail && (
                  <Text style={styles.mutedText}>
                    {meal.detail}
                  </Text>
                )}

                <Text style={styles.calorieText}>
                  {(meal.calories ?? 0).toFixed(1)} kcal
                </Text>

                <Text style={styles.dateText}>
                  {new Date(meal.created_at).toLocaleTimeString(
                    'pt-BR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F4',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 16,
    lineHeight: 21,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D8DED8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 4,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  disabledButton: {
    opacity: 0.5,
  },

  foodResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE8',
    paddingVertical: 12,
    gap: 10,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },

  mutedText: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 3,
  },

  calorieText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 6,
  },

  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  cancelButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },

  cancelButtonText: {
    color: colors.mutedText,
    fontWeight: '600',
  },

  emptyText: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },

  mealItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE8',
    paddingVertical: 14,
  },

  removeButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
  },

  removeButtonText: {
    color: '#C0392B',
    fontWeight: '600',
    fontSize: 13,
  },

  totalBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#EEF5ED',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },

  totalCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },

  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  categoryButton: {
    borderWidth: 1,
    borderColor: '#D8DED8',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },

  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  categoryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  categoryTextSelected: {
    color: '#FFFFFF',
  },

  savedMeal: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE8',
    paddingVertical: 12,
  },

  dateText: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 5,
  },

  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  warningText: {
    color: '#856404',
    fontSize: 13,
  },
});
