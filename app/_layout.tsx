import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Check if user is authenticated (simplified for demo)
const isAuthenticated = () => {
  // In real app, check AsyncStorage or secure storage for auth token
  // For demo purposes, we'll assume user needs to authenticate
  return false;
};

export default function RootLayout() {
  useFrameworkReady();

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Authentication Routes */}
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        
        {/* Main App Routes */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </LanguageProvider>
  );
}