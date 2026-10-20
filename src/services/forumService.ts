import { requireSupabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

type ForumPostRow = {
  id: string;
  titulo: string;
  conteudo: string;
  id_usuario: string;
  criado_em: string;
  nome_autor?: string | null;
  avatar_id?: string | null;
  categoria?: string | null;
  imagem_url?: string | null;
  // Permissão gravada na publicação; posts antigos aceitam comentários por padrão.
  permite_comentarios?: boolean | null;
};

type ForumReplyRow = {
  id: string;
  id_postagem: string;
  id_comentario_pai?: string | null;
  id_usuario: string;
  conteudo: string;
  criado_em: string;
  autor_nome?: string | null;
  autor_avatar?: string | null;
};

type LikeRow = { id_postagem: string; id_usuario: string };

export type ForumComment = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  avatarId?: string;
  createdAt: string;
  replies: ForumComment[];
};

export type ForumPost = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  avatarId?: string;
  category: string;
  // Endereço público da foto e permissão carregados junto com cada publicação.
  imageUri?: string;
  commentsEnabled: boolean;
  createdAt: string;
  comments: ForumComment[];
  likes: number;
  likedByMe: boolean;
};

export async function loadForumPosts(): Promise<ForumPost[]> {
  const client = requireSupabase();
  const { data: postRows, error: postsError } = await client
    .from('postagens_forum')
    .select('*')
    .order('criado_em', { ascending: false });

  if (postsError) throw new Error(postsError.message);
  const posts = (postRows ?? []) as ForumPostRow[];
  if (posts.length === 0) return [];

  const { data: replyRows, error: repliesError } = await client
    .from('respostas_forum')
    .select('*')
    .in('id_postagem', posts.map((post) => post.id))
    .order('criado_em', { ascending: true });

  if (repliesError) throw new Error(repliesError.message);
  const { data: likeRows, error: likesError } = await client
    .from('curtidas_forum')
    .select('id_postagem, id_usuario')
    .in('id_postagem', posts.map((post) => post.id));
  // Bases antigas ainda não têm a tabela de curtidas; o feed continua acessível nelas.
  const currentUser = (await client.auth.getUser()).data.user?.id;
  const likesByPost = new Map<string, LikeRow[]>();
  for (const like of (likeRows ?? []) as LikeRow[]) {
    const likes = likesByPost.get(like.id_postagem) ?? [];
    likes.push(like);
    likesByPost.set(like.id_postagem, likes);
  }
  const commentsByPost = new Map<string, ForumComment[]>();
  const commentsById = new Map<string, ForumComment>();
  for (const row of (replyRows ?? []) as ForumReplyRow[]) {
    const comment: ForumComment = {
      id: row.id,
      text: row.conteudo,
      authorId: row.id_usuario,
      authorName: row.autor_nome ?? 'Pessoa usuária',
      avatarId: row.autor_avatar ?? undefined,
      createdAt: row.criado_em,
      replies: [],
    };
    commentsById.set(comment.id, comment);
    const parent = row.id_comentario_pai ? commentsById.get(row.id_comentario_pai) : undefined;
    if (parent) {
      parent.replies.push(comment);
    } else {
      const comments = commentsByPost.get(row.id_postagem) ?? [];
      comments.push(comment);
      commentsByPost.set(row.id_postagem, comments);
    }
  }

  return posts.map((post) => ({
    id: post.id,
    text: post.conteudo,
    authorId: post.id_usuario,
    authorName: post.nome_autor ?? 'Pessoa usuária',
    avatarId: post.avatar_id ?? undefined,
    category: post.categoria ?? 'Dicas',
    imageUri: post.imagem_url ?? undefined,
    // Usa true para preservar o comportamento de posts criados antes desta opção.
    commentsEnabled: post.permite_comentarios ?? true,
    createdAt: post.criado_em,
    comments: commentsByPost.get(post.id) ?? [],
    likes: likesError ? 0 : (likesByPost.get(post.id) ?? []).length,
    likedByMe: !likesError && !!currentUser && (likesByPost.get(post.id) ?? []).some((like) => like.id_usuario === currentUser),
  }));
}

// Salva no Supabase o conteúdo e a permissão de comentários da publicação.
// Envia uma foto local para o bucket público usado nas imagens do fórum.
export async function uploadForumImage(uri: string, userId: string): Promise<string> {
  const client = requireSupabase();
  const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const allowedExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  const contentType = allowedExtension === 'png' ? 'image/png' : allowedExtension === 'webp' ? 'image/webp' : 'image/jpeg';
  // Lê os bytes em Base64 e os converte em ArrayBuffer, formato estável no React Native.
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = decodeBase64(base64);
  const imagePath = `${userId}/${Date.now()}.${allowedExtension}`;
  const { error } = await client.storage.from('forum-images').upload(imagePath, binary, { contentType, upsert: false });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('bucket not found')) {
      throw new Error('O armazenamento de fotos ainda não foi configurado. Execute database/schema.sql no SQL Editor do Supabase.');
    }
    throw new Error(error.message);
  }
  return client.storage.from('forum-images').getPublicUrl(imagePath).data.publicUrl;
}

// Converte Base64 em bytes sem depender de APIs de navegador ausentes em alguns aparelhos.
function decodeBase64(value: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const encoded = value.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((encoded.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let offset = 0;
  for (const character of encoded) {
    buffer = (buffer << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset++] = (buffer >> bits) & 0xff;
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes.slice(0, offset).buffer;
}

// Salva no Supabase o conteúdo, a foto e a permissão de comentários da publicação.
export async function createForumPost(input: { text: string; userId: string; authorName: string; avatarId?: string; category: string; commentsEnabled: boolean; imageUrl?: string }) {
  const client = requireSupabase();
  const { error } = await client
    .from('postagens_forum')
    .insert({ titulo: input.text.slice(0, 80) || 'Foto da comunidade', conteudo: input.text, id_usuario: input.userId, nome_autor: input.authorName, avatar_id: input.avatarId ?? null, categoria: input.category, permite_comentarios: input.commentsEnabled, imagem_url: input.imageUrl ?? null });
  if (error) throw new Error(error.message);
}

export async function deleteForumPost(postId: string) {
  const { error } = await requireSupabase().from('postagens_forum').delete().eq('id', postId);
  if (error) throw new Error(error.message);
}

export async function createForumComment(input: { postId: string; text: string; userId: string; authorName: string; avatarId?: string; parentCommentId?: string }) {
  const client = requireSupabase();
  const { error } = await client.from('respostas_forum').insert({
    id_postagem: input.postId,
    id_comentario_pai: input.parentCommentId ?? null,
    id_usuario: input.userId,
    conteudo: input.text,
    autor_nome: input.authorName,
    autor_avatar: input.avatarId ?? null,
  });
  if (!error) return;
  throw new Error(error.message);
}

export async function deleteForumComment(commentId: string) {
  const { data, error } = await requireSupabase()
    .from('respostas_forum')
    .delete()
    .eq('id', commentId)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error('O Supabase não apagou o comentário. Confira se a política de DELETE permite ao autor apagar a própria resposta.');
  }
}

export async function toggleForumLike(input: { postId: string; userId: string; liked: boolean }) {
  const client = requireSupabase();
  const query = client.from('curtidas_forum');
  const result = input.liked
    ? await query.delete().eq('id_postagem', input.postId).eq('id_usuario', input.userId)
    : await query.insert({ id_postagem: input.postId, id_usuario: input.userId });
  if (result.error && !result.error.message.toLowerCase().includes('curtidas_forum') && !result.error.message.toLowerCase().includes('schema cache')) {
    throw new Error(result.error.message);
  }
}
