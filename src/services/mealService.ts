import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export const MEAL_TYPES = ['Café da manhã', 'Almoço', 'Janta', 'Lanches'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type Meal = {
  id: string;
  name: string;
  detail: string;
  category: MealType;
  calories: number;
  logged_on: string;
  created_at: string;
};

export type FoodOption = { id: string; name: string; serving: string; calories: number };

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Temporary catalog. Replace with the chosen nutrition API without changing meal storage.
const FOOD_CATALOG: FoodOption[] = [
  { id: 'banana', name: 'Banana', serving: '1 unidade média', calories: 105 },
  { id: 'apple', name: 'Maçã', serving: '1 unidade média', calories: 95 },
  { id: 'egg', name: 'Ovo cozido', serving: '1 unidade', calories: 78 },
  { id: 'bread', name: 'Pão integral', serving: '2 fatias', calories: 138 },
  { id: 'rice', name: 'Arroz cozido', serving: '100 g', calories: 130 },
  { id: 'beans', name: 'Feijão cozido', serving: '100 g', calories: 76 },
  { id: 'chicken', name: 'Peito de frango grelhado', serving: '100 g', calories: 165 },
  { id: 'salad', name: 'Salada de folhas', serving: '1 prato', calories: 35 },
  { id: 'yogurt', name: 'Iogurte natural', serving: '1 pote (170 g)', calories: 100 },
  { id: 'oats', name: 'Aveia', serving: '30 g', calories: 117 },
];

export function getFoodCatalog() {
  return FOOD_CATALOG;
}

async function getStorageContext() {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const userId = data.session?.user.id ?? null;
  const ownerId = userId ?? 'guest';
  return { key: `@lifeorganicfit/meals-v1/${ownerId}`, userId };
}

async function readAllMeals() {
  const { key, userId } = await getStorageContext();
  const raw = await AsyncStorage.getItem(key);
  let meals: Meal[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    meals = Array.isArray(parsed) ? parsed as Meal[] : [];
  } catch {
    meals = [];
  }
  await importLegacyMealsOnce(key, userId, meals);
  const updated = await AsyncStorage.getItem(key);
  if (!updated) return meals;
  try {
    const parsed: unknown = JSON.parse(updated);
    return Array.isArray(parsed) ? parsed as Meal[] : meals;
  } catch {
    return meals;
  }
}

async function writeAllMeals(meals: Meal[]) {
  const { key } = await getStorageContext();
  await AsyncStorage.setItem(key, JSON.stringify(meals));
}

async function importLegacyMealsOnce(key: string, userId: string | null, currentMeals: Meal[]) {
  if (!supabase || !userId) return;
  const migrationKey = `${key}/legacy-imported`;
  if (await AsyncStorage.getItem(migrationKey)) return;

  // Copy any diary records from the old Supabase-backed version to local storage once.
  const { data, error } = await supabase
    .from('meals')
    .select('id, name, detail, category, calories, logged_on, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      await AsyncStorage.setItem(migrationKey, 'done');
    }
    return;
  }

  const knownIds = new Set(currentMeals.map((meal) => meal.id));
  const merged = [...currentMeals, ...((data ?? []) as Meal[]).filter((meal) => !knownIds.has(meal.id))];
  await AsyncStorage.setItem(key, JSON.stringify(merged));
  await AsyncStorage.setItem(migrationKey, 'done');
}

export async function getMeals(date = localDateString()) {
  return (await readAllMeals()).filter((meal) => meal.logged_on === date);
}

export async function addFoodToMeal(food: FoodOption, category: MealType) {
  const meals = await readAllMeals();
  const meal: Meal = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: food.name,
    detail: food.serving,
    category,
    calories: food.calories,
    logged_on: localDateString(),
    created_at: new Date().toISOString(),
  };
  await writeAllMeals([...meals, meal]);
  return meal;
}

export async function removeMeal(mealId: string) {
  const meals = await readAllMeals();
  const nextMeals = meals.filter((meal) => meal.id !== mealId);
  if (nextMeals.length === meals.length) throw new Error('Esse alimento não foi encontrado no diário local.');
  await writeAllMeals(nextMeals);
}
