import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

async function ownerId() {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  return data.session?.user.id ?? 'guest';
}

function premiumKey(id: string) {
  return `@lifeorganicfit/demo-premium/${id}`;
}

function profilePhotoKey(id: string) {
  return `@lifeorganicfit/profile-photo/${id}`;
}

export async function hasDemoPremium() {
  const id = await ownerId();
  return (await AsyncStorage.getItem(premiumKey(id))) === 'active';
}

export async function activateDemoPremium() {
  const id = await ownerId();
  await AsyncStorage.setItem(premiumKey(id), 'active');
}

export async function getDemoProfilePhoto() {
  const id = await ownerId();
  return AsyncStorage.getItem(profilePhotoKey(id));
}

export async function saveDemoProfilePhoto(uri: string | null) {
  const id = await ownerId();
  const key = profilePhotoKey(id);
  if (uri) await AsyncStorage.setItem(key, uri);
  else await AsyncStorage.removeItem(key);
}
