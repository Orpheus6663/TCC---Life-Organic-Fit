import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Verifies the caller, removes their forum photos, then deletes their Auth account.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Método não permitido.' });

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: 'A função de exclusão não está configurada no Supabase.' });
  }

  const accessToken = authorization.replace(/^Bearer\s+/i, '');
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) return respond(401, { error: 'Entre novamente para excluir sua conta.' });
  const user = userData.user;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Storage objects must be removed through the Storage API before deleting their owner.
    let offset = 0;
    while (true) {
      const { data: files, error: listError } = await adminClient.storage
        .from('forum-images')
        .list(user.id, { limit: 1000, offset });
      if (listError && !listError.message.toLowerCase().includes('bucket not found')) throw listError;
      if (!files?.length) break;

      const paths = files.map((file) => `${user.id}/${file.name}`);
      const { error: removeError } = await adminClient.storage.from('forum-images').remove(paths);
      if (removeError) throw removeError;
      offset += files.length;
      if (files.length < 1000) break;
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return respond(200, { message: 'Conta excluída.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a conta.';
    return respond(500, { error: message });
  }
});
