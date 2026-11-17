import { Platform } from 'react-native';

const defaultUrl = Platform.select({ android: 'http://10.0.2.2:3001/api', default: 'http://localhost:3001/api' });

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultUrl;
