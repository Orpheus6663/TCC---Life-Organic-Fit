import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemeSurface } from '../../components/ThemeSurface';
import { colors } from '../../constants/colors';
import { sendPasswordRecovery } from '../../services/authService';

export default function RecoverPasswordScreen() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError('Digite o e-mail da sua conta.');
      return;
    }
    setError('');
    setNotice('');
    setIsSending(true);
    try {
      await sendPasswordRecovery(email);
      setNotice('Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ThemeSurface>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.description}>Informe o e-mail da conta. Enviaremos um link para você escolher uma nova senha.</Text>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="E-mail da conta"
            onChangeText={(value) => { setEmail(value); setError(''); setNotice(''); }}
            placeholder="Digite seu e-mail"
            value={email}
          />
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          <Button disabled={isSending} onPress={submit}>{isSending ? 'Enviando...' : 'Enviar link de recuperação'}</Button>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/auth/login')} style={styles.backLink}>
            <Text style={styles.linkText}>Voltar ao login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemeSurface>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  content: { flexGrow: 1, gap: 20, justifyContent: 'center', padding: 28 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  description: { color: colors.mutedText, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  notice: { color: colors.primary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  backLink: { alignItems: 'center', padding: 10 },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
});
