import { requireSupabase } from '../lib/supabase';

export function getPasswordValidationMessage(password: string): string | null {
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (!/\p{L}/u.test(password)) return 'A senha precisa conter pelo menos uma letra; não pode ser só números.';
  return null;
}
import type { QuestionnaireAnswers } from './questionnaireService';

export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUp(input: { name: string; phone: string; email: string; password: string }, answers: QuestionnaireAnswers) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { name: input.name.trim(), phone: input.phone.trim(), questionnaire: answers } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  // Clear only this device's cached session; a deleted Auth user may reject remote logout.
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw new Error(error.message);
}

export async function updateProfile(input: { name: string; email: string }) {
  const client = requireSupabase();
  const { data: currentResult, error: currentError } = await client.auth.getUser();
  if (currentError) throw new Error(currentError.message);
  if (!currentResult.user) throw new Error('Entre na sua conta para editar o perfil.');

  const email = input.email.trim().toLowerCase();
  const currentEmail = currentResult.user.email?.trim().toLowerCase() ?? '';
  const { data, error } = await client.auth.updateUser({
    ...(email && email !== currentEmail ? { email } : {}),
    data: { ...currentResult.user.user_metadata, name: input.name.trim() },
  });
  if (error) throw new Error(error.message);
  return { user: data.user, emailChangeRequested: Boolean(email && email !== currentEmail) };
}
