import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import { Header } from '../../components/Header';
import { NotificationBell } from '../../components/NotificationBell';
import { ThemeSurface } from '../../components/ThemeSurface';
import { colors } from '../../constants/colors';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { loadForumPosts } from '../../services/forumService';
import type { ForumPost } from '../../services/forumService';
import { getMeals } from '../../services/mealService';
import { getQuestionnaireAnswersForCurrentUser } from '../../services/questionnaireService';
import { estimateDailyCalorieTarget } from '../../services/calorieGoalService';
import { getDemoProfilePhoto } from '../../services/demoPremiumService';

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
  const [profileName, setProfileName] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [consumedCalories, setConsumedCalories] = useState(0);
  const [targetCalories, setTargetCalories] = useState<number | null>(null);
  // Guarda a publicação que está no topo do ranking de curtidas.
  const [trendingPosts, setTrendingPosts] = useState<ForumPost[]>([]);
  // Compartilha a posição do scroll com o cabeçalho e a forma azul do fundo.
  const scrollY = useRef(new Animated.Value(0)).current;
  // Mantém uma frase diária que também se atualiza caso o app atravesse a meia-noite aberto.
  const [dailyPhrase, setDailyPhrase] = useState(() => getDailyPhrase());

  useFocusEffect(useCallback(() => {
    let isActive = true;
    async function loadDailySummary() {
      try {
        const localPhoto = await getDemoProfilePhoto();
        if (isActive) setProfilePhotoUri(localPhoto);
        const meals = await getMeals();
        if (!isActive) return;
        setConsumedCalories(meals.reduce((total, meal) => total + meal.calories, 0));
        if (isSupabaseConfigured) {
          try {
            const answers = await getQuestionnaireAnswersForCurrentUser();
            if (isActive) setTargetCalories(estimateDailyCalorieTarget(answers));
          } catch {
            if (isActive) setTargetCalories(null);
          }
        } else if (isActive) {
          setTargetCalories(null);
        }
      } catch {
        if (isActive) {
          setConsumedCalories(0);
          setTargetCalories(null);
        }
      }
    }
    void loadDailySummary();
    return () => { isActive = false; };
  }, []));

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
      if (isActive) {
        setAvatarId(String(session?.user.user_metadata?.avatar_id ?? '') || null);
        setProfileName(String(session?.user.user_metadata?.name ?? ''));
      }
    });
    void client.auth.getUser().then(({ data, error }) => {
      if (isActive && !error) {
        setAvatarId(String(data.user?.user_metadata?.avatar_id ?? '') || null);
        setProfileName(String(data.user?.user_metadata?.name ?? ''));
      }
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
  const calorieProgress = targetCalories ? Math.min(consumedCalories / targetCalories, 1) : 0;
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
          <View style={styles.profileIdentity}>
            <View style={styles.avatar}>
              {profilePhotoUri
                ? <Image source={{ uri: profilePhotoUri }} style={styles.avatarImage} />
                : avatarId && PROFILE_AVATARS[avatarId]
                ? <Image source={PROFILE_AVATARS[avatarId]} style={styles.avatarImage} />
                : <Ionicons name="person" size={28} color={colors.white} />}
            </View>
            <Text numberOfLines={1} style={styles.profileName}>{profileName || 'Olá!'}</Text>
          </View>
          <NotificationBell inline />
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

        <Pressable accessibilityRole="button" accessibilityLabel="Ver calorias consumidas e refeições" onPress={() => router.push('/tabs/refeicoes')} style={styles.calorieSummary}>
            <View style={styles.calorieTopRow}>
              <View style={styles.calorieIconCircle}><Ionicons name="flame" size={42} color={colors.primary} /></View>
              <View style={styles.calorieSummaryText}>
                <Text style={styles.cardTitle}>Calorias de hoje</Text>
                <Text accessibilityLabel={`${consumedCalories} quilocalorias consumidas de ${targetCalories ?? 'meta não disponível'} quilocalorias`} style={styles.calorieSummaryValue}>{consumedCalories.toLocaleString('pt-BR')} kcal</Text>
              </View>
              <View style={styles.calorieDivider} />
              <View style={styles.calorieArrow}><Ionicons name="arrow-forward" size={22} color={colors.primary} /></View>
            </View>
            <View style={styles.calorieProgressTrack}>
              <View style={[styles.calorieProgressFill, { width: `${calorieProgress * 100}%` }]} />
            </View>
            <Text style={styles.calorieSummaryHint}>
              {targetCalories === null
                ? 'Meta estimada indisponível. Confira seu questionário.'
                : `Meta diária estimada: ${targetCalories.toLocaleString('pt-BR')} kcal`}
            </Text>
        </Pressable>

        <View style={styles.phraseCard}>
            <View style={styles.phraseIconCircle}><Ionicons name="calendar" size={40} color={colors.primary} /></View>
            <View style={styles.phraseCopy}>
              <Text style={styles.cardTitle}>Frase do Dia</Text>
              <Text style={styles.dailyPhrase}>“{dailyPhrase}”</Text>
            </View>
            <Ionicons name="create" size={26} color={colors.primary} style={styles.phraseDecoration} />
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  profileIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10, maxWidth: '100%' },
  profileName: { color: colors.primaryDark, flexShrink: 1, fontSize: 16, fontWeight: '700' },
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
    resizeMode: 'cover',
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
  calorieSummary: {
    backgroundColor: 'rgba(115, 216, 244, 0.28)',
    borderColor: '#B8E8F5',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13
  },
  calorieTopRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  calorieIconCircle: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 29, height: 58, justifyContent: 'center', width: 58 },
  calorieSummaryText: { flex: 1, gap: 2 },
  calorieSummaryValue: { color: colors.primary, fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  calorieDivider: { backgroundColor: colors.mediumBlue, height: 58, width: 1.5 },
  calorieArrow: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  calorieProgressTrack: { backgroundColor: colors.white, borderColor: colors.mediumBlue, borderRadius: 6, borderWidth: 1, height: 10, overflow: 'hidden' },
  calorieProgressFill: { backgroundColor: colors.primary, borderRadius: 7, height: '100%' },
  calorieSummaryHint: { color: colors.primary, fontSize: 11, textAlign: 'center' },
  phraseCard: { alignItems: 'center', backgroundColor: 'rgba(115, 216, 244, 0.28)', borderColor: '#B8E8F5', borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 90, paddingHorizontal: 16, paddingVertical: 13 },
  phraseIconCircle: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 29, height: 58, justifyContent: 'center', width: 58 },
  phraseCopy: { flex: 1, gap: 5 },
  phraseDecoration: { alignSelf: 'flex-start', marginTop: 2, transform: [{ rotate: '35deg' }] },
  // Título pequeno dentro de cada cartão ("Meta do Dia" / "Sequência").
  cardTitle: {
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: '700'
  },
  // Mantém a frase diária legível dentro do cartão menor da Home.
  dailyPhrase: {
    alignSelf: 'stretch',
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'left'
  },
  // Cartão de destaque que segue o estilo azul e arredondado do restante da Home.
  trendingCard: {
    backgroundColor: colors.white,
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
    backgroundColor: colors.primaryDark,
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    bottom: -40,
    height: 140,
    left: -40,
    position: 'absolute',
    right: -40
  },
});
