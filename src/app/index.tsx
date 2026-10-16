import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '../constants/colors';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function Index() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) setIsCheckingSession(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      setHasSession(!error && !!data.session);
      setIsCheckingSession(false);
    }

    void restoreSession();
    return () => { isMounted = false; };
  }, []);

  if (isCheckingSession) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (hasSession) return <Redirect href="/tabs/home" />;
  return <Redirect href="/auth/login" />;
}
