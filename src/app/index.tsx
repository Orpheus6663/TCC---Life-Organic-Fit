import { Redirect } from 'expo-router';

export default function Index() {
    // A tela inicial direciona para o login; após autenticar, o app abre as abas.
    return <Redirect href="/auth/login" />;
}
