import { AuthProvider, useAuth } from '~/context/AuthContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inApp = segments.length > 0 && segments[0] !== '(auth)';

    if (!user && inApp) {
      // Redirect to login if not authenticated and trying to access the app.
      router.replace('/');
    } else if (user && !inApp) {
      // Redirect to home/dashboard if authenticated and on the login page.
      if (user.profile?.role === 'collaborator') {
        router.replace('/collab/home');
      } else {
        router.replace('/home');
      }
    }
  }, [user, loading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ActionSheetProvider>
  );
}
