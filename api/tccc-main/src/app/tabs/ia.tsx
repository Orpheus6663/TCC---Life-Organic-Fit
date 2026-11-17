import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { sendMessageToAI } from '../../services/aiService';
import type { AiMessage } from '../../services/aiService';

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
  // Guarda o texto que a pessoa ainda está escrevendo.
  const [message, setMessage] = useState('');
  // Guarda o histórico visível no chat.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Indica que a chamada ao servidor está em andamento.
  const [isSending, setIsSending] = useState(false);

  // Envia uma pergunta digitada ou um dos exemplos e mostra a resposta recebida do servidor.
  async function sendMessage(text = message) {
    const question = text.trim();
    if (!question || isSending) return;

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: question };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setMessage('');
    setIsSending(true);

    try {
      const reply = await sendMessageToAI(conversation.map(({ role, content }) => ({ role, content })));
      setMessages((current) => [...current, { id: Date.now(), role: 'assistant', content: reply }]);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Não foi possível obter uma resposta da IA.';
      setMessages((current) => [...current, { id: Date.now(), role: 'assistant', content: errorText }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    // Ajusta a tela quando o teclado aparece, principalmente no iOS.
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Cabeçalho compartilhado com as outras telas do aplicativo. */}
      <Header />

      {/* Mostra o nome da assistente e o assunto da conversa. */}
      <View style={styles.titleRow}>
        <View style={styles.sparkle}><Ionicons name="sparkles" size={20} color={colors.primary} /></View>
        <View style={styles.titleCopy}>
          <Text style={styles.title}>Sua assistente</Text>
          <Text style={styles.subtitle}>Bem-estar, alimentação e movimento</Text>
        </View>
      </View>

      {/* Área rolável que contém a apresentação inicial ou as mensagens enviadas e recebidas. */}
      <ScrollView contentContainerStyle={styles.conversation} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
            {item.role === 'assistant' ? <Ionicons name="sparkles" size={17} color={colors.primary} style={styles.messageIcon} /> : null}
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
    </KeyboardAvoidingView>
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
    borderBottomColor: '#EAECF0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  // Círculo azul-claro atrás do ícone de brilho.
  sparkle: {
    alignItems: 'center',
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  // Permite que os textos ocupem o espaço restante do cabeçalho.
  titleCopy: {
    flex: 1,
    gap: 3
  },
  // Título principal da assistente.
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  // Linha de descrição abaixo do título.
  subtitle: {
    color: colors.mutedText,
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
  messageIcon: {
    marginBottom: 8
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
