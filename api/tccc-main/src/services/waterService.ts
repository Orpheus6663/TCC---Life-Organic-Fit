import { requireSupabase } from '../lib/supabase';

export type WaterLog = { id: string; amount_ml: number; created_at: string };

async function currentUserId() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Entre na sua conta para registrar o consumo de água.');
  return data.user.id;
}

export async function getWaterForToday(): Promise<WaterLog[]> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const { data, error } = await client
    .from('water_logs')
    .select('id, amount_ml, created_at')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addWater(amountMl = 250) {
  if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > 5000) {
    throw new Error('Informe uma quantidade de água válida.');
  }
  const client = requireSupabase();
  const userId = await currentUserId();
  const { data, error } = await client
    .from('water_logs')
    .insert({ user_id: userId, amount_ml: amountMl })
    .select('id, amount_ml, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as WaterLog;
}
