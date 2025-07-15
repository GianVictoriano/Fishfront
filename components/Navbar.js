import React from 'react';
import { usePathname } from 'expo-router';
import { View, Platform, StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';

/**
 * Primary navigation bar used across the Fisherman Publications app.
 * Includes links to Home, Forum, News, About Us, and Profile.
 * Pass an `onLinkPress` callback to close a mobile drawer after navigation.
 */
const Navbar = ({ onLinkPress = () => {} }) => {
  const pathname = usePathname();
  const linkStyle = (path) => [styles.navLink, pathname.startsWith(path) && styles.navLinkActive];

  return (
  <View style={styles.nav}>
    <Link href="/home" style={linkStyle('/home')} asChild onPress={onLinkPress}>
      <Text>Home</Text>
    </Link>
    <Link href="/forum" style={linkStyle('/forum')} asChild onPress={onLinkPress}>
      <Text>Forum</Text>
    </Link>
    <Link href="/news" style={linkStyle('/news')} asChild onPress={onLinkPress}>
      <Text>News</Text>
    </Link>
    <Link href="/about" style={linkStyle('/about')} asChild onPress={onLinkPress}>
      <Text>About Us</Text>
    </Link>
    <Link href="/profile" style={linkStyle('/profile')} asChild onPress={onLinkPress}>
      <Text>Profile</Text>
    </Link>
  </View>
  );
};
const styles = StyleSheet.create({
  nav: {
    ...Platform.select({
      web: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
      },
      default: {
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingTop: 30,
        backgroundColor: '#fff',
      },
    }),
  },
  navLink: {
    fontWeight: 'bold',
    color: '#007BFF',
    ...Platform.select({
      web: {
        fontSize: 16,
      },
      default: {
        fontSize: 20,
        paddingVertical: 15,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
    }),
  },
  navLinkActive: {
    color: '#0d47a1', // dark blue
  }
});

export default Navbar;
