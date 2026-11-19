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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Método não permitido.' });

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
  const returnUrl = Deno.env.get('MERCADO_PAGO_BACK_URL');
  if (!authorization || !supabaseUrl || !anonKey) return respond(401, { error: 'Entre na sua conta para continuar.' });
  if (!accessToken || !returnUrl) {
    return respond(503, { error: 'Configure MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_BACK_URL nos secrets do Supabase.' });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const email = userData.user?.email;
  if (userError || !userData.user || !email) return respond(401, { error: 'Entre em uma conta com e-mail confirmado para continuar.' });

  let plan: unknown;
  try {
    ({ plan } = await request.json());
  } catch {
    return respond(400, { error: 'Plano inválido.' });
  }
  if (plan !== 'monthly' && plan !== 'annual') return respond(400, { error: 'Selecione um plano válido.' });

  const monthly = plan === 'monthly';
  const amount = monthly ? 19.9 : 149.9;
  const frequency = monthly ? 1 : 12;
  const planName = monthly ? 'Plano Mensal' : 'Plano Anual';

  try {
    const paymentResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `LOF Premium - ${planName}`,
        external_reference: `lof:${userData.user.id}:${plan}`,
        payer_email: email,
        back_url: returnUrl,
        auto_recurring: {
          frequency,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'BRL',
        },
      }),
    });
    const result: unknown = await paymentResponse.json();
    if (!paymentResponse.ok || !result || typeof result !== 'object' || !('init_point' in result) || typeof result.init_point !== 'string') {
      console.error('Mercado Pago checkout creation failed:', paymentResponse.status, result);
      return respond(502, { error: 'O Mercado Pago não conseguiu iniciar o checkout. Tente novamente.' });
    }
    return respond(200, { checkoutUrl: result.init_point });
  } catch (error) {
    console.error('Mercado Pago request failed:', error);
    return respond(502, { error: 'Não foi possível conectar ao Mercado Pago. Tente novamente.' });
  }
});
