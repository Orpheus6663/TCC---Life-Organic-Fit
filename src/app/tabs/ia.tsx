import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../constants/colors';
import { ThemeSurface } from '../../components/ThemeSurface';
import { sendMessageToAI } from '../../services/aiService';
import type { AiMessage } from '../../services/aiService';
import { getQuestionnairePreferencesForAI } from '../../services/questionnaireService';
import { useAppLanguage } from '../../i18n/language';
import { deleteChatConversation, loadChatHistory, saveChatConversation, type ChatConversation } from '../../services/chatHistoryService';

// Cada mensagem tem um identificador para a lista e um papel para definir o lado do balão.
type ChatMessage = AiMessage & { id: number };

// Atalhos que preenchem a conversa com perguntas comuns sobre saúde e bem-estar.
const suggestions = [
  'Me ajude a planejar minhas refeições',
  'Como posso beber mais água?',
  'Sugira uma rotina de exercícios',
];

// Tela de conversa com a assistente; o envio é feito pelo serviço em src/services/aiService.ts.
export default function IaScreen() {
  // Mantém o idioma das respostas da assistente alinhado ao idioma escolhido no aplicativo.
  const { language } = useAppLanguage();
  // Guarda o texto que a pessoa ainda está escrevendo.
  const [message, setMessage] = useState('');
  // Guarda o histórico visível no chat.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const conversationRef = useRef<ScrollView>(null);
  // Indica que a chamada ao servidor está em andamento.
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isActive = true;
    loadChatHistory().then((saved) => {
      if (!isActive) return;
      setHistory(saved);
      if (saved[0]) {
        setConversationId(saved[0].id);
        setMessages(saved[0].messages);
      }
    }).catch(() => {});
    return () => { isActive = false; };
  }, []);

  async function persistConversation(id: string, nextMessages: ChatMessage[]) {
    const firstQuestion = nextMessages.find((item) => item.role === 'user')?.content ?? 'Nova conversa';
    try {
      const updated = await saveChatConversation({
        id,
        title: firstQuestion.length > 52 ? `${firstQuestion.slice(0, 49)}...` : firstQuestion,
        updatedAt: new Date().toISOString(),
        messages: nextMessages,
      });
      setHistory(updated);
    } catch {
      // A conversa continua disponÃ­vel na tela mesmo quando o aparelho nÃ£o consegue salvÃ¡-la.
    }
  }

  // Envia uma pergunta digitada ou um dos exemplos e mostra a resposta recebida do servidor.
  async function sendMessage(text = message) {
    const question = text.trim();
    if (!question || isSending) return;

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: question };
    const conversation = [...messages, userMessage];
    const activeConversationId = conversationId ?? String(Date.now());
    setConversationId(activeConversationId);
    setMessages(conversation);
    setMessage('');
    setIsSending(true);
    await persistConversation(activeConversationId, conversation);

    let replyText: string;
    try {
      const preferences = await getQuestionnairePreferencesForAI();
      replyText = await sendMessageToAI(conversation.map(({ role, content }) => ({ role, content })), preferences, language);
    } catch (error) {
      replyText = error instanceof Error ? error.message : 'Não foi possível obter uma resposta da IA.';
    }
    const completedConversation = [...conversation, { id: Date.now(), role: 'assistant' as const, content: replyText }];
    setMessages(completedConversation);
    await persistConversation(activeConversationId, completedConversation);
    setIsSending(false);
  }

  function resumeConversation(conversation: ChatConversation) {
    setConversationId(conversation.id);
    setMessages(conversation.messages);
    setIsHistoryOpen(false);
  }

  function resetActiveConversation() {
    setConversationId(null);
    setMessages([]);
    setIsHistoryOpen(false);
  }

  async function startNewConversation() {
    if (conversationId && messages.length > 0) {
      await persistConversation(conversationId, messages);
    }
    resetActiveConversation();
  }

  function confirmDeleteConversation(conversation: ChatConversation) {
    Alert.alert('Excluir conversa?', 'Esta conversa será removida do histórico deste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => {
        void deleteChatConversation(conversation.id).then((updated) => {
          setHistory(updated);
          if (conversationId === conversation.id) resetActiveConversation();
        }).catch(() => Alert.alert('Histórico', 'Não foi possível excluir esta conversa.'));
      } },
    ]);
  }
  return (
    // Ajusta a tela quando o teclado aparece, principalmente no iOS.
    <ThemeSurface><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Mostra o nome da assistente e o assunto da conversa. */}
      <View style={styles.titleRow}>
        <View style={styles.sparkle}>
          <Image source={require('../../../assets/logoIA.png')} style={styles.logo} resizeMode="cover" />
        </View>
                <View style={styles.titleCopy}>
          <Text style={styles.title}>NutriIA</Text>
          <Text style={styles.subtitle}>{'Bem-estar, alimenta\u00e7\u00e3o e movimento'}</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" disabled={isSending} onPress={() => setIsHistoryOpen(true)} style={styles.historyAccess}>
        <View style={styles.historyAccessIcon}><Ionicons name="time-outline" size={20} color={colors.primary} /></View>
        <View style={styles.historyAccessCopy}>
          <Text style={styles.historyAccessTitle}>Histórico de conversas</Text>
          <Text style={styles.historyAccessSubtitle}>Veja ou retome uma conversa anterior</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.primary} />
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setIsHistoryOpen(false)} transparent visible={isHistoryOpen}>
        <View style={styles.historyBackdrop}>
          <View style={styles.historyPanel}>
            <View style={styles.historyHeading}>
              <Text style={styles.historyTitle}>{'Hist\u00f3rico da NutriIA'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={'Fechar hist\u00f3rico'} onPress={() => setIsHistoryOpen(false)} style={styles.historyClose}>
                <Ionicons name="close" size={23} color={colors.mutedText} />
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" disabled={isSending} onPress={startNewConversation} style={styles.newConversation}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.newConversationText}>Nova conversa</Text>
            </Pressable>
            {history.length ? (
              <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {history.map((conversation) => (
                  <View key={conversation.id} style={styles.historyRow}>
                    <Pressable accessibilityRole="button" disabled={isSending} onPress={() => resumeConversation(conversation)} style={styles.historyItem}>
                      <Text numberOfLines={1} style={styles.historyItemTitle}>{conversation.title}</Text>
                      <Text style={styles.historyDate}>{new Date(conversation.updatedAt).toLocaleString('pt-BR')}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Excluir conversa ${conversation.title}`} disabled={isSending} onPress={() => confirmDeleteConversation(conversation)} style={styles.deleteConversation}>
                      <Ionicons name="trash-outline" size={19} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyHistory}>{'Suas conversas salvas aparecer\u00e3o aqui.'}</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Área rolável que contém a apresentação inicial ou as mensagens enviadas e recebidas. */}
      <ScrollView ref={conversationRef} contentContainerStyle={styles.conversation} keyboardShouldPersistTaps="handled" onContentSizeChange={() => conversationRef.current?.scrollToEnd({ animated: false })} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          // Antes da primeira pergunta, apresenta o chat e os atalhos de conversa.
          <View style={styles.welcome}>
            <View style={styles.welcomeIcon}><Ionicons name="chatbubbles-outline" size={30} color={colors.primary} /></View>
            <Text style={styles.welcomeTitle}>Como posso ajudar?</Text>
            <Text style={styles.welcomeText}>Escolha uma sugestão ou escreva sua pergunta para começar.</Text>
            <View style={styles.suggestions}>
              {suggestions.map((item) => (
                <Pressable accessibilityRole="button" key={item} onPress={() => sendMessage(item)} style={styles.suggestion}>
                  <Text style={styles.suggestionText}>{item}</Text>
                  <Ionicons name="arrow-up-outline" size={16} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : messages.map((item) => (
          // Mensagens da pessoa ficam à direita; respostas da IA ficam à esquerda.
          <View key={item.id} style={[styles.messageRow, item.role === 'user' && styles.userMessageRow]}>
            {item.role === 'assistant' ? (
              // Mantém a foto da assistente circular também ao lado das respostas.
              <View style={styles.messageAvatar}>
                <Image source={require('../../../assets/logoIA.png')} style={styles.messageLogo} resizeMode="cover" />
              </View>
            ) : null}
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>{item.content}</Text>
            </View>
          </View>
        ))}

        {/* Informa que a solicitação está sendo processada pelo servidor. */}
        {isSending ? <Text style={styles.typing}>A assistente está respondendo...</Text> : null}
      </ScrollView>

      {/* Campo de texto e botão que chama sendMessage para enviar ao serviço configurado. */}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Escreva sua pergunta"
          editable={!isSending}
          onChangeText={setMessage}
          onSubmitEditing={() => sendMessage()}
          placeholder="Escreva sua pergunta..."
          placeholderTextColor={colors.mutedText}
          returnKeyType="send"
          style={styles.input}
          value={message}
        />
        <Pressable
          accessibilityLabel="Enviar mensagem"
          accessibilityRole="button"
          disabled={isSending || !message.trim()}
          onPress={() => sendMessage()}
          style={[styles.sendButton, (isSending || !message.trim()) && styles.disabledSendButton]}
        >
          <Ionicons name="arrow-up" size={21} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  // Ocupa a tela inteira e mantém o fundo branco.
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },
  // Organiza o ícone e os títulos da conversa em uma linha.
  titleRow: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderBottomColor: colors.primaryDark,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  // Círculo azul-claro atrás do ícone de brilho.
  sparkle: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  logo: {
    borderRadius: 16,
    height: 32,
    width: 32
  },
  // Permite que os textos ocupem o espaço restante do cabeçalho.
  titleCopy: {
    flex: 1,
    gap: 3
  },
  historyAccess: { alignItems: 'center', backgroundColor: colors.white, borderBottomColor: '#E4E7EC', borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingHorizontal: 18, paddingVertical: 11 },
  historyAccessIcon: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  historyAccessCopy: { flex: 1, gap: 2 },
  historyAccessTitle: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  historyAccessSubtitle: { color: colors.mutedText, fontSize: 11 },
  historyBackdrop: { alignItems: 'center', backgroundColor: 'rgba(17,24,39,0.42)', flex: 1, justifyContent: 'center', padding: 22 },
  historyPanel: { backgroundColor: colors.white, borderColor: '#D8E8FF', borderRadius: 22, borderWidth: 1, maxHeight: '78%', maxWidth: 460, padding: 18, width: '100%' },
  historyHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyTitle: { color: colors.primaryDark, fontSize: 19, fontWeight: '800' },
  historyClose: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  newConversation: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 12, flexDirection: 'row', gap: 9, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 11 },
  newConversationText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  historyList: { flexGrow: 0 },
  historyRow: { alignItems: 'center', borderTopColor: '#EAEEF5', borderTopWidth: 1, flexDirection: 'row' },
  historyItem: { flex: 1, gap: 4, paddingVertical: 13 },
  historyItemTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  historyDate: { color: colors.mutedText, fontSize: 11 },
  deleteConversation: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  emptyHistory: { color: colors.mutedText, fontSize: 13, lineHeight: 19, paddingVertical: 22, textAlign: 'center' },
  // Título principal da assistente.
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800'
  },
  // Linha de descrição abaixo do título.
  subtitle: {
    color: '#DCEBFA',
    fontSize: 12
  },
  // Faz o histórico crescer e permite rolar mensagens longas.
  conversation: {
    flexGrow: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 20
  },
  // Centraliza os textos e sugestões exibidos antes da primeira pergunta.
  welcome: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12
  },
  // Círculo que contém o ícone de conversa inicial.
  welcomeIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF4FF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  // Chamada principal exibida no centro do estado inicial.
  welcomeTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 4
  },
  // Instrução abaixo da chamada inicial.
  welcomeText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center'
  },
  // Agrupa as perguntas sugeridas.
  suggestions: {
    alignSelf: 'stretch',
    gap: 9,
    marginTop: 8
  },
  // Cartão clicável de cada pergunta sugerida.
  suggestion: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  // Texto da pergunta sugerida.
  suggestionText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    marginRight: 8
  },
  // Alinha cada balão e empurra as mensagens da pessoa para a direita.
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8
  },
  // Alinhamento horizontal dos balões escritos pela pessoa.
  userMessageRow: {
    justifyContent: 'flex-end'
  },
  // Espaço abaixo do ícone da IA para alinhá-lo com o balão.
  // Fundo circular que recorta a imagem da NutriIA nas mensagens.
  messageAvatar: {
    backgroundColor: colors.white,
    borderRadius: 18,
    height: 36,
    marginBottom: 8,
    overflow: 'hidden',
    width: 36
  },
  // Imagem da assistente ocupa todo o círculo do avatar.
  messageLogo: {
    height: 36,
    width: 36
  },
  // Formato comum de todas as mensagens.
  bubble: {
    borderRadius: 18,
    maxWidth: '85%',
    paddingHorizontal: 15,
    paddingVertical: 11
  },
  // Cor e canto do balão de resposta da IA.
  assistantBubble: {
    backgroundColor: '#F2F4F7',
    borderBottomLeftRadius: 5
  },
  // Cor e canto do balão enviado pela pessoa.
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5
  },
  // Texto usado nos balões da conversa.
  bubbleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  // Deixa o texto da pessoa legível sobre o fundo azul.
  userBubbleText: {
    color: colors.white
  },
  // Mensagem temporária mostrada durante a chamada à IA.
  typing: {
    color: colors.mutedText,
    fontSize: 12,
    textAlign: 'center'
  },
  // Campo de texto e botão de envio na parte inferior.
  composer: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginHorizontal: 14,
    padding: 6
  },
  // Faz o campo de texto ocupar o espaço livre no compositor.
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  // Botão circular que envia a pergunta.
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  // Indica que o envio está indisponível ou em andamento.
  disabledSendButton: {
    opacity: 0.45
  }
});
