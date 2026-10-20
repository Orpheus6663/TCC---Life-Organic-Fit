import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { ThemeSurface } from '../../components/ThemeSurface';
import { colors } from '../../constants/colors';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { loadForumPosts } from '../../services/forumService';
import type { ForumPost } from '../../services/forumService';

// Recupera as publicações locais quando o fórum ainda não está conectado ao Supabase.
const FORUM_STORAGE_KEY = '@lifeorganicfit/forum-posts-v1';

// Lista de imagens do carrossel exibido no topo da Home.
const BANNERS: ImageSourcePropType[] = [
  require('@/assets/banners/pessoaFit.jpg'),
  require('../../../assets/banners/medicoComida.jpg'),
  require('@/assets/banners/exercicioComendo.jpg'),
  require('@/assets/banners/comida.jpg')
];

// Usa as mesmas opções de avatar que a pessoa escolhe na tela de perfil.
const PROFILE_AVATARS: Record<string, ImageSourcePropType> = {
  vermelho: require('../../../assets/perfil/vermelho.png'),
  verde: require('../../../assets/perfil/verde.png'),
  turquesa: require('../../../assets/perfil/turquesa.png'),
  rosa: require('../../../assets/perfil/rosa.png'),
  marrom: require('../../../assets/perfil/marrom.png'),
  laranja: require('../../../assets/perfil/laranja.png')
};

// Frases alternadas pela data local para que a mesma frase apareça durante cada dia.
const DAILY_PHRASES = [
  'O corpo alcança o que a mente acredita.',
  'A boa saúde é a chave para uma vida plena e feliz. Pequenas mudanças hoje, grandes conquistas amanhã.',
  'Saúde é o luxo que nunca sai de moda.',
  'O primeiro passo é decidir que você não vai ficar onde está.',
  'Pequenas melhorias diárias são a chave para resultados a longo prazo.',
  'Transforme intenções em ações.',
  'Cuide-se com amor e respeito, nutrindo o corpo com o que ele precisa.',
  'Quem cuida do corpo fortalece a alma.',
  'Cuidar da saúde não é uma obrigação para um dia, é um compromisso para a vida toda.',
  'Os resultados não aparecem da noite para o dia, mas aparecem para quem não desiste.',
  'O seu corpo é a sua única casa fixa. Cuide bem da sua estrutura.',
  'Seja mais forte do que a sua melhor desculpa.',
  'Cada escolha saudável é um voto a favor da pessoa que você quer se tornar.',
  'Descasque mais, desembale menos.',
  'Alimentar-se bem é uma das formas mais puras de respeito e amor-próprio.',
  'Comida de verdade nutre as células; o equilíbrio nutre a alma.',
  'Seu corpo é um reflexo do que você consome, tanto física quanto mentalmente.',
  'Não compare o seu capítulo 1 com o capítulo 20 de outra pessoa. Foque na sua evolução.',
  'O treino de hoje constrói a energia e a disposição que você terá amanhã.',
  'Comece onde você está, use o que você tem e faça o que você pode.',
  'Não precisa ser perfeito, só precisa ser constante.'
];

// Seleciona a frase usando o dia local, sem depender de conexão com a internet.
function getDailyPhrase(date = new Date()) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = Math.floor(localDate.getTime() / 86_400_000);
  return DAILY_PHRASES[dayNumber % DAILY_PHRASES.length];
}

// Define a tela inicial, exibida depois que a pessoa faz login (e completa o questionário, se for a primeira vez).
export default function HomeScreen() {
  // Guarda o índice (posição) da imagem do carrossel que está sendo mostrada agora. Começa em 0 (a primeira).
  const [bannerIndex, setBannerIndex] = useState(0);
  // Guarda o avatar selecionado no perfil para exibi-lo também na tela inicial.
  const [avatarId, setAvatarId] = useState<string | null>(null);
  // Guarda a publicação que está no topo do ranking de curtidas.
  const [trendingPosts, setTrendingPosts] = useState<ForumPost[]>([]);
  // Compartilha a posição do scroll com o cabeçalho e a forma azul do fundo.
  const scrollY = useRef(new Animated.Value(0)).current;
  // Mantém uma frase diária que também se atualiza caso o app atravesse a meia-noite aberto.
  const [dailyPhrase, setDailyPhrase] = useState(() => getDailyPhrase());

  // Agenda a próxima troca para a meia-noite local, respeitando o fuso horário do aparelho.
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const phraseTimer = setTimeout(() => setDailyPhrase(getDailyPhrase()), nextMidnight.getTime() - now.getTime());
    return () => clearTimeout(phraseTimer);
  }, [dailyPhrase]);

  // Sincroniza a foto da Home com o avatar salvo nos dados da conta do Supabase.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isActive = true;
    const client = requireSupabase();
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (isActive) setAvatarId(String(session?.user.user_metadata?.avatar_id ?? '') || null);
    });
    void client.auth.getUser().then(({ data, error }) => {
      if (isActive && !error) setAvatarId(String(data.user?.user_metadata?.avatar_id ?? '') || null);
    });
    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Atualiza o ranking periodicamente para incluir novas publicações e curtidas.
  useEffect(() => {
    let isActive = true;
    let isRefreshing = false;
    async function refreshTrendingPosts() {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const posts = isSupabaseConfigured
          ? await loadForumPosts()
          : JSON.parse((await AsyncStorage.getItem(FORUM_STORAGE_KEY)) ?? '[]') as ForumPost[];
        if (!isActive) return;
        const popularPosts = posts
          .filter((post) => post.likes > 0)
          .sort((first, second) => second.likes - first.likes || Date.parse(second.createdAt) - Date.parse(first.createdAt))
          .slice(0, 1);
        setTrendingPosts(popularPosts);
      } catch {
        // A tela inicial continua funcionando mesmo se o fórum estiver temporariamente indisponível.
      } finally {
        isRefreshing = false;
      }
    }
    void refreshTrendingPosts();
    // Atualiza automaticamente também quando uma curtida ou publicação muda no Supabase.
    const realtimeChannel = isSupabaseConfigured
      ? requireSupabase()
          .channel('home-trending-posts')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'curtidas_forum' }, () => void refreshTrendingPosts())
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'postagens_forum' }, () => void refreshTrendingPosts())
          .subscribe()
      : null;
    // Atualiza com frequência mesmo quando o Realtime não estiver habilitado no Supabase.
    const refreshTimer = setInterval(() => void refreshTrendingPosts(), isSupabaseConfigured ? 30_000 : 5_000);
    return () => {
      isActive = false;
      clearInterval(refreshTimer);
      if (realtimeChannel) void requireSupabase().removeChannel(realtimeChannel);
    };
  }, []);
  // A publicação exibida é sempre a que tem mais curtidas no ranking atual.
  const trendingPost = trendingPosts[0];
  // Troca para a imagem anterior do carrossel; se estiver na primeira, volta para a última (efeito circular).
  function bannerAnterior() {
    setBannerIndex((atual) => (atual === 0 ? BANNERS.length - 1 : atual - 1));
  }

  // Troca para a próxima imagem do carrossel; se estiver na última, volta para a primeira (efeito circular).
  function proximoBanner() {
    setBannerIndex((atual) => (atual === BANNERS.length - 1 ? 0 : atual + 1));
  }

  // Monta a interface visual da tela.
  return (
    // View mais externa: ocupa a tela inteira e serve de base para a curva decorativa no rodapé.
    <ThemeSurface><View style={styles.screen}>
      {/* Forma azul decorativa renderizada primeiro para ficar atrás do conteúdo da tela. */}
      <Animated.View pointerEvents="none" style={[styles.wave, {
        // Faz a área azul inferior crescer conforme a faixa azul do topo encolhe.
        height: scrollY.interpolate({ inputRange: [0, 220], outputRange: [140, 330], extrapolate: 'clamp' })
      }]} />

      {/* ScrollView permite rolar o conteúdo caso ele não caiba na altura da tela. */}
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* O cabeçalho rola junto com a tela e encolhe antes de sair da área visível. */}
        <View style={styles.scrollHeader}>
          <Header scrollY={scrollY} />
        </View>

        {/* Mantém a foto de perfil no topo do conteúdo da Home. */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            {avatarId && PROFILE_AVATARS[avatarId]
              ? <Image source={PROFILE_AVATARS[avatarId]} style={styles.avatarImage} />
              : <Ionicons name="person" size={28} color={colors.white} />}
          </View>
        </View>

        {/* Cartão do carrossel: uma imagem grande com setas para trocar de foto. */}
        <View style={styles.bannerCard}>
          {/* Mostra a imagem correspondente ao índice atual do carrossel. */}
          <Image
            // Carrega diretamente a imagem local escolhida pelo índice do carrossel.
            source={BANNERS[bannerIndex]}
            style={styles.bannerImage}
          />

          {/* As setas só aparecem quando houver mais de uma imagem local no carrossel. */}
          {BANNERS.length > 1 ? (
            <>
              {/* Chama bannerAnterior para voltar uma posição na lista de imagens. */}
              <Pressable onPress={bannerAnterior} style={[styles.bannerArrow, styles.bannerArrowLeft]}>
                <Text style={styles.bannerArrowText}>‹</Text>
              </Pressable>

              {/* Chama proximoBanner para avançar uma posição na lista de imagens. */}
              <Pressable onPress={proximoBanner} style={[styles.bannerArrow, styles.bannerArrowRight]}>
                <Text style={styles.bannerArrowText}>›</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {/* Linha com os dois cartões de resumo, lado a lado. */}
        <View style={styles.cardsRow}>

          {/* Primeiro cartão: mantém a meta do dia em porcentagem. */}
          <Card>
            <Text style={styles.cardTitle}>Meta do Dia</Text>
            {/* Agrupa o ícone e a porcentagem da meta na mesma linha. */}
            <View style={styles.cardInline}>
              <Text style={styles.cardEmoji}>🎯</Text>
              <Text style={styles.cardValue}>70%</Text>
            </View>
          </Card>

          {/* Segundo cartão: mostra a frase que vale para o dia atual. */}
          <Card>
            <Text style={styles.cardTitle}>Frase do Dia</Text>
            <Text style={styles.dailyPhrase}>“{dailyPhrase}”</Text>
          </Card>

        </View>

        {/* Mostra a publicação que está em primeiro lugar no ranking de curtidas. */}
        {trendingPost ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Abrir publicação em alta no fórum" onPress={() => router.push('/tabs/forum')} style={styles.trendingCard}>
              <View style={styles.trendingHeading}>
                <View style={styles.trendingTitleRow}>
                  <Ionicons name="trending-up" size={19} color={colors.primary} />
                  <Text style={styles.trendingTitle}>Em alta no fórum</Text>
                </View>
                <Text style={styles.trendingPosition}>Mais curtida</Text>
              </View>
              <View style={styles.trendingAuthorRow}>
                <Text numberOfLines={1} style={styles.trendingAuthor}>{trendingPost.authorName || 'Pessoa usuária'}</Text>
                <Text style={styles.trendingCategory}>{trendingPost.category}</Text>
              </View>
              {trendingPost.text ? <Text numberOfLines={3} style={styles.trendingText}>{trendingPost.text}</Text> : null}
              {trendingPost.imageUri ? <Image source={{ uri: trendingPost.imageUri }} style={styles.trendingImage} /> : null}
              <View style={styles.trendingFooter}>
                <Ionicons name="heart" size={17} color="#E94B68" />
                <Text style={styles.trendingLikes}>{trendingPost.likes} curtidas</Text>
                <Text style={styles.trendingLink}>Ver no fórum</Text>
              </View>
            </Pressable>
        ) : null}
      </Animated.ScrollView>

    </View></ThemeSurface>
  );
}

// Agrupa todos os estilos exclusivos desta tela.
const styles = StyleSheet.create({
  // Tela inteira, com fundo branco atrás de tudo (inclusive atrás da curva azul).
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },
  // Espaçamento do conteúdo dentro do ScrollView: espaço entre os blocos e nas bordas.
  content: {
    gap: 18,
    paddingBottom: 60,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  // Compensa o recuo interno do ScrollView para o cabeçalho continuar de ponta a ponta.
  scrollHeader: {
    marginHorizontal: -20
  },
  // Alinha o círculo do avatar à esquerda da tela.
  avatarWrapper: {
    alignItems: 'flex-start',
    marginHorizontal: 20
  },
  // Círculo que recorta a foto de perfil e mantém o ícone alinhado no estado vazio.
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E4E7EC',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56
  },
  // Preenche o círculo com a imagem do avatar selecionado no perfil.
  avatarImage: {
    height: '100%',
    width: '100%'
  },
  // Container do carrossel: cantos arredondados e "overflow: hidden" corta a imagem nas bordas.
  bannerCard: {
    borderRadius: 20,
    height: 190,
    overflow: 'hidden',
    position: 'relative'
  },
  // A imagem do carrossel ocupa 100% da largura e altura do cartão.
  bannerImage: {
    height: '100%',
    width: '100%'
  },
  // Estilo base dos botões de seta: círculo escuro semitransparente, centralizado verticalmente.
  bannerArrow: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    // Sobe metade da altura do botão para centralizá-lo no meio do banner.
    marginTop: -16,
    position: 'absolute',
    top: '50%',
    width: 32,
  },
  // Cola a seta esquerda na borda esquerda do cartão.
  bannerArrowLeft: {
    left: 10
  },
  // Cola a seta direita na borda direita do cartão.
  bannerArrowRight: {
    right: 10
  },
  // Estilo do símbolo "‹" ou "›" dentro dos botões de seta.
  bannerArrowText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700'
  },
  // Alinha os dois cartões lado a lado, com espaço entre eles.
  cardsRow: {
    flexDirection: 'row',
    gap: 14,

  },
  // Título pequeno dentro de cada cartão ("Meta do Dia" / "Sequência").
  cardTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700'
  },
  // Alinha o ícone e o valor da meta diária em uma linha.
  cardInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  // Tamanho do ícone usado ao lado da meta diária.
  cardEmoji: {
    fontSize: 22
  },
  // Destaque numérico da meta diária.
  cardValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  // Mantém a frase diária legível dentro do cartão menor da Home.
  dailyPhrase: {
    alignSelf: 'stretch',
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center'
  },
  // Estilo do texto descritivo no cartão de sequência.
  cardText: {
    color: colors.text,
    fontSize: 12.5,
    textAlign: 'center'
  },
  // Cartão de destaque que segue o estilo azul e arredondado do restante da Home.
  trendingCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#D4E7FA',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 15
  },
  // Cabeçalho do destaque com chamada e indicação do ranking.
  trendingHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  // Alinha o ícone de tendência ao título do cartão.
  trendingTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  // Título do cartão de publicações em alta.
  trendingTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  // Indica que esta é a publicação com maior número de curtidas.
  trendingPosition: { color: colors.mutedText, fontSize: 11 },
  // Linha que identifica autor e categoria da publicação.
  trendingAuthorRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  // Nome da pessoa que publicou.
  trendingAuthor: { color: colors.text, flex: 1, fontSize: 12, fontWeight: '700' },
  // Categoria pequena ao lado do autor.
  trendingCategory: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  // Trecho do conteúdo da publicação destacada.
  trendingText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  // Foto opcional anexada à publicação destacada.
  trendingImage: { borderRadius: 12, height: 150, width: '100%' },
  // Rodapé com curtidas e acesso ao fórum.
  trendingFooter: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  // Quantidade de curtidas da publicação.
  trendingLikes: { color: colors.text, fontSize: 12, fontWeight: '700' },
  // Indica que tocar no cartão abre o fórum.
  trendingLink: { color: colors.primary, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  // Forma azul arredondada no rodapé: um retângulo alto com os cantos superiores bem arredondados,
  // criando o efeito de "curva"/"onda" quando posicionado abaixo da borda visível da tela.
  wave: {
    backgroundColor: '#1800B8',
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    bottom: -40,
    height: 140,
    left: -40,
    position: 'absolute',
    right: -40
  },
});
