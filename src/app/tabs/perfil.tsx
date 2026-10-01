import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { signOut } from '../../services/authService';

export default function PerfilScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    requireSupabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')).catch(() => setEmail(''));
  }, []);

  async function logout() {
    setIsSubmitting(true);
    setError('');
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível sair da conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.email}>{email || 'Entre na sua conta para ver seu perfil.'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {email
          ? <Button disabled={isSubmitting} onPress={logout}>{isSubmitting ? 'Saindo...' : 'Sair da conta'}</Button>
          : <Button onPress={() => router.push('/auth/login')}>Entrar ou criar conta</Button>}
      </View>
    </View>
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
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24
  },
  // Define os estilos visuais do elemento "title".
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  // Define os estilos visuais do elemento "email".
  email: {
    color: colors.mutedText,
    fontSize: 15,
    textAlign: 'center'
  },
  // Define os estilos visuais do elemento "error".
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center'
  },
});
