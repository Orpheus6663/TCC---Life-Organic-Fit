import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Confere o papel no Auth e só então usa a chave privada no servidor.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return respond(500, { error: 'A função administrativa não está configurada no Supabase.' });
  }

  const token = authorization.replace(/^Bearer\s+/i, '');
  const userClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Entre novamente para continuar.' });
  if (authData.user.app_metadata?.role !== 'admin') return respond(403, { error: 'Acesso permitido somente para administradores.' });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const payload = await request.json();
    if (payload.action === 'listUsers') {
      const page = Math.max(1, Number(payload.page) || 1);
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      return respond(200, {
        users: data.users.map((user) => ({
          id: user.id,
          email: user.email ?? '',
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
          isAdmin: user.app_metadata?.role === 'admin',
        })),
        hasMore: data.users.length === 100,
      });
    }

    if (payload.action === 'deleteUser' && typeof payload.userId === 'string') {
      if (payload.userId === authData.user.id) return respond(400, { error: 'A conta administrativa atual não pode ser removida por esta tela.' });
      const { data: targetData, error: targetError } = await adminClient.auth.admin.getUserById(payload.userId);
      if (targetError) throw targetError;
      if (!targetData.user) return respond(404, { error: 'Conta não encontrada.' });
      if (targetData.user.app_metadata?.role === 'admin') return respond(403, { error: 'Outra conta administradora não pode ser removida por esta tela.' });

      // Apaga todas as fotos da pessoa antes de remover a conta e os registros ligados a ela.
      while (true) {
        const { data: files, error: listError } = await adminClient.storage.from('forum-images').list(payload.userId, { limit: 1000 });
        if (listError && !listError.message.toLowerCase().includes('bucket not found')) throw listError;
        if (!files?.length) break;
        const { error: removeError } = await adminClient.storage.from('forum-images').remove(files.map((file) => `${payload.userId}/${file.name}`));
        if (removeError) throw removeError;
        if (files.length < 1000) break;
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(payload.userId);
      if (deleteError) throw deleteError;
      return respond(200, { ok: true });
    }

    if (payload.action === 'deletePost' && typeof payload.postId === 'string') {
      const { data: post, error: postError } = await adminClient
        .from('postagens_forum')
        .select('id, id_usuario, imagem_url')
        .eq('id', payload.postId)
        .maybeSingle();
      if (postError) throw postError;
      if (!post) return respond(404, { error: 'Publicação não encontrada.' });

      // Remove a foto pública associada antes de apagar a publicação e seus comentários.
      if (post.imagem_url) {
        const marker = '/storage/v1/object/public/forum-images/';
        const imagePath = post.imagem_url.split(marker)[1]?.split('?')[0];
        if (imagePath?.startsWith(`${post.id_usuario}/`)) {
          const { error: photoError } = await adminClient.storage.from('forum-images').remove([decodeURIComponent(imagePath)]);
          if (photoError) throw photoError;
        }
      }
      const { error: deleteError } = await adminClient.from('postagens_forum').delete().eq('id', payload.postId);
      if (deleteError) throw deleteError;
      return respond(200, { ok: true });
    }

    return respond(400, { error: 'Ação administrativa inválida.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a ação administrativa.';
    return respond(500, { error: message });
  }
});
