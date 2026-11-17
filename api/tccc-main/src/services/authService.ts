import { requireSupabase } from '../lib/supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUp(input: { name: string; phone: string; email: string; password: string }) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { name: input.name.trim(), phone: input.phone.trim() } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw new Error(error.message);
}
