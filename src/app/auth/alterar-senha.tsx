import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemeSurface } from '../../components/ThemeSurface';
import { colors } from '../../constants/colors';
import { getPasswordValidationMessage, updatePassword } from '../../services/authService';
import { requireSupabase } from '../../lib/supabase';

function readCallbackParams(url: string) {
  const [beforeHash, hash = ''] = url.split('#', 2);
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  return new URLSearchParams([query, hash].filter(Boolean).join('&'));
}

export default function ChangePasswordScreen() {
  const [isLinkVerified, setIsLinkVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function consumeRecoveryLink(url: string) {
      const params = readCallbackParams(url);
      const providerError = params.get('error_description') || params.get('error');
      if (providerError) {
        if (isActive) setError(providerError.replaceAll('+', ' '));
        return;
      }

      try {
        const client = requireSupabase();
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const tokenHash = params.get('token_hash');
        const code = params.get('code');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw sessionError;
        } else if (tokenHash) {
          const { error: verifyError } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (verifyError) throw verifyError;
        } else if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          if (isActive) setError('Abra o link de recuperação enviado ao seu e-mail neste aparelho.');
          return;
        }

        if (isActive) {
          setIsLinkVerified(true);
          setError('');
        }
      } catch (linkError) {
        if (isActive) setError(linkError instanceof Error ? linkError.message : 'O link expirou ou não é válido. Solicite outro.');
      }
    }

    const subscription = Linking.addEventListener('url', ({ url }) => { void consumeRecoveryLink(url); });
    void Linking.getInitialURL().then((url) => {
      if (url) return consumeRecoveryLink(url);
      if (isActive) setError('Abra o link de recuperação enviado ao seu e-mail neste aparelho.');
    }).catch(() => {
      if (isActive) setError('Não consegui abrir o link de recuperação. Solicite outro e tente novamente.');
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);

  async function submit() {
    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await updatePassword(password);
      await requireSupabase().auth.signOut({ scope: 'local' });
      setNotice('Senha alterada. Entre com a nova senha.');
      setTimeout(() => router.replace('/auth/login'), 900);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível alterar a senha. Solicite um novo link.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemeSurface>
      <View style={styles.screen}>
        <Text style={styles.title}>Criar nova senha</Text>
        <Text style={styles.description}>Use o link de recuperação enviado pelo Life Organic Fit e escolha uma senha nova.</Text>
        {isLinkVerified ? (
          <View style={styles.form}>
            <Input autoComplete="new-password" label="Nova senha" onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry value={password} />
            <Input autoComplete="new-password" label="Confirme a nova senha" onChangeText={(value) => { setConfirmation(value); setError(''); }} secureTextEntry value={confirmation} />
            <Button disabled={isSaving} onPress={submit}>{isSaving ? 'Salvando...' : 'Salvar nova senha'}</Button>
          </View>
        ) : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        <Pressable accessibilityRole="link" onPress={() => router.replace('/auth/login')} style={styles.backLink}>
          <Text style={styles.linkText}>Voltar ao login</Text>
        </Pressable>
      </View>
    </ThemeSurface>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1, gap: 20, justifyContent: 'center', padding: 28 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  description: { color: colors.mutedText, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  form: { gap: 16 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  notice: { color: colors.primary, fontSize: 14, textAlign: 'center' },
  backLink: { alignItems: 'center', padding: 10 },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
});
