import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useBranding } from '~/context/BrandingContext';


export default function BrandingScreen() {
  const { logoUrl, loading } = useBranding();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Branding</Text>
      {loading ? (
        <View style={styles.logoPlaceholder} />
      ) : (
        <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
      )}
      <Text style={styles.description}>
        Welcome to the Branding page. Here you can manage your organization's logo and branding assets.
      </Text>
      {/* Add more branding-related UI here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7F8FA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#111827',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: '#E0E0E0',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
});