import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function ForumScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Forum Page</Text>
      <Link href="/home" style={{ color: 'blue' }}>Go to Home</Link>
    </View>
  );
}
