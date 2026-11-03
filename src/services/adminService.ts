import { requireSupabase } from '../lib/supabase';
import { deleteForumPost } from './forumService';

// Representa apenas os dados públicos que a área de administração precisa exibir.
export type AdminAccount = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
};

// Pede ao endpoint protegido do servidor a lista paginada de contas.
export async function loadAdminAccounts(page = 1) {
  const { data, error } = await requireSupabase().functions.invoke('admin-management', { body: { action: 'listUsers', page } });
  if (error) {
    const details = error.message || 'erro sem detalhes';
    throw new Error(`Não foi possível listar as contas (${details}). A função admin-management precisa estar implantada no projeto Supabase conectado pelo .env.`);
  }
  if (data?.error) throw new Error(data.error);
  return { users: (data?.users ?? []) as AdminAccount[], hasMore: Boolean(data?.hasMore) };
}

// Remove uma conta comum; o servidor impede a remoção de contas administradoras.
export async function removeAdminAccount(userId: string) {
  const { data, error } = await requireSupabase().functions.invoke('admin-management', { body: { action: 'deleteUser', userId } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Apaga uma publicação denunciada e tenta remover sua foto do armazenamento.
export async function removeAdminPost(postId: string) {
  await deleteForumPost(postId);
}
