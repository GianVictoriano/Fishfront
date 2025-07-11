import { Redirect } from 'expo-router';

// This file now simply redirects to the default dashboard screen
// within the collaborator layout.
export default function CollaboratorHome() {
  return <Redirect href="/collab/dashboard" />;
}