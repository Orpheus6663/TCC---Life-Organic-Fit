import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { isSupabaseConfigured } from '../../lib/supabase';
import { addWater, getWaterForToday, type WaterLog } from '../../services/waterService';

export default function AguaScreen() {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const total = logs.reduce((sum, log) => sum + log.amount_ml, 0);
  const goal = 2000;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      setLogs(await getWaterForToday());
    } catch (error) {
      Alert.alert('Consumo de água', error instanceof Error ? error.message : 'Não foi possível carregar os registros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function registerWater(amount: number) {
    setSaving(true);
    try {
      const entry = await addWater(amount);
      setLogs((current) => [entry, ...current]);
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Água</Text>
        <Text style={styles.subtitle}>Seu consumo de hoje</Text>
        {!isSupabaseConfigured ? (
          <Text style={styles.notice}>Configure o Supabase no arquivo .env para salvar seus registros.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.amount}>{(total / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</Text>
              <Text style={styles.subtitle}>Meta diária: {(goal / 1000).toLocaleString('pt-BR')} L</Text>
              <View style={styles.track}><View style={[styles.progress, { width: `${Math.min(total / goal * 100, 100)}%` }]} /></View>
              <Text style={styles.subtitle}>{Math.min(Math.round(total / goal * 100), 100)}% da meta</Text>
            </View>
            <View style={styles.buttons}>
              {[150, 250, 500].map((amount) => (
                <Pressable accessibilityRole="button" disabled={saving} key={amount} onPress={() => void registerWater(amount)} style={styles.button}>
                  <Text style={styles.buttonText}>{saving ? 'Salvando...' : `+ ${amount} ml`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Registros de hoje</Text>
            {loading ? <Text style={styles.subtitle}>Carregando...</Text> : logs.length === 0
              ? <Text style={styles.subtitle}>Nenhum registro hoje. Adicione um copo de água.</Text>
              : logs.map((log) => <View key={log.id} style={styles.log}><Text style={styles.logAmount}>{log.amount_ml} ml</Text><Text style={styles.subtitle}>{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  content: { gap: 14, padding: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 12 },
  subtitle: { color: colors.mutedText, fontSize: 14 },
  card: { alignItems: 'center', backgroundColor: colors.lightBlue, borderRadius: 18, gap: 12, padding: 22 },
  amount: { color: colors.text, fontSize: 36, fontWeight: '800' },
  track: { backgroundColor: colors.white, borderRadius: 8, height: 13, overflow: 'hidden', width: '100%' },
  progress: { backgroundColor: colors.primary, height: '100%' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 8 },
  log: { alignItems: 'center', borderBottomColor: '#EAECF0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  logAmount: { color: colors.text, fontSize: 15, fontWeight: '600' },
  notice: { backgroundColor: '#FFF4E5', borderRadius: 12, color: colors.text, lineHeight: 21, padding: 14 },
});
