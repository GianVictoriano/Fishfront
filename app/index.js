// app/index.js
import { Redirect } from 'expo-router';

export default function Index() {
  // Always redirect to home page
  return <Redirect href="/home" />;
}