import { Platform } from 'react-native';

// Papel permitido para cada mensagem enviada ao endpoint da sua IA.
export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Permite testar sem configuração no emulador/simulador; celular físico usa o IP do computador no .env.
const DEFAULT_AI_API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/chat'
  : 'http://localhost:8000/chat';
const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL?.trim() || DEFAULT_AI_API_URL;

// Envia o histórico da conversa para o servidor e espera uma resposta no formato { "reply": "..." }.
export async function sendMessageToAI(messages: AiMessage[], preferences: Record<string, string | string[]> = {}): Promise<string> {
  let response: Response;
  try {
    response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, preferences }),
    });
  } catch {
    throw new Error('Não consegui acessar o servidor da IA. Confira a URL e sua conexão.');
  }

  const payload = await response.json().catch(() => ({})) as { reply?: unknown; message?: string; erro?: string };
  if (!response.ok) {
    throw new Error(payload.message || payload.erro || `O servidor da IA respondeu com erro ${response.status}.`);
  }
  if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
    throw new Error('A resposta do servidor não contém o campo "reply" em texto.');
  }

  return payload.reply.trim();
}
