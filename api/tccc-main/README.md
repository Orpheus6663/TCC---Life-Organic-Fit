<<<<<<< HEAD
# Life Organic Fit

Aplicativo Expo SDK 57 com autenticação e persistência de questionário, refeições e consumo de água no Supabase.

## Configuração do backend

1. Crie um projeto no [Supabase](https://supabase.com/) ou use um projeto ao qual você já tenha acesso.
2. No painel, copie a **Project URL** e a chave **anon/publishable**.
3. Copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. No SQL Editor do Supabase, execute [`database/schema.sql`](database/schema.sql).
5. Em Authentication, habilite cadastro por e-mail e senha. Se a confirmação de e-mail estiver habilitada, a pessoa precisa confirmar o endereço antes de entrar.
6. Instale as dependências e inicie o app:

   ```bash
   npm install
   npx expo start
   ```

O aplicativo usa a chave pública do Supabase. **Nunca coloque `service_role` ou outra chave secreta em um app Expo.** As tabelas têm RLS habilitado e só permitem que uma pessoa autenticada acesse as próprias linhas.

## Recursos conectados

- Cadastro, login e sessão persistida com Supabase Auth.
- Respostas do questionário salvas em `questionnaires`.
- Registros de refeições em `meals`.
- Consumo de água em `water_logs`.

A assistente de IA continua usando um endpoint próprio configurado por `EXPO_PUBLIC_AI_API_URL`. Fórum e progresso ainda são recursos locais/demonstrativos.
=======
# tccc
>>>>>>> e93e1e14908f9411a564a40ce3743fb11801fadb
