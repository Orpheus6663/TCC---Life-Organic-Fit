import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../constants/colors';
import { ThemeSurface } from '../../components/ThemeSurface';
import { getPasswordValidationMessage, signUp } from '../../services/authService';
import { clearRegistrationDraft, restoreRegistrationDraft, type RegistrationDraft } from '../../services/registrationDraft';
import { isQuestionnaireAnswers, saveQuestionnaire, saveQuestionnaireForUser } from '../../services/questionnaireService';
import type { QuestionnaireAnswers } from '../../services/questionnaireService';

const ANSWERS_STORAGE_KEY = '@lifeorganicfit/questionnaire-draft-v1';

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
  const [registration, setRegistration] = useState<RegistrationDraft | null>(null);
  const [password, setPassword] = useState('');
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    let isActive = true;
    const restoreAnswers = AsyncStorage.getItem(ANSWERS_STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed: unknown = JSON.parse(saved);
        if (isQuestionnaireAnswers(parsed) && isActive) setAnswers(parsed);
      })
      .catch(() => {
        if (isActive) setError('Não foi possível recuperar as respostas salvas neste aparelho.');
      });
    const restoreRegistration = restoreRegistrationDraft()
      .then((saved) => {
        if (isActive) setRegistration(saved);
      })
      .catch(() => {
        if (isActive) setError('Não foi possível recuperar os dados temporários do cadastro.');
      });

    Promise.all([restoreAnswers, restoreRegistration]).finally(() => {
      if (isActive) setIsDraftRestored(true);
    });
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!isDraftRestored || isSaving || needsEmailConfirmation || isFinished) return;
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers)).catch(() => {
        setError('Não foi possível salvar o rascunho neste aparelho.');
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [answers, isDraftRestored, isSaving, needsEmailConfirmation, isFinished]);

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

  function moveToNextSection() {
    const section = sections[currentSection];
    const firstMissing = section.questions.find((question) => {
      if (question.optional) return false;
      const value = answers[question.id];
      return Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
    });
    if (firstMissing) {
      setError(`Responda: “${firstMissing.title}”`);
      return;
    }
    if (currentSection === 0) {
      const age = Number(answers.age);
      const height = Number(answers.height_cm);
      const weight = Number(answers.weight_kg);
      if (!Number.isInteger(age) || age < 13 || age > 120) return setError('Informe uma idade válida (de 13 a 120 anos).');
      if (!Number.isFinite(height) || height < 80 || height > 250) return setError('Informe uma altura válida em centímetros.');
      if (!Number.isFinite(weight) || weight < 20 || weight > 500) return setError('Informe um peso válido em quilos.');
    }
    setError('');
    setCurrentSection((current) => Math.min(current + 1, sections.length - 1));
  }

  function moveToPreviousSection() {
    if (currentSection === 0) {
      router.back();
      return;
    }
    setError('');
    setCurrentSection((current) => Math.max(current - 1, 0));
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
    if (registration) {
      const registrationPassword = registration.password || password;
      if (!registrationPassword) return setError('Digite sua senha novamente para concluir o cadastro.');
      const passwordError = getPasswordValidationMessage(registrationPassword);
      if (passwordError) return setError(passwordError);
    }

    setError('');
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers));
      let newlyCreatedUserId: string | null = null;
      if (registration) {
        const result = await signUp({ ...registration, password: registration.password || password }, answers);
        await clearRegistrationDraft();
        setRegistration(null);
        if (!result.session) {
          setNeedsEmailConfirmation(true);
          setNotice('Cadastro concluído. Confirme seu e-mail; suas respostas serão salvas quando você entrar.');
          await AsyncStorage.removeItem(ANSWERS_STORAGE_KEY);
          return;
        }
        newlyCreatedUserId = result.user?.id ?? result.session.user.id;
      }
      if (newlyCreatedUserId) {
        await saveQuestionnaireForUser(newlyCreatedUserId, answers);
      } else {
        await saveQuestionnaire(answers);
      }
      setIsFinished(true);
      await AsyncStorage.removeItem(ANSWERS_STORAGE_KEY);
      router.replace('/assinatura');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar suas respostas. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  let number = sections.slice(0, currentSection).reduce((total, section) => total + section.questions.length, 0);
  return (
    <ThemeSurface><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
        <View style={styles.hero}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={moveToPreviousSection} style={styles.backButton}>
            <Ionicons color={colors.primary} name="chevron-back" size={30} />
          </Pressable>
          <View style={styles.heroIcon}><Ionicons color={colors.primary} name="clipboard-outline" size={32} /></View>
          <Text style={styles.heading}>Questionário inicial</Text>
          <Text style={styles.intro}>Conte um pouco sobre você para personalizarmos sua experiência!</Text>
        </View>
        <Text style={styles.autosave}>Suas respostas são salvas automaticamente neste aparelho.</Text>
        <Text style={styles.privacy}>Suas respostas ajudam a personalizar sua experiência. As perguntas de saúde são opcionais.</Text>

          <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: sections.length, now: currentSection + 1 }} style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((currentSection + 1) / sections.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{currentSection + 1} de {sections.length}</Text>
        {registration && !registration.password ? (
          <View style={styles.question}>
            <Text style={styles.questionTitle}>Digite sua senha novamente para concluir o cadastro.</Text>
            <Input accessibilityLabel="Senha" editable={!isSaving} onChangeText={setPassword} secureTextEntry value={password} />
          </View>
        ) : null}

        {sections.slice(currentSection, currentSection + 1).map((section) => (
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
                      editable={isDraftRestored && !isSaving && !needsEmailConfirmation}
                      keyboardType={question.kind === 'number' ? 'decimal-pad' : 'default'}
                      multiline={question.kind === 'text'}
                      onChangeText={(value) => answer(question, value)}
                      placeholder={question.placeholder}
                      value={typeof selected === 'string' ? selected : ''}
                      style={[styles.field, question.kind === 'text' && styles.textarea]}
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
                            disabled={!isDraftRestored || isSaving || needsEmailConfirmation}
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
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        {needsEmailConfirmation ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/login')}>
            <Text style={styles.loginLink}>Já confirmou o e-mail? Entrar</Text>
          </Pressable>
        ) : null}
        <Button disabled={!isDraftRestored || isSaving || needsEmailConfirmation} onPress={currentSection === sections.length - 1 ? submit : moveToNextSection}>
          {isSaving ? 'Salvando respostas...' : needsEmailConfirmation ? 'Cadastro concluído' : currentSection === sections.length - 1 ? 'Concluir questionário' : 'Próximo'}
        </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  // Define os estilos visuais do elemento "screen".
  screen: {
    backgroundColor: '#EEF6FF',
    flex: 1
  },
  // Define os estilos visuais do elemento "content".
  content: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 18,
    paddingTop: 18
  },
  panel: { backgroundColor: colors.white, borderColor: '#DCEBFF', borderRadius: 30, borderWidth: 1, elevation: 4, gap: 18, padding: 20, shadowColor: '#174A8B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18 },
  hero: { alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingTop: 4 },
  backButton: { alignSelf: 'flex-start', alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  progressTrack: { alignSelf: 'stretch', backgroundColor: '#E3EEFC', borderRadius: 8, height: 10, overflow: 'hidden', marginTop: 4 },
  progressFill: { backgroundColor: colors.primary, borderRadius: 8, height: '100%' },
  progressLabel: { color: '#101B58', fontSize: 14, fontWeight: '700' },
  heroIcon: { alignItems: 'center', backgroundColor: '#E6F1FF', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  // Define os estilos visuais do elemento "heading".
  heading: {
    color: '#101B58',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center'
  },
  // Define os estilos visuais do elemento "intro".
  intro: {
    color: '#587BAF',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center'
  },
  autosave: {
    color: '#587BAF',
    fontSize: 13
  },
  // Define os estilos visuais do elemento "privacy".
  privacy: {
    color: '#587BAF',
    fontSize: 13,
    lineHeight: 19
  },
  // Define os estilos visuais do elemento "section".
  section: {
    backgroundColor: '#F5F9FF',
    borderColor: '#E1EEFF',
    borderRadius: 23,
    borderWidth: 1,
    gap: 14,
    padding: 16
  },
  // Define os estilos visuais do elemento "sectionTitle".
  sectionTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2
  },
  // Define os estilos visuais do elemento "question".
  question: {
    backgroundColor: colors.white,
    borderColor: '#E1EEFF',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  // Define os estilos visuais do elemento "questionTitle".
  questionTitle: {
    color: '#101B58',
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
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#D8E8FF',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  // Define os estilos visuais do elemento "optionSelected".
  optionSelected: {
    backgroundColor: '#EAF3FF',
    borderColor: colors.primary,
    borderWidth: 2
  },
  // Define os estilos visuais do elemento "optionText".
  optionText: {
    color: '#101B58',
    fontSize: 14,
    fontWeight: '500'
  },
  // Define os estilos visuais do elemento "optionTextSelected".
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '700'
  },
  // Define os estilos visuais do elemento "textarea".
  textarea: {
    height: 92,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  field: { backgroundColor: colors.white, borderColor: '#D8E8FF', borderRadius: 16, borderWidth: 1, minHeight: 54 },
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
  notice: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  loginLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
});
