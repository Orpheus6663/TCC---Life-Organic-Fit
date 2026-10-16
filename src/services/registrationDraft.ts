import AsyncStorage from '@react-native-async-storage/async-storage';

export type RegistrationDraft = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type SavedRegistrationDraft = Omit<RegistrationDraft, 'password'>;
const STORAGE_KEY = '@lifeorganicfit/registration-draft-v1';
let registrationDraft: RegistrationDraft | null = null;

export async function setRegistrationDraft(draft: RegistrationDraft) {
  registrationDraft = draft;
  const savedDraft: SavedRegistrationDraft = {
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));
}

export async function restoreRegistrationDraft() {
  if (registrationDraft) return registrationDraft;
  const storedDraft = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storedDraft) return null;

  const parsed = JSON.parse(storedDraft) as Partial<SavedRegistrationDraft>;
  if (typeof parsed.name !== 'string' || typeof parsed.phone !== 'string' || typeof parsed.email !== 'string') {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }

  registrationDraft = { ...parsed as SavedRegistrationDraft, password: '' };
  return registrationDraft;
}

export async function clearRegistrationDraft() {
  registrationDraft = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
