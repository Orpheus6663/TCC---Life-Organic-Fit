import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../constants/colors';
import { ThemeSurface } from '../../components/ThemeSurface';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { createForumComment, createForumPost, deleteForumComment, deleteForumPost, loadForumPosts, toggleForumLike, uploadForumImage } from '../../services/forumService';

// Chave fixa usada para salvar e recuperar os posts neste dispositivo.
const STORAGE_KEY = '@lifeorganicfit/forum-posts-v1';
const avatarSources: Record<string, ImageSourcePropType> = {
  vermelho: require('../../../assets/perfil/vermelho.png'),
  verde: require('../../../assets/perfil/verde.png'),
  turquesa: require('../../../assets/perfil/turquesa.png'),
  rosa: require('../../../assets/perfil/rosa.png'),
  marrom: require('../../../assets/perfil/marrom.png'),
  laranja: require('../../../assets/perfil/laranja.png'),
};

// Define os campos que compõem um comentário e suas respostas.
type Comment = {
  // Identificador único usado pelo React para encontrar este comentário.
  id: string;
  // Texto escrito no comentário.
  text: string;
  authorName?: string;
  authorId?: string;
  avatarId?: string;
  // Data e horário em que o comentário foi criado.
  createdAt: string;
  // Respostas ligadas a este comentário.
  replies: Comment[];
};

// Define os campos que serão armazenados para cada publicação.
type ForumPost = {
  // Identificador único da publicação.
  id: string;
  // Texto da publicação; pode ficar vazio se houver uma foto.
  text: string;
  category?: string;
  // Indica se a publicação aceita novos comentários.
  commentsEnabled?: boolean;
  authorName?: string;
  authorId?: string;
  avatarId?: string;
  // Endereço local da foto, presente somente quando há imagem.
  imageUri?: string;
  // Data de criação usada para mostrar quando foi publicado.
  createdAt: string;
  // Quantidade de curtidas exibida no cartão.
  likes: number;
  // Indica se a pessoa deste aparelho já curtiu.
  likedByMe: boolean;
  // Comentários associados à publicação.
  comments: Comment[];
};

// Opções exibidas quando a pessoa seleciona o botão de denúncia.
const reportReasons = ['Spam ou propaganda', 'Conteúdo inadequado', 'Informação prejudicial', 'Outro motivo'];

function getProfileName(user: User | null) {
  const name = user?.user_metadata?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : user?.email?.split('@')[0] ?? 'Pessoa usuária';
}

function getForumWriteError(error: unknown) {
  const details = error instanceof Error ? error.message : 'Erro desconhecido.';
  const normalized = details.toLowerCase();
  if (normalized.includes('row-level security') || normalized.includes('permission denied') || normalized.includes('policy')) {
    return `O Supabase bloqueou a publicação. Rode lifeOrganicFit/database/schema.sql no SQL Editor do projeto Supabase. Detalhes: ${details}`;
  }
  if (normalized.includes('nome_autor') || normalized.includes('schema cache') || normalized.includes('column')) {
    return `O banco ainda não tem os campos do fórum atualizados. Rode lifeOrganicFit/database/schema.sql no SQL Editor do projeto Supabase. Detalhes: ${details}`;
  }
  return details;
}

// Componente principal da aba Fórum.
// Com Supabase configurado, publicações e comentários são compartilhados entre os usuários.
export default function ForumScreen() {
  // Lista de publicações carregadas do armazenamento local.
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [userName, setUserName] = useState('Pessoa usuária');
  const [avatarId, setAvatarId] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | null>(null);
  // Impede salvar a lista vazia antes de terminar a leitura inicial do armazenamento.
  const [isLoaded, setIsLoaded] = useState(false);
  // Controla se o formulário para criar publicação está aberto.
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  // Guarda o texto que a pessoa está escrevendo para publicar.
  const [postText, setPostText] = useState('');
  // Guarda o caminho da foto escolhida; null significa que nenhuma foto foi anexada.
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // Identifica qual publicação está mostrando a área de comentários.
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  // Guarda o texto digitado no campo de comentário ou resposta.
  const [commentText, setCommentText] = useState('');
  // Se preenchido, indica a publicação e o comentário que receberão uma resposta.
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string } | null>(null);
  // Identifica qual publicação está mostrando as opções de denúncia.
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  // Guarda as publicações já denunciadas neste uso da tela.
  const [reportedPostIds, setReportedPostIds] = useState<string[]>([]);
  // Guarda o texto usado para localizar publicações pelo conteúdo ou autor.
  const [searchText, setSearchText] = useState('');
  // Mantém selecionado o filtro atual do feed.
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  // Mantém a categoria escolhida para a nova publicação.
  const [postCategory, setPostCategory] = useState('Receita');
  // Controla a permissão de comentários da publicação que está sendo criada.
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  // Define os temas disponíveis no feed e no formulário de publicação.
  const categories = ['Todos', 'Receitas', 'Dicas', 'Treinos', 'Alimentação', 'Conquistas'];
  const postCategories = ['Receita', 'Refeição', 'Treino', 'Dica', 'Conquista'];
  // Aplica busca e categoria selecionada antes de mostrar os cartões.
  const visiblePosts = posts.filter((post) => {
    const matchesSearch = `${post.text} ${post.authorName ?? ''}`.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || post.category?.toLowerCase() === selectedCategory.toLowerCase().replace(/s$/, '') || (selectedCategory === 'Receitas' && post.category === 'Receita');
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = requireSupabase();
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserName(getProfileName(user));
      setUserId(user?.id ?? null);
      setAvatarId(typeof user?.user_metadata?.avatar_id === 'string' ? user.user_metadata.avatar_id : undefined);
    });
    void client.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setUserName(getProfileName(data.user));
        setUserId(data.user.id);
        setAvatarId(typeof data.user.user_metadata?.avatar_id === 'string' ? data.user.user_metadata.avatar_id : undefined);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Carrega o feed compartilhado do Supabase; sem credenciais mantém o protótipo local.
  useEffect(() => {
    let isActive = true;
    setIsLoaded(false);
    const load = async () => {
      try {
        if (isSupabaseConfigured) {
          const loadedPosts = await loadForumPosts();
          if (isActive) setPosts(loadedPosts);
        } else {
          const savedPosts = await AsyncStorage.getItem(STORAGE_KEY);
          if (isActive && savedPosts) setPosts(JSON.parse(savedPosts) as ForumPost[]);
        }
      } catch (error) {
        if (isActive) Alert.alert('Fórum', error instanceof Error ? error.message : 'Não foi possível carregar as publicações.');
      } finally {
        if (isActive) setIsLoaded(true);
      }
    };
    void load();
    return () => { isActive = false; };
  }, [userId]);

  // Mantém as publicações no aparelho. Para compartilhar entre pessoas, conecte ao Supabase.
  useEffect(() => {
    // Aguarda a leitura inicial para não substituir dados salvos por uma lista vazia.
    if (isLoaded && !isSupabaseConfigured) {
      // Converte as publicações em JSON e as salva no armazenamento do aparelho.
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts)).catch(() => {
        // Informa a pessoa se o aparelho não conseguir guardar as alterações.
        Alert.alert('Fórum', 'Não foi possível salvar as publicações neste aparelho.');
      });
    }
    // Regrava quando a lista muda ou quando a leitura inicial termina.
  }, [isLoaded, posts]);

  // Abre a galeria do celular para escolher uma foto para a publicação.
  async function choosePhoto() {
    try {
      // Abre o seletor de fotos, permite corte e reduz o tamanho da imagem escolhida.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      // Atualiza a prévia somente se a pessoa não cancelou o seletor.
      if (!result.canceled) {
        const selectedUri = result.assets[0]?.uri;
        if (!selectedUri) return;
        if (!FileSystem.documentDirectory) throw new Error('Armazenamento local indisponível.');
        const extension = selectedUri.split('.').pop()?.split('?')[0] || 'jpg';
        const savedUri = `${FileSystem.documentDirectory}forum-${Date.now()}.${extension}`;
        await FileSystem.copyAsync({ from: selectedUri, to: savedUri });
        setPhotoUri(savedUri);
      }
    } catch {
      // Mostra um erro se a galeria não puder ser aberta.
      Alert.alert('Não foi possível abrir as fotos', 'Confira as permissões do aplicativo e tente novamente.');
    }
  }

  // Salva o nome associado à conta junto da publicação.
  async function publishPost() {
    // Remove espaços extras antes de validar e guardar o texto.
    const text = postText.trim();
    // Não permite publicar um cartão totalmente vazio.
    if (!text && !photoUri) return;
    if (isSupabaseConfigured) {
      if (!userId) {
        Alert.alert('Entre na sua conta', 'Faça login para publicar no fórum.');
        return;
      }
      try {
        // Envia a foto ao armazenamento do Supabase e salva o endereço no post.
        const imageUrl = photoUri ? await uploadForumImage(photoUri, userId) : undefined;
        await createForumPost({ text, userId, authorName: userName, avatarId, category: postCategory, commentsEnabled, imageUrl });
        const loadedPosts = await loadForumPosts();
        setPosts(loadedPosts);
      } catch (error) {
        Alert.alert('Não foi possível publicar', getForumWriteError(error));
        return;
      }
      setPostText('');
      setPhotoUri(null);
      setCommentsEnabled(true);
      setIsComposerOpen(false);
      return;
    }
    // Monta a publicação com data, zero curtidas e nenhuma resposta inicial.
    const post: ForumPost = {
      id: `${Date.now()}`,
      text,
      category: postCategory,
      commentsEnabled,
      authorName: userName,
      authorId: userId ?? 'local-device',
      avatarId,
      imageUri: photoUri ?? undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      comments: [],
    };
    // Coloca a publicação nova no início do feed.
    setPosts((current) => [post, ...current]);
    // Limpa o texto para a próxima publicação.
    setPostText('');
    // Remove a foto selecionada da prévia.
    setPhotoUri(null);
    setCommentsEnabled(true);
    // Fecha o formulário depois que a publicação foi criada.
    setIsComposerOpen(false);
  }

  function deletePost(post: ForumPost) {
    Alert.alert('Excluir publicação', 'Deseja excluir esta publicação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (isSupabaseConfigured) {
            try { await deleteForumPost(post.id); }
            catch (error) { Alert.alert('Fórum', error instanceof Error ? error.message : 'Não foi possível excluir.'); return; }
          }
          setPosts((current) => current.filter((item) => item.id !== post.id));
        },
      },
    ]);
  }

  function deleteComment(postId: string, comment: Comment, parentId?: string) {
    Alert.alert('Excluir comentário', 'Deseja excluir este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        if (isSupabaseConfigured) {
          try {
            await deleteForumComment(comment.id);
            const loadedPosts = await loadForumPosts();
            setPosts(loadedPosts);
          } catch (error) {
            Alert.alert('Fórum', error instanceof Error ? error.message : 'Não foi possível excluir o comentário.');
          }
          return;
        }
        setPosts((current) => current.map((post) => post.id !== postId ? post : {
          ...post,
          comments: parentId
            ? post.comments.map((entry) => entry.id === parentId ? { ...entry, replies: entry.replies.filter((reply) => reply.id !== comment.id) } : entry)
            : post.comments.filter((entry) => entry.id !== comment.id),
        }));
      } },
    ]);
  }

  // Marca ou remove a curtida local da pessoa neste post.
  function toggleLike(postId: string) {
    const targetPost = posts.find((post) => post.id === postId);
    if (isSupabaseConfigured) {
      if (!userId) {
        Alert.alert('Entre na sua conta', 'Faça login para curtir publicações.');
        return;
      }
      if (!targetPost) return;
      const previousLiked = targetPost.likedByMe;
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, likedByMe: !previousLiked, likes: Math.max(0, post.likes + (previousLiked ? -1 : 1)) }
        : post));
      void toggleForumLike({ postId, userId, liked: previousLiked }).catch((error) => {
        setPosts((current) => current.map((post) => post.id === postId
          ? { ...post, likedByMe: previousLiked, likes: Math.max(0, post.likes + (previousLiked ? 1 : -1)) }
          : post));
        Alert.alert('Fórum', error instanceof Error ? error.message : 'Não foi possível registrar a curtida.');
      });
      return;
    }
    // Atualiza somente a publicação tocada, mantendo as demais como estão.
    setPosts((current) => current.map((post) => {
      // Retorna sem alteração quando este não é o post selecionado.
      if (post.id !== postId) return post;
      // Inverte o estado de curtida atual neste aparelho.
      const likedByMe = !post.likedByMe;
      // Soma ou subtrai uma curtida, sem deixar o total ficar abaixo de zero.
      return { ...post, likedByMe, likes: Math.max(0, post.likes + (likedByMe ? 1 : -1)) };
    }));
  }

  // Adiciona um comentário anônimo ou uma resposta a outro comentário.
  async function submitComment(postId: string) {
    // Remove espaços em branco das pontas do comentário.
    const text = commentText.trim();
    // Não cria comentário vazio.
    if (!text) return;
    // Bloqueia comentários para uma publicação que não os permite.
    if (posts.find((post) => post.id === postId)?.commentsEnabled === false) return;
    if (isSupabaseConfigured) {
      if (!userId) {
        Alert.alert('Entre na sua conta', 'Faça login para comentar no fórum.');
        return;
      }
      try {
        await createForumComment({
          postId,
          text,
          userId,
          authorName: userName,
          avatarId,
          parentCommentId: replyingTo?.postId === postId ? replyingTo.commentId : undefined,
        });
        const loadedPosts = await loadForumPosts();
        setPosts(loadedPosts);
      } catch (error) {
        Alert.alert('Não foi possível comentar', getForumWriteError(error));
        return;
      }
      setCommentText('');
      setReplyingTo(null);
      return;
    }
    // Prepara o novo comentário com identificador, data e lista de respostas vazia.
    const newComment: Comment = { id: `${Date.now()}`, text, authorName: userName, authorId: userId ?? 'local-device', createdAt: new Date().toISOString(), replies: [] };

    // Atualiza a publicação certa, acrescentando resposta ou comentário principal.
    setPosts((current) => current.map((post) => {
      // Mantém todos os outros posts sem alteração.
      if (post.id !== postId) return post;
      // Quando existe alvo de resposta, procura o comentário original e anexa a resposta.
      if (replyingTo?.postId === postId) {
        return {
          ...post,
          comments: post.comments.map((comment) => comment.id === replyingTo.commentId
            ? { ...comment, replies: [...comment.replies, newComment] }
            : comment),
        };
      }
      // Sem alvo de resposta, acrescenta um novo comentário principal.
      return { ...post, comments: [...post.comments, newComment] };
    }));
    // Limpa o campo após enviar.
    setCommentText('');
    // Sai do modo de resposta para que a próxima mensagem seja um comentário novo.
    setReplyingTo(null);
  }

  // Registra a denúncia apenas no protótipo local; a análise real requer um serviço no servidor.
  function reportPost(postId: string, reason: string) {
    // Evita registrar a mesma denúncia mais de uma vez nesta tela.
    setReportedPostIds((current) => current.includes(postId) ? current : [...current, postId]);
    // Fecha o painel de motivos depois da escolha.
    setReportingPostId(null);
    // A denúncia é apenas local neste protótipo e não é enviada para moderação.
    Alert.alert('Denúncia registrada', `Motivo: ${reason}. No protótipo, a denúncia fica apenas neste aparelho.`);
  }

  return (
    // Esta camada evita que o teclado cubra os campos quando a pessoa escreve.
    // O style ocupa a tela toda e o behavior adiciona ajuste de teclado somente no iOS.
    <ThemeSurface><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {isComposerOpen ? (
        <>
          {/* Cabeçalho da tela de criação com ação para retornar ao feed. */}
          <View style={styles.composerHeading}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao fórum" onPress={() => setIsComposerOpen(false)} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
            <Text style={styles.composerTitle}>Criar publicação</Text>
            <View style={styles.backButton} />
          </View>
          {/* Formulário rolável para caber em telas menores e com o teclado aberto. */}
          <ScrollView contentContainerStyle={styles.composerPage} keyboardShouldPersistTaps="handled">
            <View style={styles.anonymousRow}>
              <View style={styles.avatar}>{avatarId && avatarSources[avatarId] ? <Image source={avatarSources[avatarId]} style={styles.avatarImage} /> : <Ionicons name="person" size={18} color={colors.primary} />}</View>
              <Text style={styles.anonymousLabel}>{userName}</Text>
            </View>
            <Text style={styles.formPrompt}>O que você gostaria de compartilhar?</Text>
            {/* Seleção compacta do tipo de publicação. */}
            <ScrollView horizontal style={styles.categoryChoicesBar} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChoices}>
              {postCategories.map((category, index) => <Pressable key={category} onPress={() => setPostCategory(category)} style={[styles.categoryChoice, postCategory === category && styles.categoryChoiceActive]}><Ionicons name={(['restaurant-outline', 'cafe-outline', 'barbell-outline', 'bulb-outline', 'trophy-outline'] as const)[index]} size={20} color={postCategory === category ? colors.white : colors.primary} /><Text style={[styles.categoryChoiceText, postCategory === category && styles.categoryChoiceTextActive]}>{category}</Text></Pressable>)}
            </ScrollView>
            <View style={styles.composerInputWrap}>
              <TextInput accessibilityLabel="Escreva sua publicação" multiline maxLength={1000} onChangeText={setPostText} placeholder="Escreva aqui..." placeholderTextColor={colors.mutedText} style={styles.postInput} value={postText} />
              <Text style={styles.characterCount}>{postText.length}/1000</Text>
            </View>
            {photoUri ? <View style={styles.photoPreviewWrap}><Image source={{ uri: photoUri }} style={styles.photoPreview} /><Pressable onPress={() => setPhotoUri(null)} style={styles.removePhoto}><Ionicons name="close" size={18} color={colors.white} /></Pressable></View> : null}
            <Pressable accessibilityRole="button" onPress={choosePhoto} style={styles.addPhoto}><Ionicons name="image-outline" size={21} color={colors.primary} /><Text style={styles.addPhotoText}>{photoUri ? 'Trocar foto' : 'Adicionar foto'}</Text><Text style={styles.addPhotoHint}>Toque para escolher uma imagem</Text></Pressable>
            {/* Controle interativo que define se a nova publicação aceita comentários. */}
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: commentsEnabled }} accessibilityLabel="Permitir comentários" onPress={() => setCommentsEnabled((enabled) => !enabled)} style={styles.commentPermission}>
              <Ionicons name="lock-closed" size={18} color={colors.primary} /><Text style={styles.anonymousLabel}>Permitir comentários</Text>
              <View style={[styles.toggleTrack, commentsEnabled && styles.toggleOn]}><View style={[styles.toggleKnob, commentsEnabled && styles.toggleKnobOn]} /></View>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!postText.trim() && !photoUri} onPress={publishPost} style={[styles.publishFull, !postText.trim() && !photoUri && styles.disabledButton]}><Text style={styles.publishButtonText}>Publicar</Text></Pressable>
          </ScrollView>
        </>
      ) : <>
      {/* Cabeçalho local: título, descrição e botão que abre ou fecha o formulário. */}
      <View style={styles.heading}>
        {/* Ícone decorativo que identifica a área de conversa da comunidade. */}
        <View style={styles.headingIcon}><Ionicons name="chatbubbles" size={22} color={colors.primary} /></View>
        {/* Agrupa título e subtítulo para ocupar o espaço entre os botões. */}
        <View style={styles.headingText}>
          <Text style={styles.title}>Fórum da comunidade</Text>
          <Text style={styles.subtitle}>Converse e compartilhe com a comunidade</Text>
        </View>
      </View>

      {/* Campo de busca para filtrar pelo texto da publicação ou nome de quem publicou. */}
      <View style={styles.searchWrap}><Ionicons name="search-outline" size={18} color={colors.mutedText} /><TextInput accessibilityLabel="Pesquisar no fórum" onChangeText={setSearchText} placeholder="Pesquisar no fórum..." placeholderTextColor={colors.mutedText} style={styles.searchInput} value={searchText} /></View>
      {/* Faixa horizontal de temas com altura fixa para os botões não se esticarem. */}
      <ScrollView horizontal style={styles.categoryFilterBar} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilters}>{categories.map((category) => <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.categoryFilter, selectedCategory === category && styles.categoryFilterActive]}><Text style={[styles.categoryFilterText, selectedCategory === category && styles.categoryFilterTextActive]}>{category}</Text></Pressable>)}</ScrollView>

      {/* Feed rolável; os toques no teclado não fecham os campos automaticamente. */}
      <ScrollView contentContainerStyle={styles.feed} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {isComposerOpen ? (
          // Formulário que aparece depois de tocar no botão de nova publicação.
          <View style={styles.composerCard}>
            {/* Não exibe nome ou foto de perfil; todas as pessoas aparecem como anônimas. */}
            <View style={styles.anonymousRow}>
              <View style={styles.avatar}>{avatarId && avatarSources[avatarId] ? <Image source={avatarSources[avatarId]} style={styles.avatarImage} /> : <Ionicons name="person" size={18} color={colors.primary} />}</View>
              <Text style={styles.anonymousLabel}>Publicando como {userName}</Text>
            </View>
            {/* O rótulo ajuda leitores de tela, multiline permite várias linhas e placeholder orienta antes da digitação. */}
            {/* onChangeText atualiza o estado e value mantém o campo sincronizado com esse estado. */}
            <TextInput
              accessibilityLabel="Escreva sua publicação anônima"
              multiline
              onChangeText={setPostText}
              placeholder="O que você gostaria de compartilhar?"
              placeholderTextColor={colors.mutedText}
              style={styles.postInput}
              value={postText}
            />
            {photoUri ? (
              // Mostra uma prévia da foto escolhida e oferece um botão para removê-la.
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <Pressable accessibilityRole="button" accessibilityLabel="Remover foto" onPress={() => setPhotoUri(null)} style={styles.removePhoto}>
                  <Ionicons name="close" size={18} color={colors.white} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composerActions}>
              {/* Abre a galeria e muda o texto do botão se já houver uma imagem anexada. */}
              <Pressable accessibilityRole="button" onPress={choosePhoto} style={styles.photoButton}>
                <Ionicons name="image-outline" size={19} color={colors.primary} />
                <Text style={styles.photoButtonText}>{photoUri ? 'Trocar foto' : 'Adicionar foto'}</Text>
              </Pressable>
              {/* Fica desativado enquanto não houver texto nem foto para publicar. */}
              <Pressable accessibilityRole="button" disabled={!postText.trim() && !photoUri} onPress={publishPost} style={[styles.publishButton, !postText.trim() && !photoUri && styles.disabledButton]}>
                <Text style={styles.publishButtonText}>Publicar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!isLoaded ? <Text style={styles.emptyText}>Carregando publicações...</Text> : null}
        {isLoaded && posts.length === 0 ? (
          // Estado vazio exibido quando ainda não há nenhuma publicação salva.
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={34} color={colors.mediumBlue} />
            <Text style={styles.emptyTitle}>O fórum está começando</Text>
            <Text style={styles.emptyText}>Toque no botão + para compartilhar uma ideia, uma dúvida ou uma foto.</Text>
          </View>
        ) : null}

        {visiblePosts.map((post) => (
          // Cada cartão representa uma publicação carregada no feed.
          <View key={post.id} style={styles.postCard}>
            {/* Cabeçalho anônimo, data e botão para abrir as opções de denúncia. */}
            <View style={styles.postHeader}>
              <View style={styles.anonymousRow}>
                <View style={styles.avatar}>{post.avatarId && avatarSources[post.avatarId] ? <Image source={avatarSources[post.avatarId]} style={styles.avatarImage} /> : <Ionicons name="person" size={17} color={colors.primary} />}</View>
                <View>
                  <Text style={styles.anonymousLabel}>{post.authorName || 'Anônimo'}</Text>
                  <Text style={styles.postDate}>{new Date(post.createdAt).toLocaleString('pt-BR')}</Text>
                </View>
              </View>
              {/* O botão muda o ícone e fica desativado quando a denúncia já foi registrada. */}
              <View style={styles.postHeaderActions}>
        {post.authorId === (userId ?? 'local-device') ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Excluir publicação" onPress={() => deletePost(post)} style={styles.reportButton}>
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
                ) : null}
                {!isSupabaseConfigured ? <Pressable accessibilityRole="button" accessibilityLabel="Denunciar publicação" disabled={reportedPostIds.includes(post.id)} onPress={() => setReportingPostId(reportingPostId === post.id ? null : post.id)} style={styles.reportButton}>
                  <Ionicons name={reportedPostIds.includes(post.id) ? 'flag' : 'flag-outline'} size={19} color={reportedPostIds.includes(post.id) ? colors.mutedText : colors.danger} />
                </Pressable> : null}
              </View>
            </View>

            {/* Texto e foto só são renderizados se existirem na publicação. */}
            {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
            {post.imageUri ? <Image accessibilityLabel="Foto anexada à publicação" source={{ uri: post.imageUri }} style={styles.postImage} resizeMode="cover" /> : null}
            {/* Etiqueta visual para a categoria da publicação. */}
            {post.category ? <View style={styles.postCategory}><Text style={styles.postCategoryText}>{post.category}</Text></View> : null}

            {reportingPostId === post.id ? (
              // Painel com motivos; tocar em uma opção registra a denúncia local demonstrativa.
              <View style={styles.reportPanel}>
                <Text style={styles.reportTitle}>Por que deseja denunciar?</Text>
                {reportReasons.map((reason) => (
                  <Pressable key={reason} accessibilityRole="button" onPress={() => reportPost(post.id, reason)} style={styles.reportReason}>
                    <Text style={styles.reportReasonText}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.postActions}>
              {/* Curtida alternável: atualiza o coração e o total mostrado. */}
              <Pressable accessibilityRole="button" accessibilityLabel={post.likedByMe ? 'Remover curtida' : 'Curtir publicação'} onPress={() => toggleLike(post.id)} style={styles.actionButton}>
                <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={20} color={post.likedByMe ? colors.danger : colors.text} />
                <Text style={[styles.actionText, post.likedByMe && styles.likedText]}>{post.likes} Curtir</Text>
              </Pressable>
              {/* Abre ou fecha a conversa desta publicação. */}
              {post.commentsEnabled !== false ? <Pressable accessibilityRole="button" accessibilityLabel="Mostrar comentários" onPress={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={19} color={colors.text} />
                <Text style={styles.actionText}>{post.comments.reduce((count, comment) => count + 1 + comment.replies.length, 0)} Comentários</Text>
              </Pressable> : null}
            </View>

            {expandedPostId === post.id && post.commentsEnabled !== false ? (
              // Área de comentários que só aparece quando a pessoa toca no botão correspondente.
              <View style={styles.commentsSection}>
                {post.comments.map((comment) => (
                  // Comentário principal com botão para iniciar uma resposta.
                  <View key={comment.id} style={styles.commentBlock}>
                    <View style={styles.commentRow}>
                      <View style={styles.smallAvatar}>{comment.avatarId && avatarSources[comment.avatarId] ? <Image source={avatarSources[comment.avatarId]} style={styles.smallAvatarImage} /> : <Ionicons name="person" size={12} color={colors.primary} />}</View>
                      <View style={styles.commentContent}>
                        <Text style={styles.commentAuthor}>{comment.authorName || 'Anônimo'}</Text>
                        <Text style={styles.commentText}>{comment.text}</Text>
                        <Pressable accessibilityRole="button" onPress={() => setReplyingTo({ postId: post.id, commentId: comment.id })}>
                          <Text style={styles.replyLink}>Responder</Text>
                        </Pressable>
                      </View>
                      {comment.authorId === (userId ?? 'local-device') ? <Pressable accessibilityRole="button" accessibilityLabel="Excluir comentário" onPress={() => deleteComment(post.id, comment)} style={styles.reportButton}><Ionicons name="trash-outline" size={16} color={colors.danger} /></Pressable> : null}
                    </View>
                    {comment.replies.map((reply) => (
                      // Respostas ficam visualmente recuadas em relação ao comentário original.
                      <View key={reply.id} style={styles.replyRow}>
                        <View style={styles.smallAvatar}>{reply.avatarId && avatarSources[reply.avatarId] ? <Image source={avatarSources[reply.avatarId]} style={styles.smallAvatarImage} /> : <Ionicons name="person" size={12} color={colors.primary} />}</View>
                        <View style={styles.commentContent}>
                          <Text style={styles.commentAuthor}>{reply.authorName || 'Anônimo'} · resposta</Text>
                          <Text style={styles.commentText}>{reply.text}</Text>
                        </View>
                        {reply.authorId === (userId ?? 'local-device') ? <Pressable accessibilityRole="button" accessibilityLabel="Excluir resposta" onPress={() => deleteComment(post.id, reply, comment.id)} style={styles.reportButton}><Ionicons name="trash-outline" size={16} color={colors.danger} /></Pressable> : null}
                      </View>
                    ))}
                  </View>
                ))}
                {replyingTo?.postId === post.id ? (
                  // Indica que o próximo texto será uma resposta; o X cancela esse modo.
                  <View style={styles.replyingBanner}>
                    <Text style={styles.replyingText}>Respondendo a um comentário</Text>
                    <Pressable accessibilityRole="button" onPress={() => setReplyingTo(null)}><Ionicons name="close" size={17} color={colors.mutedText} /></Pressable>
                  </View>
                ) : null}
                <View style={styles.commentComposer}>
                  {/* O rótulo e placeholder distinguem resposta de comentário; os handlers atualizam e enviam o texto. */}
                  <TextInput
                    accessibilityLabel={replyingTo?.postId === post.id ? 'Escreva uma resposta' : 'Escreva um comentário'}
                    onChangeText={setCommentText}
                    onSubmitEditing={() => submitComment(post.id)}
                    placeholder={replyingTo?.postId === post.id ? 'Escreva sua resposta...' : 'Escreva um comentário...'}
                    placeholderTextColor={colors.mutedText}
                    style={styles.commentInput}
                    value={commentText}
                  />
                  {/* Botão envia o texto atual para a função de comentário ou resposta. */}
                  <Pressable accessibilityRole="button" accessibilityLabel="Enviar comentário" onPress={() => submitComment(post.id)} style={styles.sendCommentButton}>
                    <Ionicons name="send" size={16} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isComposerOpen ? 'Fechar criação de publicação' : 'Criar publicação'}
        onPress={() => setIsComposerOpen((open) => !open)}
        style={styles.floatingPostButton}
      >
        <Ionicons name={isComposerOpen ? 'close' : 'add'} size={28} color={colors.white} />
      </Pressable>
      </>}
    </KeyboardAvoidingView></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  // Cor de fundo e preenchimento total da aba.
  screen: {
    backgroundColor: '#F6F8FB',
    flex: 1
  },
  // Alinha o botão de retorno e o título no cabeçalho da criação.
  composerHeading: { alignItems: 'center', backgroundColor: colors.white, borderBottomColor: '#EAECF0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 14 },
  // Reserva uma área de toque consistente para voltar.
  backButton: { alignItems: 'center', justifyContent: 'center', width: 38 },
  // Dá destaque ao título da tela de criação.
  composerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  // Espaça os campos do formulário e mantém uma área rolável.
  composerPage: { backgroundColor: colors.white, flexGrow: 1, gap: 9, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  // Texto que introduz a seleção de tipo de publicação.
  formPrompt: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  // Centraliza os tipos de publicação em uma faixa horizontal compacta.
  categoryChoices: { alignItems: 'center', gap: 6 },
  // Reserva apenas a altura necessária para os temas do formulário.
  categoryChoicesBar: { flexGrow: 0, flexShrink: 0, height: 54 },
  // Tamanho compacto de cada opção de tipo de publicação.
  categoryChoice: { alignItems: 'center', borderColor: '#D7E5F5', borderRadius: 12, borderWidth: 1, gap: 4, height: 54, justifyContent: 'center', minWidth: 62, paddingHorizontal: 7 },
  // Realça o tipo de publicação selecionado.
  categoryChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  // Texto pequeno para o rótulo de cada tipo.
  categoryChoiceText: { color: colors.mutedText, fontSize: 9 },
  // Define a cor do rótulo selecionado.
  categoryChoiceTextActive: { color: colors.white },
  // Contorno e espaço interno do campo principal de texto.
  composerInputWrap: { borderColor: '#D7E5F5', borderRadius: 12, borderWidth: 1, minHeight: 132, padding: 12 },
  // Mostra quantos caracteres já foram digitados.
  characterCount: { alignSelf: 'flex-end', color: colors.mutedText, fontSize: 10 },
  // Área tracejada que permite escolher uma foto.
  addPhoto: { alignItems: 'center', borderColor: '#BCD5F2', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, gap: 5, justifyContent: 'center', minHeight: 78, padding: 10 },
  // Aparência do rótulo para adicionar foto.
  addPhotoText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  // Instrução abaixo do rótulo de foto.
  addPhotoHint: { color: colors.mutedText, fontSize: 10 },
  // Linha para a indicação de permissão de comentários.
  commentPermission: { alignItems: 'center', borderBottomColor: '#EAECF0', borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingBottom: 12 },
  // Aparência desligada do trilho do controle de comentários.
  toggleTrack: { backgroundColor: '#D0D5DD', borderRadius: 12, height: 24, justifyContent: 'center', marginLeft: 'auto', padding: 2, width: 42 },
  // Aparência ligada do trilho do controle de comentários.
  toggleOn: { backgroundColor: colors.primary },
  // Botão móvel dentro do trilho do controle.
  toggleKnob: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 9, height: 18, width: 18 },
  // Move o botão para a direita quando comentários estão ativados.
  toggleKnobOn: { alignSelf: 'flex-end' },
  // Botão de publicar ocupa a largura útil do formulário.
  publishFull: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, justifyContent: 'center', marginTop: 4, minHeight: 46 },
  // Agrupa ícone e campo de busca dentro de uma cápsula.
  searchWrap: { alignItems: 'center', backgroundColor: '#EEF4FA', borderRadius: 22, flexDirection: 'row', gap: 9, marginHorizontal: 14, marginTop: 10, paddingHorizontal: 12 },
  // Campo de texto da busca ocupa o espaço restante.
  searchInput: { color: colors.text, flex: 1, fontSize: 12, minHeight: 38 },
  // Limita a altura da barra de temas para ela não preencher a tela.
  categoryFilterBar: { flexGrow: 0, flexShrink: 0, height: 42 },
  // Mantém os temas pequenos e alinhados no centro da barra.
  categoryFilters: { alignItems: 'center', gap: 6, paddingHorizontal: 14 },
  // Formato compacto de cada filtro de tema.
  categoryFilter: { borderColor: '#D7E5F5', borderRadius: 16, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 5 },
  // Cor sólida do filtro ativo.
  categoryFilterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  // Cor padrão dos nomes dos temas.
  categoryFilterText: { color: colors.primary, fontSize: 10 },
  // Texto branco para o tema ativo.
  categoryFilterTextActive: { color: colors.white },

  // Faixa superior que agrupa ícone, textos e botão +.
  heading: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: '#EAECF0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: 53,
    paddingBottom: 13
  },

  // Círculo azul-claro atrás do ícone do fórum.
  headingIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40
  },

  // Permite que o título ocupe o espaço livre entre os ícones.
  headingText: {
    flex: 1,
    gap: 2
  },

  // Aparência do título principal.
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800'
  },
  
  // Aparência do texto de apoio abaixo do título.
  subtitle: {
    color: colors.mutedText,
    fontSize: 11
  },

  // Botão flutuante centralizado logo acima da barra de abas.
  floatingPostButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    bottom: 10,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -28,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    width: 56,
  },
  
  // Espaçamento e margens dos cartões no feed.
  feed: {
    gap: 13,
    padding: 13,
    paddingBottom: 88
  },
  // Cartão do formulário de nova publicação.
  composerCard: {
    backgroundColor: colors.white,
    borderColor: '#E4E7EC',
    borderRadius: 17,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  // Linha horizontal para avatar e identificação anônima.
  anonymousRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9
  },
  // Avatar neutro sem foto pessoal.
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EAF4FF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  avatarImage: { borderRadius: 18, height: '100%', width: '100%' },
  // Texto que marca a publicação como anônima.
  anonymousLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  // Campo de texto maior para a publicação.
  postInput: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 88,
    padding: 0,
    textAlignVertical: 'top'
  },
  // Recorta a foto e serve de referência para o botão remover.
  photoPreviewWrap: {
    borderRadius: 12,
    height: 180,
    overflow: 'hidden',
    position: 'relative'
  },
  // Faz a prévia ocupar todo o cartão da foto.
  photoPreview: {
    height: '100%',
    width: '100%'
  },
  // Botão X posicionado no canto da foto.
  removePhoto: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 30
  },
  // Linha inferior com adicionar foto e publicar.
  composerActions: {
    alignItems: 'center',
    borderTopColor: '#EAECF0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10
  },
  // Botão e ícone para abrir a galeria.
  photoButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6
  },
  // Texto do botão de foto.
  photoButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600'
  },
  // Botão de publicar com fundo azul.
  publishButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 18
  },
  // Reduz a opacidade quando o formulário está vazio.
  disabledButton: {
    opacity: 0.45
  },
  // Texto branco do botão de publicar.
  publishButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700'
  },
  // Cartão exibido quando ainda não há posts.
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 17,
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  // Título do estado vazio.
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  // Explicação do estado vazio ou do carregamento.
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center'
  },
  // Cartão que contém cada publicação.
  postCard: {
    backgroundColor: colors.white,
    borderColor: '#E4E7EC',
    borderRadius: 17,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  // Linha com autor anônimo, data e denúncia.
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  postHeaderActions: { alignItems: 'center', flexDirection: 'row' },
  // Texto pequeno para a data da publicação.
  postDate: {
    color: colors.mutedText,
    fontSize: 10,
    marginTop: 3
  },
  // Área clicável do botão de denúncia.
  reportButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  // Texto principal do post.
  postText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21
  },
  // Cápsula azul-clara que identifica o tema no cartão do feed.
  postCategory: { alignSelf: 'flex-end', backgroundColor: '#EAF4FF', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 4 },
  // Texto do tema exibido no cartão.
  postCategoryText: { color: colors.primary, fontSize: 10, fontWeight: '600' },
  // Imagem anexada, cortada para preencher o cartão.
  postImage: {
    backgroundColor: '#EAECF0',
    borderRadius: 12,
    height: 220,
    width: '100%'
  },
  // Painel que lista os motivos de denúncia.
  reportPanel: {
    backgroundColor: '#FFF8F7',
    borderColor: '#FEE4E2',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    padding: 10
  },
  // Pergunta acima dos motivos de denúncia.
  reportTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4
  },
  // Aumenta a área de toque de cada motivo.
  reportReason: {
    paddingVertical: 7
  },
  // Texto vermelho de cada motivo.
  reportReasonText: {
    color: colors.danger,
    fontSize: 13
  },
  // Linha de ações para curtir e abrir comentários.
  postActions: {
    borderTopColor: '#EAECF0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 24,
    paddingTop: 10
  },
  // Alinha ícone e texto de cada ação.
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2
  },
  // Aparência do texto de ação.
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600'
  },
  // Muda a cor do texto quando a publicação foi curtida.
  likedText: {
    color: colors.danger
  },
  // Bloco que contém comentários e o campo de resposta.
  commentsSection: {
    borderTopColor: '#EAECF0',
    borderTopWidth: 1,
    gap: 11,
    paddingTop: 12
  },
  // Espaçamento entre comentário principal e respostas.
  commentBlock: {
    gap: 8
  },
  // Alinha avatar e conteúdo de um comentário.
  commentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  // Avatar menor usado nos comentários.
  smallAvatar: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26
  },
  smallAvatarImage: { borderRadius: 13, height: '100%', width: '100%' },
  // Texto do comentário ocupa o espaço restante.
  commentContent: {
    flex: 1,
    gap: 2
  },
  // Identificação anônima em cada comentário.
  commentAuthor: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700'
  },
  // Texto de comentário ou resposta.
  commentText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18
  },
  // Botão textual para responder.
  replyLink: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3
  },
  // Recuo que diferencia uma resposta do comentário principal.
  replyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginLeft: 34
  },
  // Aviso mostrado enquanto se responde a alguém.
  replyingBanner: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  // Texto do aviso de resposta.
  replyingText: {
    color: colors.mutedText,
    fontSize: 11
  },
  // Campo e botão para enviar comentário/resposta.
  commentComposer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    paddingLeft: 12
  },
  // Campo que recebe o texto do comentário.
  commentInput: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    minHeight: 36,
    paddingVertical: 6
  },
  // Botão redondo para enviar o comentário.
  sendCommentButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
});
