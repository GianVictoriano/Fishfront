import React from 'react';
import { View } from 'react-native';

// ArticleContext was moved to /context/ArticleContext.js to avoid being treated as a route.
// This file remains to prevent route-breaking errors during transitional builds. It
// exports a minimal default component so the router finds a valid page export.

export default function ArticleContextPlaceholder() {
  return <View />;
}
