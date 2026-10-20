import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../constants/colors';
import { ThemeSurface } from '../components/ThemeSurface';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import { updateProfile } from '../services/authService';

export default function ConfiguracoesScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isActive = true;
    async function loadAccount() {
      if (!isSupabaseConfigured) {
        if (isActive) setError('Conecte o Supabase para editar sua conta.');
        if (isActive) setIsLoading(false);
        return;
      }
      try {
        const { data, error: userError } = await requireSupabase().auth.getUser();
        if (userError) throw userError;
        if (isActive && data.user) {
          setName(String(data.user.user_metadata?.name ?? ''));
          setEmail(data.user.email ?? '');
        }
      } catch (reason) {
        if (isActive) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar sua conta.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    void loadAccount();
    return () => { isActive = false; };
  }, []);

  async function save() {
    if (!name.trim() || !email.trim()) {
      setError('Preencha seu nome e e-mail.');
      return;
    }
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await updateProfile({ name, email });
      setName(String(result.user?.user_metadata?.name ?? name.trim()));
      setEmail(result.user?.email ?? email.trim());
      setNotice(result.emailChangeRequested
        ? 'Nome atualizado. Confira as caixas de e-mail para confirmar a troca de endereço.'
        : 'Nome atualizado com sucesso.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemeSurface><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={styles.backText}>Perfil</Text>
        </Pressable>

        <View style={styles.headingBlock}>
          <Text style={styles.title}>Configurações da conta</Text>
          <Text style={styles.subtitle}>Edite o nome que aparece no fórum e o e-mail da sua conta.</Text>
        </View>

        <View style={styles.formCard}>
          {isLoading ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Input label="Nome do perfil" onChangeText={setName} placeholder="Seu nome" value={name} />
              <Text style={styles.helper}>Esse nome será mostrado nas suas publicações e comentários do fórum.</Text>
              <Input autoCapitalize="none" keyboardType="email-address" label="E-mail" onChangeText={setEmail} placeholder="voce@exemplo.com" value={email} />
              {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
              {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
              <Button disabled={isSaving} onPress={save}>{isSaving ? 'Salvando...' : 'Salvar alterações'}</Button>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAFAFA',
    flex: 1
  },
  content: {
    gap: 24,
    padding: 20,
    paddingTop: 48
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40
  },
  backText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  headingBlock: {
    gap: 8
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20
  },
  formCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 22,
    gap: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3
  },
  helper: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: -8
  },
  error: {
    color: colors.danger,
    fontSize: 13
  },
  notice: {
    color: colors.primaryDark,
    fontSize: 13
  }
});
