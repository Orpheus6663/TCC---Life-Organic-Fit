const supabaseUrl = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

const page = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redefinir senha · Life Organic Fit</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f5f8fb; color: #111827; font: 16px system-ui, sans-serif; }
    main { width: min(100%, 440px); padding: 32px; border-radius: 18px; background: white; box-shadow: 0 12px 36px #102a4320; }
    h1 { margin: 0 0 12px; font-size: 25px; }
    p { color: #667085; line-height: 1.5; }
    label { display: block; margin: 18px 0 7px; font-weight: 650; }
    input { width: 100%; height: 48px; padding: 0 13px; border: 1px solid #cbd5e1; border-radius: 10px; font: inherit; }
    button { width: 100%; min-height: 50px; margin-top: 22px; border: 0; border-radius: 10px; background: #075cb9; color: white; font: 700 16px system-ui, sans-serif; cursor: pointer; }
    button:disabled { opacity: .6; cursor: wait; }
    #status { min-height: 24px; margin-top: 16px; color: #075cb9; }
    #status.error { color: #b42318; }
    #form[hidden] { display: none; }
  </style>
</head>
<body>
  <main>
    <h1>Redefinir senha</h1>
    <p>Escolha uma senha nova para sua conta Life Organic Fit.</p>
    <form id="form" hidden>
      <label for="password">Nova senha</label>
      <input id="password" type="password" autocomplete="new-password" required />
      <label for="confirmation">Confirme a nova senha</label>
      <input id="confirmation" type="password" autocomplete="new-password" required />
      <button id="submit" type="submit">Salvar nova senha</button>
    </form>
    <div id="status" role="status">Validando o link de recuperação…</div>
  </main>
  <script type="module">
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    const client = createClient(${JSON.stringify(supabaseUrl ?? '').replace(/</g, '\\u003c')}, ${JSON.stringify(anonKey ?? '').replace(/</g, '\\u003c')});
    const form = document.querySelector('#form');
    const status = document.querySelector('#status');
    const button = document.querySelector('#submit');
    const hash = new URLSearchParams(location.hash.slice(1));
    const query = new URLSearchParams(location.search);
    const isRecoveryCallback = hash.get('type') === 'recovery' || query.has('code');

    function showError(message) {
      status.textContent = message;
      status.classList.add('error');
    }

    if (!isRecoveryCallback) {
      showError('Este link não é válido ou expirou. Solicite outro link de recuperação.');
    } else {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) {
        showError('O link expirou ou já foi usado. Solicite um novo link de recuperação.');
      } else {
        form.hidden = false;
        status.textContent = 'Link validado. Informe sua nova senha.';
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = document.querySelector('#password').value;
      const confirmation = document.querySelector('#confirmation').value;
      if (password.length < 6 || !/\\p{L}/u.test(password)) {
        showError('A senha precisa ter pelo menos 6 caracteres e uma letra.');
        return;
      }
      if (password !== confirmation) {
        showError('As senhas não coincidem.');
        return;
      }

      button.disabled = true;
      status.classList.remove('error');
      status.textContent = 'Salvando…';
      const { error } = await client.auth.updateUser({ password });
      button.disabled = false;
      if (error) {
        showError(error.message);
        return;
      }
      form.hidden = true;
      status.textContent = 'Senha alterada. Volte ao aplicativo e entre com a senha nova.';
    });
  </script>
</body>
</html>`;

Deno.serve((request) => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (!supabaseUrl || !anonKey) return new Response('Supabase function is not configured.', { status: 500 });

  return new Response(page, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
});
