import { Redirect } from 'expo-router';

// This component redirects the user from the base /collab route
// to the default tab, which is /collab/dashboard.
export default function TabsIndex() {
  return <Redirect href="/collab/dashboard" />;
}
