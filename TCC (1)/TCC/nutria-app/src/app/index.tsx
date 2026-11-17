import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 10.0.2.2 encaminha do emulador Android para o computador host.
const API_URL = 'http://10.0.2.2:8000/chat';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  time: string;
  error?: boolean;
};

function currentTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Olá! Eu sou a NutriIA, sua assistente virtual de educação nutricional!\n\nComo posso te ajudar hoje?',
      time: currentTime(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollView = useRef<ScrollView>(null);

  useEffect(() => {
    scrollView.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  async function sendMessage() {
    const question = draft.trim();
    if (!question || loading) return;

    setDraft('');
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', text: question, time: currentTime() },
    ]);
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: question }),
      });
      const data: { resposta?: string; erro?: string } = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível consultar a NutriIA.');
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', text: data.resposta ?? 'Não recebi uma resposta.', time: currentTime() },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Erro inesperado.';
      const message = detail === 'Network request failed'
        ? 'Não consegui conectar à API. Confira se ela está rodando no computador na porta 8000.'
        : detail;
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-error`, role: 'assistant', text: message, time: currentTime(), error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Text style={styles.brandGlyph}>◖Ⅱ◗</Text></View>
          <View>
            <Text style={styles.brandName}>NUTRIIA</Text>
            <Text style={styles.brandSubtitle}>Sua assistente de nutrição</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Mais opções">
          <Text style={styles.moreIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.chat} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollView}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollView.current?.scrollToEnd({ animated: true })}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <View key={message.id} style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
                {!isUser && <View style={styles.avatar}><Text style={styles.avatarGlyph}>◖Ⅱ◗</Text></View>}
                <View style={[styles.messageColumn, isUser && styles.userColumn]}>
                  <View style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                    message.error && styles.errorBubble,
                  ]}>
                    <Text style={styles.messageText}>{message.text}</Text>
                  </View>
                  <View style={[styles.metadata, isUser && styles.userMetadata]}>
                    <Text style={styles.time}>{message.time}</Text>
                    {isUser && <Text style={styles.receipt}>✓✓</Text>}
                  </View>
                </View>
              </View>
            );
          })}
          {loading && (
            <View style={styles.messageRow}>
              <View style={styles.avatar}><Text style={styles.avatarGlyph}>◖Ⅱ◗</Text></View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#1022b5" />
                <Text style={styles.typingText}> NutriIA está respondendo…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TouchableOpacity style={styles.attachButton} accessibilityRole="button" accessibilityLabel="Anexar arquivo">
            <Text style={styles.attachIcon}>⌁</Text>
          </TouchableOpacity>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#6f7897"
            style={styles.input}
            multiline
            maxLength={1500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            accessibilityLabel="Mensagem para a NutriIA"
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!draft.trim() || loading}
            style={[styles.sendButton, (!draft.trim() || loading) && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem">
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101dbb' },
  header: { height: 82, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#101dbb' },
  headerAction: { width: 34, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#fff', fontSize: 40, lineHeight: 44, fontWeight: '300' },
  moreIcon: { color: '#fff', fontSize: 30 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: { width: 53, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1551d3', transform: [{ skewX: '-13deg' }] },
  brandGlyph: { color: '#fff', fontSize: 21, fontWeight: '800' },
  brandName: { color: '#fff', fontSize: 29, fontWeight: '800', fontStyle: 'italic', letterSpacing: 1.5 },
  brandSubtitle: { color: '#d8e4ff', fontSize: 12, fontStyle: 'italic', marginTop: -2 },
  chat: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 27, borderTopRightRadius: 27, overflow: 'hidden' },
  messageList: { paddingHorizontal: 18, paddingTop: 34, paddingBottom: 22, gap: 7 },
  messageRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  assistantRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  avatar: { width: 41, height: 41, borderRadius: 22, backgroundColor: '#071da8', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginRight: 12 },
  avatarGlyph: { color: '#fff', fontSize: 18, fontWeight: '800' },
  messageColumn: { maxWidth: '78%', alignItems: 'flex-start' },
  userColumn: { maxWidth: '76%', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 17, paddingVertical: 15, borderRadius: 18 },
  assistantBubble: { backgroundColor: '#eaf0ff', borderTopLeftRadius: 7 },
  userBubble: { backgroundColor: '#91ceff', borderTopRightRadius: 7 },
  errorBubble: { backgroundColor: '#fff0ed' },
  messageText: { color: '#07112e', fontSize: 15, lineHeight: 21 },
  metadata: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 9, gap: 6 },
  userMetadata: { marginRight: 3 },
  time: { color: '#626d8b', fontSize: 12 },
  receipt: { color: '#168bff', fontSize: 12, fontWeight: '700' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#eaf0ff', borderRadius: 16, padding: 12, marginTop: 14 },
  typingText: { color: '#586482', fontSize: 13 },
  composer: { minHeight: 78, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#f5f7ff', borderTopWidth: 1, borderTopColor: '#e7ecfb', flexDirection: 'row', alignItems: 'center', gap: 10 },
  attachButton: { width: 44, height: 44, borderRadius: 24, borderWidth: 1, borderColor: '#d2dcf5', alignItems: 'center', justifyContent: 'center' },
  attachIcon: { color: '#1026a8', fontSize: 31, lineHeight: 36, transform: [{ rotate: '-35deg' }] },
  input: { flex: 1, minHeight: 46, maxHeight: 100, borderWidth: 1, borderColor: '#cbd5ef', backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, color: '#111b37', fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 24, backgroundColor: '#0a1caa', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.6 },
  sendIcon: { color: '#fff', fontSize: 22, marginLeft: 2 },
});
