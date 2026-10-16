import { requireSupabase } from '../lib/supabase';

export type QuestionnaireAnswers = Record<string, string | string[]>;

// Preferências úteis para personalizar as respostas da NutriIA, sem enviar dados
// de identificação corporal ou informações de saúde opcionais ao servidor da IA.
const aiPreferenceKeys = [
  'goal', 'goal_timeline', 'motivation', 'exercise_frequency', 'exercise_types',
  'daily_activity', 'sleep_hours', 'meals_per_day', 'food_preference',
  'food_restrictions', 'meal_preparation', 'water_intake', 'nutrition_challenge',
] as const;

export function isQuestionnaireAnswers(value: unknown): value is QuestionnaireAnswers {
  return typeof value === 'object'
    && value !== null
    && Object.values(value).every((answer) =>
      typeof answer === 'string'
      || (Array.isArray(answer) && answer.every((item) => typeof item === 'string')),
    );
}

export async function saveQuestionnaireForUser(userId: string, answers: QuestionnaireAnswers) {
  const { error } = await requireSupabase().from('questionnaires').upsert(
    { user_id: userId, answers, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(error.message);
}

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
  if (data) return true;

  // Email confirmation can delay the session; save completed signup answers after the first login.
  const pendingAnswers = userResult.user.user_metadata?.questionnaire;
  if (!isQuestionnaireAnswers(pendingAnswers)) return false;
  await saveQuestionnaireForUser(userResult.user.id, pendingAnswers);
  return true;
}

export async function saveQuestionnaire(answers: QuestionnaireAnswers) {
  const client = requireSupabase();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userResult.user) throw new Error('Sua sessão expirou. Entre novamente para salvar as respostas.');
  await saveQuestionnaireForUser(userResult.user.id, answers);
}

export async function getQuestionnairePreferencesForAI(): Promise<QuestionnaireAnswers> {
  const client = requireSupabase();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userResult.user) throw new Error('Entre na sua conta para conversar com a NutriIA.');

  const { data, error } = await client
    .from('questionnaires')
    .select('answers')
    .eq('user_id', userResult.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!isQuestionnaireAnswers(data?.answers)) return {};

  return Object.fromEntries(
    aiPreferenceKeys.flatMap((key) => {
      const value = data.answers[key];
      return value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
        ? []
        : [[key, value]];
    }),
  );
}
