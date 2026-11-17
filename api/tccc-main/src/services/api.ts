/*import { API_URL } from '../constants/config';

type ApiErrorBody = { message?: string };

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers } });
  } catch {
    throw new Error('Não foi possível alcançar o servidor. Confira a URL da API e se ela está em execução.');
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!response.ok) throw new Error(body.message ?? 'Ocorreu um erro ao comunicar com o servidor.');
  return body as T;
}
*/