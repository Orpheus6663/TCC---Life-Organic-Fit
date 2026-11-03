import type { QuestionnaireAnswers } from './questionnaireService';

// Approximate adult energy target based on the Mifflin–St Jeor resting-energy equation.
export function estimateDailyCalorieTarget(answers: QuestionnaireAnswers | null) {
  if (!answers) return null;
  const age = Number(answers.age);
  const heightCm = Number(answers.height_cm);
  const weightKg = Number(answers.weight_kg);
  if (!Number.isFinite(age) || age < 19 || age > 78
    || !Number.isFinite(heightCm) || heightCm <= 0
    || !Number.isFinite(weightKg) || weightKg <= 0) return null;

  const profile = String(answers.profile ?? '');
  const sexAdjustment = profile === 'Feminino' ? -161 : profile === 'Masculino' ? 5 : null;
  if (sexAdjustment === null) return null;

  const frequency = String(answers.exercise_frequency ?? '');
  const activityFactor = frequency.includes('5 ou mais') ? 1.725
    : frequency.includes('3 a 4') ? 1.55
      : frequency.includes('1 a 2') ? 1.375
        : 1.2;
  const restingEnergy = 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment;
  const maintenance = restingEnergy * activityFactor;
  const goal = String(answers.goal ?? '');
  const target = goal === 'Emagrecer' ? maintenance - 300
    : goal === 'Ganhar massa muscular' ? maintenance + 200
      : maintenance;
  return Math.max(0, Math.round(target / 50) * 50);
}
