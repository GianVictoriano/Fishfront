import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '~/context/AuthContext';
import { BrandingProvider } from '~/context/BrandingContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If the user is authenticated
    if (user) {
      const isOnPublicOnlyPage = ['signin', 'signin_cp'].includes(segments[0]) || segments.length === 0;
      if (isOnPublicOnlyPage) {
        if (user.profile?.role === 'collaborator') {
          router.replace('/collab/dashboard');
        } else {
          router.replace('/home');
        }
      }
    } 
    // If the user is not authenticated (is a guest)
    else {
      // Define public routes that guests can access. The root '/' is handled by `segments.length === 0`.
      const publicRoutes = ['home', 'news', 'about', 'signin', 'forgot-password', 'home2', 'news2', 'about2', 'signup', 'signin_cp'];
      // A route is protected if it's not the root and not in the public list.
      const isProtectedRoute = segments.length > 0 && !publicRoutes.includes(segments[0]);
      if (isProtectedRoute) {
        // Redirect guests from protected routes to the root page
        router.replace('/');
      }
    }
  }, [user, loading, segments, router]);

  return <Slot />;
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