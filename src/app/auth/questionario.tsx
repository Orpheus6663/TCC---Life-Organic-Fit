import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../constants/colors';
import { saveQuestionnaire } from '../../services/questionnaireService';
import type { QuestionnaireAnswers } from '../../services/questionnaireService';

type Question = {
  id: string;
  title: string;
  kind: 'number' | 'text' | 'choice' | 'multiple';
  options?: string[];
  placeholder?: string;
  optional?: boolean;
};

const sections: { title: string; questions: Question[] }[] = [
  { title: '1. SOBRE VOCÊ', questions: [
    { id: 'age', title: 'Qual é a sua idade?', kind: 'number', placeholder: 'ex.: 28' },
    { id: 'profile', title: 'Qual opção representa melhor seu perfil fisiológico?', kind: 'choice', options: ['Feminino', 'Masculino', 'Prefiro não informar'] },
    { id: 'height_cm', title: 'Qual é a sua altura? (cm)', kind: 'number', placeholder: 'ex.: 170' },
    { id: 'weight_kg', title: 'Qual é o seu peso atual? (kg)', kind: 'number', placeholder: 'ex.: 68' },
  ] },
  { title: '2. SEU OBJETIVO', questions: [
    { id: 'goal', title: 'Qual é o seu principal objetivo?', kind: 'choice', options: ['Emagrecer', 'Ganhar massa muscular', 'Manter o peso', 'Melhorar a alimentação', 'Ter mais disposição'] },
    { id: 'target_weight_kg', title: 'Você tem um peso como meta? (kg)', kind: 'number', placeholder: 'ex.: 62', optional: true },
    { id: 'goal_timeline', title: 'Em que prazo gostaria de trabalhar nesse objetivo?', kind: 'choice', options: ['Sem prazo definido', 'Até 3 meses', 'De 3 a 6 meses', 'Mais de 6 meses'] },
    { id: 'motivation', title: 'O que mais motiva você?', kind: 'multiple', options: ['Saúde', 'Bem-estar', 'Condicionamento', 'Autoestima', 'Recomendação profissional'] },
  ] },
  { title: '3. SUA ROTINA', questions: [
    { id: 'exercise_frequency', title: 'Com que frequência você pratica atividade física?', kind: 'choice', options: ['Ainda não pratico', '1 a 2 dias por semana', '3 a 4 dias por semana', '5 ou mais dias por semana'] },
    { id: 'exercise_types', title: 'Quais atividades você pratica ou gostaria de praticar?', kind: 'multiple', options: ['Caminhada ou corrida', 'Musculação', 'Esporte', 'Dança', 'Outra', 'Ainda não pratico'] },
    { id: 'daily_activity', title: 'Como é sua rotina na maior parte do dia?', kind: 'choice', options: ['Mais sentada(o)', 'Alterno entre sentar e ficar em pé', 'Fico bastante em pé ou me movimento'] },
    { id: 'sleep_hours', title: 'Em média, quantas horas você dorme por noite?', kind: 'choice', options: ['Menos de 5 horas', 'De 5 a 6 horas', 'De 7 a 8 horas', 'Mais de 8 horas'] },
    { id: 'meals_per_day', title: 'Quantas refeições costuma fazer por dia?', kind: 'choice', options: ['1 a 2', '3', '4 a 5', 'Mais de 5', 'Varia bastante'] },
  ] },
  { title: '4. SUA ALIMENTAÇÃO', questions: [
    { id: 'food_preference', title: 'Como você descreveria sua alimentação?', kind: 'choice', options: ['Onívora', 'Vegetariana', 'Vegana', 'Outra', 'Prefiro não informar'] },
    { id: 'food_restrictions', title: 'Você tem alguma restrição ou preferência alimentar?', kind: 'multiple', options: ['Nenhuma', 'Vegetariana ou vegana', 'Sem lactose', 'Sem glúten', 'Outra'] },
    { id: 'meal_preparation', title: 'Com que frequência prepara suas refeições?', kind: 'choice', options: ['Quase sempre', 'Algumas vezes', 'Raramente', 'Nunca'] },
    { id: 'water_intake', title: 'Quanto de água costuma beber por dia?', kind: 'choice', options: ['Menos de 1 litro', 'De 1 a 1,5 litro', 'De 1,5 a 2 litros', 'Mais de 2 litros', 'Não sei'] },
    { id: 'nutrition_challenge', title: 'Qual é sua maior dificuldade com a alimentação?', kind: 'choice', options: ['Falta de tempo', 'Organização', 'Vontade de doces', 'Manter uma rotina', 'Não tenho dificuldade específica', 'Outra'] },
  ] },
  { title: '5. SAÚDE E BEM-ESTAR', questions: [
    { id: 'health_conditions', title: 'Existe alguma condição de saúde que gostaria de mencionar?', kind: 'text', placeholder: 'Opcional. Se não houver, deixe em branco.', optional: true },
    { id: 'medications', title: 'Usa algum medicamento que queira informar?', kind: 'text', placeholder: 'Opcional. Se não houver, deixe em branco.', optional: true },
    { id: 'physical_limitations', title: 'Tem alguma lesão ou limitação para atividades físicas?', kind: 'text', placeholder: 'Opcional. Se não houver, deixe em branco.', optional: true },
    { id: 'additional_notes', title: 'Há algo mais sobre sua rotina que gostaria de contar?', kind: 'text', placeholder: 'Opcional', optional: true },
  ] },
];

export default function QuestionarioScreen() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function answer(question: Question, value: string | string[]) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
    setError('');
  }

  function toggleOption(question: Question, option: string) {
    const selected = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
    const next = option === 'Nenhuma'
      ? selected.includes(option) ? [] : [option]
      : selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected.filter((item) => item !== 'Nenhuma'), option];
    answer(question, next);
  }

  async function submit() {
    const firstMissing = sections.flatMap((section) => section.questions).find((question) => {
      if (question.optional) return false;
      const value = answers[question.id];
      return Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
    });
    if (firstMissing) {
      setError(`Responda: “${firstMissing.title}”`);
      return;
    }
    const age = Number(answers.age);
    const height = Number(answers.height_cm);
    const weight = Number(answers.weight_kg);
    if (!Number.isInteger(age) || age < 13 || age > 120) return setError('Informe uma idade válida (de 13 a 120 anos).');
    if (!Number.isFinite(height) || height < 80 || height > 250) return setError('Informe uma altura válida em centímetros.');
    if (!Number.isFinite(weight) || weight < 20 || weight > 500) return setError('Informe um peso válido em quilos.');

    setError('');
    setIsSaving(true);
    try {
      await saveQuestionnaire(answers);
      router.replace('/tabs/home');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar suas respostas. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  let number = 0;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Questionário inicial</Text>
        <Text style={styles.intro}>Leva menos de 5 minutos.</Text>
        <Text style={styles.privacy}>Suas respostas ajudam a personalizar sua experiência. As perguntas de saúde são opcionais.</Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.questions.map((question) => {
              number += 1;
              const selected = answers[question.id];
              return (
                <View key={question.id} style={styles.question}>
                  <Text style={styles.questionTitle}>{number}. {question.title}{question.optional ? ' (opcional)' : ''}</Text>
                  {question.kind === 'number' || question.kind === 'text' ? (
                    <Input
                      accessibilityLabel={question.title}
                      keyboardType={question.kind === 'number' ? 'decimal-pad' : 'default'}
                      multiline={question.kind === 'text'}
                      onChangeText={(value) => answer(question, value)}
                      placeholder={question.placeholder}
                      value={typeof selected === 'string' ? selected : ''}
                      style={question.kind === 'text' ? styles.textarea : undefined}
                    />
                  ) : (
                    <View style={styles.options}>
                      {question.options?.map((option) => {
                        const isSelected = question.kind === 'multiple'
                          ? Array.isArray(selected) && selected.includes(option)
                          : selected === option;
                        return (
                          <Pressable
                            key={option}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => question.kind === 'multiple' ? toggleOption(question, option) : answer(question, option)}
                            style={[styles.option, isSelected && styles.optionSelected]}
                          >
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <Text style={styles.disclaimer}>Este questionário não substitui avaliação ou orientação de profissionais de saúde.</Text>
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <Button disabled={isSaving} onPress={submit}>{isSaving ? 'Salvando respostas...' : 'Concluir questionário'}</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Define os estilos visuais do elemento "screen".
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },
  // Define os estilos visuais do elemento "content".
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 24
  },
  // Define os estilos visuais do elemento "heading".
  heading: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8
  },
  // Define os estilos visuais do elemento "intro".
  intro: {
    color: colors.mutedText,
    fontSize: 15,
    marginTop: -12
  },
  // Define os estilos visuais do elemento "privacy".
  privacy: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19
  },
  // Define os estilos visuais do elemento "section".
  section: {
    gap: 20,
    marginTop: 8
  },
  // Define os estilos visuais do elemento "sectionTitle".
  sectionTitle: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2
  },
  // Define os estilos visuais do elemento "question".
  question: {
    gap: 9
  },
  // Define os estilos visuais do elemento "questionTitle".
  questionTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22
  },
  // Define os estilos visuais do elemento "options".
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  // Define os estilos visuais do elemento "option".
  option: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D0D5DD',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  // Define os estilos visuais do elemento "optionSelected".
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  // Define os estilos visuais do elemento "optionText".
  optionText: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '500'
  },
  // Define os estilos visuais do elemento "optionTextSelected".
  optionTextSelected: {
    color: colors.white,
    fontWeight: '700'
  },
  // Define os estilos visuais do elemento "textarea".
  textarea: {
    height: 92,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  // Define os estilos visuais do elemento "disclaimer".
  disclaimer: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18
  },
  // Define os estilos visuais do elemento "error".
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
});
