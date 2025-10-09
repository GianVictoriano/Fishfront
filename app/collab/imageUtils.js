import React from 'react';
import { View } from 'react-native';
import { pickImage as _pickImage } from '../../utils/imageUtils';

// Keep named export for compatibility, but also export a default component so
// Expo Router doesn't treat this file as a missing-page (default export).
export const pickImage = _pickImage;

export default function ImageUtilsPlaceholder() {
  return <View />;
}
