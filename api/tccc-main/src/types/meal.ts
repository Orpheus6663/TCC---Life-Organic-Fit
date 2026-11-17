export type Meal = {
  id: string;
  name: string;
  description: string | null;
  calories: number | null;
  consumed_at: string;
};

export type MealItem = {
  id: string;
  meal_id: string;
  food_code: string | null;
  food_name: string;
  brand: string | null;
  grams: number;
  calories_per_100g: number;
  calories: number;
};