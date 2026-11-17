
import { requireSupabase } from '../lib/supabase';

// ==========================================
// TIPOS
// ==========================================

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  detail: string | null;
  category: string | null;
  calories: number | null;
  logged_on: string;
  created_at: string;
}

export interface MealItemInput {
  food_code: string | null;
  food_name: string;
  brand: string | null;
  grams: number;
  calories_per_100g: number;
}

export interface MealItem extends MealItemInput {
  id: string;
  meal_id: string;
  calories: number;
  created_at: string;
}

export interface AddMealInput {
  category: string;
  items: MealItemInput[];
  detail?: string | null;
  logged_on?: string;
}

// ==========================================
// CATEGORIAS DISPONÍVEIS
// ==========================================

const VALID_CATEGORIES = [
  'Café da manhã',
  'Almoço',
  'Lanche da tarde',
  'Jantar',
];

// ==========================================
// DATA ATUAL
// ==========================================

function getTodayLocalDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// ==========================================
// IDENTIFICAR USUÁRIO AUTENTICADO
// ==========================================

async function currentUserId(): Promise<string> {
  const supabase = requireSupabase();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Erro ao recuperar sessão:', error);

    throw new Error(
      `Não foi possível verificar sua sessão: ${error.message}`
    );
  }

  const userId = data.session?.user?.id;

  if (!userId) {
    throw new Error(
      'Você precisa entrar na sua conta para acessar suas refeições. Faça login novamente.'
    );
  }

  return userId;
}

// ==========================================
// BUSCAR REFEIÇÕES DE HOJE
// ==========================================

export async function getMealsForToday(): Promise<Meal[]> {
  const supabase = requireSupabase();

  const userId = await currentUserId();
  const today = getTodayLocalDate();

  const { data, error } = await supabase
    .from('meals')
    .select(
      'id, user_id, name, detail, category, calories, logged_on, created_at'
    )
    .eq('user_id', userId)
    .eq('logged_on', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar refeições:', error);

    throw new Error(
      `Não foi possível carregar suas refeições: ${error.message}`
    );
  }

  return (data ?? []) as Meal[];
}

// ==========================================
// SOMAR CALORIAS DO DIA
// ==========================================

export async function getTodayCalories(): Promise<number> {
  const meals = await getMealsForToday();

  const total = meals.reduce((sum, meal) => {
    return sum + Number(meal.calories ?? 0);
  }, 0);

  return Number(total.toFixed(2));
}

// ==========================================
// BUSCAR ALIMENTOS DE UMA REFEIÇÃO
// ==========================================

export async function getItemsForMeal(
  mealId: string
): Promise<MealItem[]> {
  const supabase = requireSupabase();

  await currentUserId();

  if (!mealId) {
    throw new Error('Identificador da refeição não informado.');
  }

  const { data, error } = await supabase
    .from('meal_items')
    .select(
      'id, meal_id, food_code, food_name, brand, grams, calories_per_100g, calories, created_at'
    )
    .eq('meal_id', mealId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao carregar alimentos:', error);

    throw new Error(
      `Não foi possível carregar os alimentos: ${error.message}`
    );
  }

  return (data ?? []) as MealItem[];
}

// ==========================================
// SALVAR REFEIÇÃO E SEUS ALIMENTOS
// ==========================================

export async function addMeal(
  input: AddMealInput
): Promise<Meal> {
  const supabase = requireSupabase();

  const userId = await currentUserId();

  const category = input.category.trim();

  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(
      'Selecione uma categoria válida para a refeição.'
    );
  }

  if (!input.items || input.items.length === 0) {
    throw new Error(
      'Adicione pelo menos um alimento antes de salvar.'
    );
  }

  // Validar os alimentos antes de salvar.

  for (const item of input.items) {
    if (!item.food_name.trim()) {
      throw new Error(
        'Existe um alimento sem nome na lista.'
      );
    }

    if (
      !Number.isFinite(item.grams) ||
      item.grams <= 0
    ) {
      throw new Error(
        `Informe uma quantidade válida para ${item.food_name}.`
      );
    }

    if (
      !Number.isFinite(item.calories_per_100g) ||
      item.calories_per_100g < 0
    ) {
      throw new Error(
        `As calorias de ${item.food_name} são inválidas.`
      );
    }
  }

  // Calcular as calorias individualmente.

  const itemsToSave = input.items.map((item) => {
    const calories =
      (item.calories_per_100g * item.grams) / 100;

    return {
      food_code: item.food_code || null,
      food_name: item.food_name.trim(),
      brand: item.brand?.trim() || null,
      grams: item.grams,
      calories_per_100g: item.calories_per_100g,
      calories: Number(calories.toFixed(2)),
    };
  });

  // Somar as calorias de todos os alimentos.

  const totalCalories = Number(
    itemsToSave
      .reduce((total, item) => {
        return total + item.calories;
      }, 0)
      .toFixed(2)
  );

  // Criar a descrição com os nomes dos alimentos.

  const foodNames = itemsToSave
    .map((item) => item.food_name)
    .join(', ');

  const loggedOn =
    input.logged_on ?? getTodayLocalDate();

  // Primeiro, salvar a refeição principal.

  const { data: mealData, error: mealError } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      name: category,
      category: category,
      detail: input.detail ?? foodNames,
      calories: totalCalories,
      logged_on: loggedOn,
    })
    .select(
      'id, user_id, name, detail, category, calories, logged_on, created_at'
    )
    .single();

  if (mealError || !mealData) {
    console.error('Erro ao salvar refeição:', mealError);

    throw new Error(
      `Não foi possível salvar a refeição: ${
        mealError?.message ?? 'Nenhum registro retornado.'
      }`
    );
  }

  // Associar cada alimento à refeição criada.

  const itemRows = itemsToSave.map((item) => ({
    meal_id: mealData.id,
    ...item,
  }));

  // Salvar os alimentos individualmente.

  const { error: itemsError } = await supabase
    .from('meal_items')
    .insert(itemRows);

  if (itemsError) {
    console.error('Erro ao salvar alimentos:', itemsError);

    // Tentar desfazer a criação da refeição.

    const { error: rollbackError } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealData.id)
      .eq('user_id', userId);

    if (rollbackError) {
      console.error(
        'Erro ao desfazer a refeição:',
        rollbackError
      );
    }

    throw new Error(
      `Não foi possível salvar os alimentos: ${itemsError.message}`
    );
  }

  return mealData as Meal;
}
