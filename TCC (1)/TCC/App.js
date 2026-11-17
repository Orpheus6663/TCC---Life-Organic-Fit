import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

// Android Emulator: 10.0.2.2. Em celular físico, use o IP local do computador.
const API_URL = 'http://10.0.2.2:8000/chat';
const horaAgora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function App() {
  const [mensagens, setMensagens] = useState([
    { id: 'boas-vindas', autor: 'bot', texto: 'Olá! Eu sou a NutriIA, sua assistente virtual de educação nutricional!\n\nComo posso te ajudar hoje?', hora: horaAgora() },
  ]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const scroll = useRef(null);

  useEffect(() => { scroll.current?.scrollToEnd({ animated: true }); }, [mensagens, carregando]);

  async function enviar() {
    const pergunta = texto.trim();
    if (!pergunta || carregando) return;
    setTexto('');
    setMensagens((lista) => [...lista, { id: `${Date.now()}-u`, autor: 'usuario', texto: pergunta, hora: horaAgora() }]);
    setCarregando(true);
    try {
      const resposta = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: pergunta }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Erro ao consultar a NutriIA.');
      setMensagens((lista) => [...lista, { id: `${Date.now()}-b`, autor: 'bot', texto: dados.resposta, hora: horaAgora() }]);
    } catch (erro) {
      const detalhe = erro.message === 'Network request failed'
        ? 'Não consegui conectar ao assistente. Confira se a API está rodando e se o endereço em App.js corresponde ao seu computador.'
        : erro.message;
      setMensagens((lista) => [...lista, { id: `${Date.now()}-e`, autor: 'bot', texto: detalhe, hora: horaAgora(), erro: true }]);
    } finally { setCarregando(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#101bc5" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Voltar"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <View style={styles.brand}>
          <View style={styles.logoMark}><Text style={styles.logoGlyph}>◖Ⅱ◗</Text></View>
          <View><Text style={styles.title}>NUTRIIA</Text><Text style={styles.subtitle}>Sua assistente de nutrição</Text></View>
        </View>
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Mais opções"><Text style={styles.dots}>⋮</Text></TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.chat} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {mensagens.map((item) => {
            const usuario = item.autor === 'usuario';
            return (
              <View key={item.id} style={[styles.messageGroup, usuario ? styles.userGroup : styles.botGroup]}>
                {!usuario && <View style={styles.avatar}><Text style={styles.avatarGlyph}>◖Ⅱ◗</Text></View>}
                <View style={[styles.messageColumn, usuario && styles.userColumn]}>
                  <View style={[styles.bubble, usuario ? styles.userBubble : styles.botBubble, item.erro && styles.errorBubble]}>
                    <Text style={styles.messageText}>{item.texto}</Text>
                  </View>
                  <View style={[styles.messageMeta, usuario && styles.userMeta]}>
                    <Text style={styles.time}>{item.hora}</Text>
                    {usuario && <Text style={styles.check}>✓✓</Text>}
                  </View>
                </View>
              </View>
            );
          })}
          {carregando && <View style={styles.typing}><View style={styles.avatar}><Text style={styles.avatarGlyph}>◖Ⅱ◗</Text></View><View style={styles.typingBubble}><ActivityIndicator size="small" color="#1024bb"/><Text style={styles.typingText}> NutriIA está respondendo…</Text></View></View>}
        </ScrollView>

        <View style={styles.composer}>
          <TouchableOpacity style={styles.attach} accessibilityLabel="Anexar arquivo"><Text style={styles.attachText}>⌁</Text></TouchableOpacity>
          <TextInput value={texto} onChangeText={setTexto} placeholder="Digite sua mensagem..." placeholderTextColor="#6f7897" style={styles.input} multiline maxLength={1500} onSubmitEditing={enviar} returnKeyType="send" />
          <TouchableOpacity onPress={enviar} disabled={!texto.trim() || carregando} style={[styles.send, (!texto.trim() || carregando) && styles.sendDisabled]} accessibilityLabel="Enviar mensagem"><Text style={styles.sendText}>➤</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0c1cbd' },
  header: { height: 82, backgroundColor: '#101bc5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  headerButton: { width: 32, alignItems: 'center', justifyContent: 'center' }, back: { color: '#fff', fontSize: 38, lineHeight: 42, fontWeight: '300' }, dots: { color: '#fff', fontSize: 30 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 }, logoMark: { width: 53, height: 40, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-13deg' }], backgroundColor: '#185cde' }, logoGlyph: { color: '#fff', fontSize: 22, fontWeight: '800' }, title: { color: '#fff', fontSize: 30, fontWeight: '800', fontStyle: 'italic', letterSpacing: 1.5 }, subtitle: { color: '#d8e4ff', fontSize: 12, fontStyle: 'italic', marginTop: -2 },
  chat: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 27, borderTopRightRadius: 27, overflow: 'hidden' },
  messages: { paddingHorizontal: 18, paddingTop: 34, paddingBottom: 22, gap: 7 },
  messageGroup: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }, botGroup: { justifyContent: 'flex-start' }, userGroup: { justifyContent: 'flex-end' },
  avatar: { width: 41, height: 41, borderRadius: 22, backgroundColor: '#071da8', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginRight: 12 }, avatarGlyph: { color: '#fff', fontSize: 18, fontWeight: '800' },
  messageColumn: { maxWidth: '78%', alignItems: 'flex-start' }, userColumn: { alignItems: 'flex-end', maxWidth: '76%' },
  bubble: { paddingHorizontal: 17, paddingVertical: 15, borderRadius: 18 }, botBubble: { backgroundColor: '#eaf0ff', borderTopLeftRadius: 7 }, userBubble: { backgroundColor: '#91ceff', borderTopRightRadius: 7 }, errorBubble: { backgroundColor: '#fff0ed' },
  messageText: { color: '#07112e', fontSize: 15, lineHeight: 21 }, messageMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 9, gap: 6 }, userMeta: { marginRight: 3 }, time: { color: '#626d8b', fontSize: 12 }, check: { color: '#168bff', fontSize: 12, fontWeight: '700' },
  typing: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf0ff', borderRadius: 16, padding: 12 }, typingText: { color: '#586482', fontSize: 13 },
  composer: { minHeight: 78, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#f5f7ff', borderTopWidth: 1, borderTopColor: '#e7ecfb', flexDirection: 'row', alignItems: 'center', gap: 10 }, attach: { width: 44, height: 44, borderRadius: 24, borderWidth: 1, borderColor: '#d2dcf5', alignItems: 'center', justifyContent: 'center' }, attachText: { color: '#1026a8', fontSize: 31, lineHeight: 36, transform: [{ rotate: '-35deg' }] }, input: { flex: 1, minHeight: 46, maxHeight: 100, borderWidth: 1, borderColor: '#cbd5ef', backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, color: '#111b37', fontSize: 14 }, send: { width: 46, height: 46, borderRadius: 24, backgroundColor: '#0a1caa', alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: 0.65 }, sendText: { color: '#fff', fontSize: 22, marginLeft: 2 },
});
