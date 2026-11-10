import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeSurface } from '../components/ThemeSurface';
import { colors } from '../constants/colors';
import { activateDemoPremium, hasDemoPremium } from '../services/demoPremiumService';

const ink = colors.primaryDark;
const pale = '#EAF8FC';

const benefits = [
  { icon: 'person-circle-outline' as const, text: 'Escolha uma foto da galeria para o seu perfil' },
  { icon: 'camera-outline' as const, text: 'Em breve: estime as calorias do prato pela foto' },
  { icon: 'chatbox-ellipses-outline' as const, text: 'Experiência ainda mais completa na comunidade' },
  { icon: 'trophy-outline' as const, text: 'Funcionalidades exclusivas' },
];

export default function AssinaturaScreen() {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [isDemoSubscribed, setIsDemoSubscribed] = useState(false);

  useEffect(() => {
    hasDemoPremium().then(setIsDemoSubscribed).catch(() => setIsDemoSubscribed(false));
  }, []);

  async function subscribe() {
    try {
      await activateDemoPremium();
      setIsDemoSubscribed(true);
    } catch {
      Alert.alert('Não foi possível ativar', 'Não conseguimos salvar a ativação Premium neste aparelho.');
      return;
    }
    setIsDemoSubscribed(true);
    const selectedPlan = plan === 'monthly' ? 'Plano Mensal — R$ 19,90/mês' : 'Plano Anual — R$ 149,90/ano';
    Alert.alert('Assinatura simulada!', `${selectedPlan}\n\nModo demonstração: nenhum pagamento foi realizado.`);
  }

  return (
    <ThemeSurface>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={25} color={ink} />
        </Pressable>

        <View style={styles.logo}><Text style={styles.logoText}>LOF</Text><Ionicons name="leaf" size={22} color={ink} /></View>
        <View style={styles.crown}><Ionicons name="sparkles" size={24} color={ink} /><Ionicons name="trophy" size={62} color={ink} /><Ionicons name="sparkles" size={24} color={ink} /></View>
        <Text style={styles.title}>Seja Premium!</Text>
        <Text style={styles.subtitle}>Desbloqueie todo o potencial do LOF e cuide ainda melhor da sua saúde!</Text>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit.text} style={styles.benefit}>
              <Ionicons name={benefit.icon} size={21} color={ink} />
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        <Pressable accessibilityRole="radio" accessibilityState={{ selected: plan === 'monthly' }} onPress={() => setPlan('monthly')} style={[styles.plan, plan === 'monthly' && styles.selectedPlan]}>
          <View style={styles.planCopy}><Text style={styles.planName}>Plano Mensal</Text><Text style={styles.planCaption}>Renove todo mês e continue evoluindo!</Text></View>
          <Text style={styles.price}>R$ 19,90<Text style={styles.period}>/mês</Text></Text>
          <Ionicons name={plan === 'monthly' ? 'radio-button-on' : 'radio-button-off'} size={24} color={ink} />
        </Pressable>

        <Pressable accessibilityRole="radio" accessibilityState={{ selected: plan === 'annual' }} onPress={() => setPlan('annual')} style={[styles.plan, styles.annualPlan, plan === 'annual' && styles.annualSelected]}>
          <View style={styles.popular}><Text style={styles.popularText}>Mais popular ✨</Text></View>
          <View style={styles.planCopy}><Text style={[styles.planName, styles.lightText]}>Plano Anual</Text><Text style={[styles.planCaption, styles.lightText]}>Economize e cuide da sua saúde por ainda mais tempo!</Text></View>
          <View style={styles.annualPrice}><Text style={[styles.price, styles.lightText]}>R$ 149,90<Text style={[styles.period, styles.lightText]}>/ano</Text></Text><Text style={styles.equivalent}>(equivalente a R$ 12,49/mês)</Text></View>
          <Ionicons name={plan === 'annual' ? 'radio-button-on' : 'radio-button-off'} size={24} color={colors.white} />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={subscribe} style={styles.cta}><Text style={styles.ctaText}>{isDemoSubscribed ? 'Premium de demonstração ativado' : 'Assinar Agora'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/tabs/home')} style={styles.skip}><Text style={styles.skipText}>Continuar sem Premium</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => Alert.alert('Termos e privacidade', 'Os termos de uso e a política de privacidade estarão disponíveis em breve.')}><Text style={styles.terms}>Termos de Uso e Política de Privacidade</Text></Pressable>
      </ScrollView>
    </ThemeSurface>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', backgroundColor: colors.inputBackground, flexGrow: 1, gap: 14, justifyContent: 'center', paddingBottom: 28, paddingHorizontal: 22, paddingTop: 28 },
  back: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center' },
  logo: { alignItems: 'center', flexDirection: 'row' },
  logoText: { color: ink, fontSize: 30, fontStyle: 'italic', fontWeight: '900' },
  crown: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 8 },
  title: { color: ink, fontSize: 27, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: ink, fontSize: 15, lineHeight: 21, maxWidth: 340, textAlign: 'center' },
  benefits: { alignSelf: 'stretch', backgroundColor: pale, borderRadius: 18, gap: 12, marginVertical: 2, padding: 16 },
  benefit: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  benefitText: { color: ink, flex: 1, fontSize: 13 },
  plan: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.white, borderColor: colors.primary, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 78, paddingHorizontal: 13, paddingVertical: 12 },
  selectedPlan: { borderWidth: 1.6 },
  planCopy: { flex: 1, gap: 3 },
  planName: { color: ink, fontSize: 15, fontWeight: '800' },
  planCaption: { color: ink, fontSize: 11, lineHeight: 15 },
  price: { color: ink, fontSize: 15, fontWeight: '800' },
  period: { fontSize: 12, fontWeight: '400' },
  annualPlan: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark, marginTop: 2, minHeight: 88 },
  annualSelected: { borderWidth: 2 },
  lightText: { color: colors.white },
  annualPrice: { alignItems: 'flex-start' },
  equivalent: { color: colors.lightBlue, fontSize: 9 },
  popular: { backgroundColor: colors.mediumBlue, borderRadius: 12, left: 12, paddingHorizontal: 9, paddingVertical: 4, position: 'absolute', top: -11 },
  popularText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  cta: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 28, marginTop: 8, paddingVertical: 15 },
  ctaText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  skip: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  skipText: { color: ink, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  terms: { color: ink, fontSize: 11, textDecorationLine: 'underline' },
});
