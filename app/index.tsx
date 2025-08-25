import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Simple authentication check (in real app, use AsyncStorage or secure storage)
const checkAuthStatus = async (): Promise<boolean> => {
  // Simulate checking for stored auth token
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo purposes, always return false to show auth flow
  // In real app: return !!await AsyncStorage.getItem('authToken');
  return false;
};

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const isAuthenticated = await checkAuthStatus();
        
        if (isAuthenticated) {
          // User is authenticated, go to main app
          router.replace('/(tabs)/');
        } else {
          // User needs to authenticate, go to login
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // On error, redirect to login
        router.replace('/auth/login');
      }
    };

    initializeApp();
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading White Heart Driver...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
});