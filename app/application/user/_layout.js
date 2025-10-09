import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '~/context/AuthContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-gesture-handler';
import 'react-native-reanimated';


import SearchScreen from './search';
import ReadScreen from './read';
import ProfileScreen from './profile';
import { ArticleProvider } from '../../../context/ArticleContext';

const Tab = createBottomTabNavigator();

export default function UserLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signin');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <ArticleProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Search') iconName = 'search-outline';
            else if (route.name === 'Read') iconName = 'book-outline';
            else if (route.name === 'Profile') iconName = 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Read" component={ReadScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </ArticleProvider>
  );
}
