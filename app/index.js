import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/api';

export default function Index() {
  // Always redirect to home page
  return <Redirect href="/home" />;
}