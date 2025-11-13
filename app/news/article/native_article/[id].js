import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

// This file is just a redirect to the native version
export default function NativeArticleRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  useEffect(() => {
    // Redirect to the .native.js version
    router.replace(`/news/article/native_article/${id}.native`);
  }, [id]);
  
  return null;
}
