import { AuthProvider, useAuth } from '~/context/AuthContext';
import { BrandingProvider } from '~/context/BrandingContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // If the user is authenticated
    if (user) {
      const isOnPublicOnlyPage = segments[0] === 'signin' || segments.length === 0;
      if (isOnPublicOnlyPage) {
        if (user.profile?.role === 'collaborator') {
          router.replace('/collab/home');
        } else {
          router.replace('/home');
        }
      }
    } 
    // If the user is not authenticated (is a guest)
    else {
      // Define public routes that guests can access. The root '/' is handled by `segments.length === 0`.
      const publicRoutes = ['home', 'news', 'about', 'signin', 'forgot-password', 'home2', 'news2', 'about2'];
      
      // A route is protected if it's not the root and not in the public list.
      const isProtectedRoute = segments.length > 0 && !publicRoutes.includes(segments[0]);

<<<<<<< HEAD
    if (!user && inApp) {
      router.replace('/');
    } else if (user && !inApp) {
      if (user.profile?.role === 'collaborator') {
        router.replace('/collab/home');
      } else {
        router.replace('/home');
=======
      if (isProtectedRoute) {
        // Redirect guests from protected routes to the root page
        router.replace('/');
>>>>>>> bb4654215de1a83cc4cf017ef605ccce2de60190
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
          <RootLayoutNav />
        </AuthProvider>
      </BrandingProvider>
    </ActionSheetProvider>
  );
}
