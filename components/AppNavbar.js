import React from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';


/**
 * AppNavbar – automatically decides which navbar to render based on the
 * authentication state provided by `AuthContext`.
 *
 * Usage:
 *   import AppNavbar from '../components/AppNavbar';
 *   ...
 *   <AppNavbar />
 *
 * All props are forwarded to the concrete Navbar component so you can still
 * pass `isWeb`, `onLinkPress`, etc.
 */
export default function AppNavbar(props) {
  const { user, loading } = useAuth();

  // While auth state is loading, render nothing to avoid flicker.
  if (loading) {
    return null;
  }

  if (user) {
    return <Navbar {...props} />;
  }
}
