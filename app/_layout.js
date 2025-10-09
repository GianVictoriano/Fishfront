import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '~/context/AuthContext';
import { BrandingProvider } from '~/context/BrandingContext';
import { useRef, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || redirected.current) return;

    if (user) {
      const isOnPublicOnlyPage = ['signin', 'signin_cp'].includes(segments[0]) || segments.length === 0;
      if (isOnPublicOnlyPage) {
        redirected.current = true;
        router.replace(user.profile?.role === 'collaborator' ? '/collab/dashboard' : '/user/home');
      }
    } else {
      const publicRoutes = ['user/home', 'user/news', 'user/about', 'signin', 'forgot-password', 'signup', 'signin_cp'];
      const isProtectedRoute = segments.length > 0 && !publicRoutes.includes(segments.join('/'));
      if (isProtectedRoute) {
        redirected.current = true;
        router.replace('/');
      }
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="user/home" />
      <Stack.Screen name="user/news" />
      <Stack.Screen name="user/about" />
      <Stack.Screen name="user/forum" />
      <Stack.Screen name="contribute" />
      <Stack.Screen name="collab/dashboard" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="signin_cp" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <BrandingProvider>
        <AuthProvider>
          <InitialLayout />
        </AuthProvider>
      </BrandingProvider>
    </ActionSheetProvider>
  );
}