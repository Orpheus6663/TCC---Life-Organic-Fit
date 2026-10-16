import { requireSupabase } from '../lib/supabase';

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

// Catálogo temporário. Pode ser substituído por uma tabela/API nutricional quando
// a fonte de dados for escolhida, sem mudar as telas que consomem getFoodCatalog.
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

async function getCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Entre na sua conta para acessar suas refeições.');
  return { client, userId: data.user.id };
}

export async function getMeals(date = localDateString()) {
  const { client, userId } = await getCurrentUser();
  const { data, error } = await client
    .from('meals')
    .select('id, name, detail, category, calories, logged_on, created_at')
    .eq('user_id', userId)
    .eq('logged_on', date)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Meal[];
}

export async function addFoodToMeal(food: FoodOption, category: MealType) {
  const { client, userId } = await getCurrentUser();
  const { data, error } = await client
    .from('meals')
    .insert({
      user_id: userId,
      name: food.name,
      detail: food.serving,
      category,
      calories: food.calories,
      logged_on: localDateString(),
    })
    .select('id, name, detail, category, calories, logged_on, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as Meal;
}
