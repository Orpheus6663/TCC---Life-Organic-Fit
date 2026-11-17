import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../constants/colors';
import { signIn } from '../../services/authService';
import { hasCompletedQuestionnaire } from '../../services/questionnaireService';

// Define a tela usada por pessoas que já possuem uma conta.
export default function LoginScreen() {
  // Guarda o e-mail informado.
  const [email, setEmail] = useState('');
  // Guarda a senha informada.
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // É chamada quando o botão Entrar é pressionado.
  async function submitSignIn() {
    // Impede o envio enquanto houver algum campo obrigatório vazio.
    if (!email.trim() || !password) {
      // Mostra um aviso claro sobre o preenchimento necessário.
      setFormError('Informe seu e-mail e sua senha para entrar.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      const questionnaireComplete = await hasCompletedQuestionnaire();
      router.replace(questionnaireComplete ? '/tabs/home' : '/auth/questionario');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Monta a interface da tela.
  return (
    // Move o conteúdo para cima quando o teclado abre no iOS.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>

      {/* Cria o cabeçalho com fundo branco e as faixas diagonais por cima. */}
      <View style={styles.hero}>

        {/* Faixa diagonal escura, cobrindo o canto até a borda. */}
        <View style={styles.darkDiagonal} />

        {/* Faixa diagonal azul-clara, sobreposta à faixa escura. */}
        <View style={styles.blueDiagonal} />

        {/* Usa o arquivo de logo de assets, sem cartão ou retângulo branco. */}
        <Image accessibilityLabel="Logo Life Organic Fit" resizeMode="contain" source={require('../../../assets/lifeOrganicFit.png')} style={styles.logo} />

        {/* Exibe o nome da aplicação como parte do cabeçalho. */}
        <Text style={styles.brandName}>LIFE ORGANIC FIT</Text>

      </View>
      {/* Permite rolagem em telas pequenas ou enquanto o teclado estiver aberto. */}
      <ScrollView bounces={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* O padding superior deixa os campos mais abaixo da logo. */}
        <View style={styles.form}>

          {/* Agrupa os campos de acesso. */}
          <View style={styles.fields}>

            <Input autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="Digite seu email" value={email} />
            <Input autoComplete="password" label="Senha" onChangeText={setPassword} placeholder="Digite sua senha" secureTextEntry value={password} />

          </View>
          {/* Agrupa os links de recuperação de senha e criação de conta na mesma linha. */}
          <View style={styles.linksRow}>

            <Pressable
              accessibilityRole="button"
              onPress={() => setFormError('A recuperação de senha ainda precisa ser configurada no Supabase.')}
              style={({ hovered, pressed }) => (hovered || pressed ? styles.linkPressed : undefined)}
            >
              <Text style={styles.linkUnderline}>esqueci minha senha</Text>
            </Pressable>

            {/* Separa visualmente os dois links. */}
            <Text style={styles.divider}>|</Text>

            {/* Leva novos usuários à rota de cadastro. */}
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/auth/cadastro')}
              style={({ hovered, pressed }) => (hovered || pressed ? styles.linkPressed : undefined)}
            >
              <Text style={styles.linkUnderline}>criar conta</Text>
            </Pressable>

          </View>

          {formError ? <Text accessibilityLiveRegion="polite" style={styles.formError}>{formError}</Text> : null}
          <Button disabled={isSubmitting} onPress={submitSignIn}>{isSubmitting ? 'Entrando...' : 'Entrar'}</Button>

          {/* Permite navegar pelas telas antes de configurar a conta e o Supabase. */}
          <Pressable accessibilityRole="button" onPress={() => router.replace('/tabs/home')} style={styles.demoButton}>
            <Text style={styles.demoText}>Continuar sem conta</Text>
          </Pressable>
          
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Centraliza todos os estilos exclusivos desta tela.
const styles = StyleSheet.create({
  // Faz a tela ocupar toda a altura, com fundo branco.
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },

  // Define o cabeçalho com fundo branco; as diagonais é que trazem a cor.
  hero: {
    backgroundColor: colors.white,
    height: 400,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%'
  },

  // Cria a faixa escura em diagonal, ainda maior para garantir que cubra todo o canto.
  darkDiagonal: {
    backgroundColor: '#1800B8',
    height: 280,
    left: '-20%',
    position: 'absolute',
    top: -90,
    transform: [{ rotate: '-20deg' }],
    width: '180%'
  },

  // Cria a faixa azul-clara em diagonal, por cima da faixa escura.
  blueDiagonal: {
    backgroundColor: '#4D93B9',
    height: 80,
    left: '-10%',
    position: 'absolute',
    top: 150,
    transform: [{ rotate: '-20deg' }],
    width: '150%'
  },

  // Centraliza e limita o tamanho da imagem transparente da logo.
  logo: {
    alignSelf: 'center',
    height: 140,
    marginTop: 105,
    width: 160
  },

  // Posiciona o nome logo abaixo do símbolo, com menos rotação e fonte maior.
  brandName: {
    alignSelf: 'center',
    color: colors.text,
    fontFamily: 'serif',
    fontSize: 26,
    fontStyle: 'italic',
    marginTop: 6,
    transform: [{ rotate: '0deg' }],
    fontWeight: 'bold'
  },

  // Garante espaço abaixo do conteúdo rolável.
  scroll: {
    flexGrow: 1,
    paddingBottom: 36
  },

  // Posiciona o formulário bem mais abaixo, afastado do cabeçalho.
  form: {
    flex: 1,
    gap: 20,
    paddingHorizontal: 40,
    paddingTop: 380
  },

  // Mantém uma distância uniforme entre os campos.
  formError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center'
  },
  // Define os estilos visuais do elemento "demoButton".
  demoButton: {
    alignItems: 'center',
    paddingVertical: 10
  },
  // Define os estilos visuais do elemento "demoText".
  demoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  // Define os estilos visuais do elemento "fields".
  fields: {
    gap: 16
  },

  // Alinha os dois links lado a lado, centralizados.
  linksRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -4
  },
  // Define a aparência dos links sublinhados.
  linkUnderline: {
    color: colors.primary,
    fontSize: 13,
    textDecorationLine: 'underline'
  },

  // Dá retorno visual ao passar o mouse ou tocar nos links.
  linkPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.97 }]
  },

  // Estiliza a barra que separa os dois links.
  divider: {
    color: colors.mutedText,
    fontSize: 13,
    marginHorizontal: 10
  },
});
