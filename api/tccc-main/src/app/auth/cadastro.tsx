import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../constants/colors';
import { signUp } from '../../services/authService';

// Define a tela usada para criar uma nova conta.
export default function CadastroScreen() {
  // Guarda o nome informado.
  const [name, setName] = useState('');
  // Guarda o telefone informado.
  const [phone, setPhone] = useState('');
  // Guarda o e-mail informado.
  const [email, setEmail] = useState('');
  // Guarda a senha informada.
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // É chamada quando o botão Entrar é pressionado.
  async function register() {
    // Impede o envio enquanto houver algum campo obrigatório vazio.
    if (!name.trim() || !phone.trim() || !email.trim() || !password) {
      // Mostra um aviso claro sobre o preenchimento necessário.
      setFormError('Preencha todos os campos para criar sua conta.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      const result = await signUp({ name, phone, email, password });
      if (result.session) {
        router.replace('/auth/questionario');
      } else {
        Alert.alert('Confira seu e-mail', 'O Supabase enviou um link de confirmação. Confirme o endereço antes de entrar.', [
          { text: 'Ir para login', onPress: () => router.replace('/auth/login') },
        ]);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível criar sua conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Monta a interface da tela.
  return (
    // Move o conteúdo para cima quando o teclado abre no iOS.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>

      {/* Cria o cabeçalho azul com a faixa diagonal azul-clara. */}
      <View style={styles.hero}>

         <View style={styles.darkDiagonal} />

        {/* Leva a faixa azul-clara diretamente até o canto superior direito. */}
        <View style={styles.blueDiagonal} />

        <Image accessibilityLabel="Logo Life Organic Fit" resizeMode="contain" source={require('../../../assets/lifeOrganicFit.png')} style={styles.logo} />

        {/* Exibe o nome da aplicação como parte do cabeçalho. */}
        <Text style={styles.brandName}>LIFE ORGANIC FIT</Text>

      </View>

      {/* Permite rolagem em telas pequenas ou enquanto o teclado estiver aberto. */}
      <ScrollView bounces={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* O padding superior deixa os campos mais abaixo da logo. */}
        <View style={styles.form}>

          {/* Agrupa os quatro campos necessários para o cadastro. */}
          <View style={styles.fields}>
            <Input autoComplete="name" label="Nome" onChangeText={(value) => { setName(value); setFormError(''); }} placeholder="ex.: João Silva" value={name} />
            <Input keyboardType="phone-pad" label="Telefone" onChangeText={(value) => { setPhone(value); setFormError(''); }} placeholder="(**) *********" value={phone} />
            <Input autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="E-mail" onChangeText={(value) => { setEmail(value); setFormError(''); }} placeholder="Digite seu email" value={email} />
            <Input autoComplete="new-password" label="Senha" onChangeText={(value) => { setPassword(value); setFormError(''); }} placeholder="Digite sua senha" secureTextEntry value={password} />
          </View>

          {formError ? <Text accessibilityLiveRegion="polite" style={styles.formError}>{formError}</Text> : null}

          <Button disabled={isSubmitting} onPress={register}>{isSubmitting ? 'Cadastrando...' : 'Criar conta'}</Button>

          {/* Leva quem já possui uma conta de volta à rota de login. */}
          <View style={styles.loginLine}>

            <Text style={styles.loginText}>Já possui uma conta? </Text>
            <Pressable onPress={() => router.replace('/auth/login')}>
              <Text style={styles.link}>login</Text>
            </Pressable>

          </View>
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

  // Define o cabeçalho azul fixo atrás do conteúdo.
  hero: {
    backgroundColor: colors.white,
    height: 400,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%'
  },

  // Cria a faixa azul-clara em diagonal, sem recorte branco sobre ela.
  darkDiagonal: {
    backgroundColor: '#1800B8',
    height: 250,
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
    height: 102,
    marginTop: 80,
    width: 180
  },

  // Posiciona o nome logo abaixo do símbolo, seguindo a referência visual.
  brandName: {
    alignSelf: 'center',
    color: colors.text,
    fontFamily: 'serif',
    fontSize: 20,
    fontStyle: 'italic',
    marginTop: 40,
    transform: [{ rotate: '0deg' }],
    fontWeight:'bold'
  },

  // Garante espaço abaixo do conteúdo rolável.
  scroll: {
    flexGrow: 1,
    paddingBottom: 32
  },
  
    // Posiciona o formulário após a área visual superior.
  form: {
    gap: 18,
    paddingHorizontal: 40,
    paddingTop: 283
  },
  
    // Mantém uma distância uniforme entre os campos.
  fields: {
    gap: 13
  },

  // Define os estilos visuais do elemento "formError".
  formError: {
    color: colors.danger,
    fontSize: 13,
    marginTop: -8
  },

  // Mantém a mensagem e o link de login na mesma linha.
  loginLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -5
  },

  // Define a aparência do texto não clicável.
  loginText: {
    color: colors.mutedText,
    fontSize: 14
  },

  // Destaca o link clicável na cor primária.
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800'
  },
});
