import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Papel permitido para cada mensagem enviada ao endpoint da sua IA.
export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Usa o endereço da rede anunciado pelo Expo em celulares físicos e o host local nos simuladores.
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const localHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const deviceHost = Device.isDevice && expoHost ? expoHost : localHost;
const DEFAULT_AI_API_URL = Platform.OS === 'web' ? 'http://localhost:8000/chat' : `http://${deviceHost}:8000/chat`;
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
    throw new Error(`Não consegui acessar o servidor da IA em ${AI_API_URL}. Confira se o app foi iniciado com npm start e se o aparelho está na mesma rede.`);
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
