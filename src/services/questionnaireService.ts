import { requireSupabase } from '../lib/supabase';

export type QuestionnaireAnswers = Record<string, string | string[]>;

// As respostas ficam em uma linha por usuário; a política RLS é definida em database/schema.sql.
export async function hasCompletedQuestionnaire() {
  const client = requireSupabase();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userResult.user) return false;

  const { data, error } = await client
    .from('questionnaires')
    .select('user_id')
    .eq('user_id', userResult.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function saveQuestionnaire(answers: QuestionnaireAnswers) {
  const client = requireSupabase();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userResult.user) throw new Error('Sua sessão expirou. Entre novamente para salvar as respostas.');

  const { error } = await client.from('questionnaires').upsert(
    { user_id: userResult.user.id, answers, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(error.message);
}
