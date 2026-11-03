import { requireSupabase } from '../lib/supabase';

export function getPasswordValidationMessage(password: string): string | null {
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (!/\p{L}/u.test(password)) return 'A senha precisa conter pelo menos uma letra; não pode ser só números.';
  return null;
}

export async function sendPasswordRecovery(email: string) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!supabaseUrl) throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL no arquivo .env.');
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${supabaseUrl}/functions/v1/password-reset`,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
import type { QuestionnaireAnswers } from './questionnaireService';

export async function signIn(email: string, password: string) {
  // Converte o identificador público do admin no e-mail interno configurado para autenticação.
  const normalizedIdentity = email.trim();
  const adminLoginEmail = process.env.EXPO_PUBLIC_ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
  const authEmail = normalizedIdentity.toUpperCase() === 'ADM_LOF437'
    ? adminLoginEmail
    : normalizedIdentity.toLowerCase();
  if (!authEmail) {
    throw new Error('Configure EXPO_PUBLIC_ADMIN_LOGIN_EMAIL no arquivo .env para habilitar o acesso ADM_LOF437.');
  }
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: authEmail,
    password,
  });
  if (error) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = error.message.toLowerCase();
    if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
      throw new Error('E-mail ou senha inválidos. Confira os dados e se a conta foi criada em Supabase > Authentication > Users. Uma linha em uma tabela pública não cria uma conta de login; usuários convidados precisam definir uma senha antes de entrar.');
    }
    if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      throw new Error('Confirme o e-mail da conta no link enviado pelo Supabase antes de entrar.');
    }
    throw new Error(error.message);
  }
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

// Requests permanent account deletion through the authenticated server function.
export async function deleteAccount() {
  const client = requireSupabase();
  const { error } = await client.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error(error.message || 'Não foi possível excluir a conta.');
  const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
  if (signOutError) throw new Error(signOutError.message);
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
