import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { AuthProvider, useAuth } from '~/context/AuthContext';
import { BrandingProvider } from '~/context/BrandingContext';

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (loading) return;

    // 🚀 FORCE REDIRECT TO /application/user ALWAYS
    const targetRoute = '/application/user';
    if (segments[0] !== 'application' || segments[1] !== 'user') {
      router.replace(targetRoute);
      return; // Stop further auth logic
    }

    // --- AUTH LOGIC BELOW (optional/future use) ---
    if (user) {
      // Authenticated user logic
      const isOnPublicOnlyPage =
        ['signin', 'signin_cp'].includes(segments[0]) || segments.length === 0;

      if (isOnPublicOnlyPage) {
        if (user.profile?.role === 'collaborator') {
          router.replace('/collab/dashboard');
        } else {
          router.replace('/home');
        }
      }
    } else {
      // Guest user logic
      const publicRoutes = [
        'home',
        'news',
        'about',
        'signin',
        'forgot-password',
        'signup',
        'signin_cp',
      ];

      const isProtectedRoute = segments.length > 0 && !publicRoutes.includes(segments[0]);
      if (isProtectedRoute) {
        router.replace('/');
      }
    }
  }, [user, loading, segments, router]);

  return <Slot />;
};

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
