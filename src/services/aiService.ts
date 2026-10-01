// Papel permitido para cada mensagem enviada ao endpoint da sua IA.
export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Coloque no .env a URL completa do endpoint do seu servidor, incluindo o caminho da rota.
const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL?.trim();

// Envia o histórico da conversa para o servidor e espera uma resposta no formato { "reply": "..." }.
export async function sendMessageToAI(messages: AiMessage[]): Promise<string> {
  if (!AI_API_URL) {
    throw new Error('Adicione a URL do servidor da sua IA em EXPO_PUBLIC_AI_API_URL no arquivo .env.');
  }

  let response: Response;
  try {
    response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
  } catch {
    throw new Error('Não consegui acessar o servidor da IA. Confira a URL e sua conexão.');
  }

  const payload = await response.json().catch(() => ({})) as { reply?: unknown; message?: string };
  if (!response.ok) {
    throw new Error(payload.message || `O servidor da IA respondeu com erro ${response.status}.`);
  }
  if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
    throw new Error('A resposta do servidor não contém o campo "reply" em texto.');
  }

  return payload.reply.trim();
}
