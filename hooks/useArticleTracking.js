import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import useInteractionTracking from './useInteractionTracking';

/**
 * Hook to track reading time and scroll percentage on article pages
 * Automatically records interactions for ML recommendation system
 */
const useArticleTracking = (articleId, userId) => {
  const startTimeRef = useRef(null);
  const scrollPercentageRef = useRef(0);
  const lastRecordedScrollRef = useRef(0);
  const hasRecordedViewRef = useRef(false);
  
  const { recordView, recordTimeSpent, recordScroll } = useInteractionTracking(userId);

  // Record initial view
  useEffect(() => {
    if (articleId && userId && !hasRecordedViewRef.current) {
      recordView(articleId);
      hasRecordedViewRef.current = true;
    }
  }, [articleId, userId, recordView]);

  // Track reading time
  useEffect(() => {
    if (!articleId || !userId) return;

    // Start timer when component mounts
    startTimeRef.current = Date.now();

    // Record time spent when component unmounts or user leaves
    return () => {
      if (startTimeRef.current) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        // Only record if user spent at least 3 seconds (to filter out accidental clicks)
        if (timeSpent >= 3) {
          recordTimeSpent(articleId, timeSpent);
        }
      }
    };
  }, [articleId, userId, recordTimeSpent]);

  // Track scroll percentage
  const handleScroll = useCallback((event) => {
    if (!articleId || !userId) return;

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    // Calculate scroll percentage
    const scrollPosition = contentOffset.y;
    const scrollHeight = contentSize.height - layoutMeasurement.height;
    const percentage = scrollHeight > 0 
      ? Math.min(100, Math.max(0, (scrollPosition / scrollHeight) * 100))
      : 0;

    scrollPercentageRef.current = Math.max(scrollPercentageRef.current, percentage);

    // Record scroll milestones (25%, 50%, 75%, 100%)
    const currentMilestone = Math.floor(scrollPercentageRef.current / 25) * 25;
    const lastMilestone = Math.floor(lastRecordedScrollRef.current / 25) * 25;

    if (currentMilestone > lastMilestone && currentMilestone > 0) {
      recordScroll(articleId, scrollPercentageRef.current);
      lastRecordedScrollRef.current = scrollPercentageRef.current;
    }
  }, [articleId, userId, recordScroll]);

  // For web-based scroll tracking
  const handleWebScroll = useCallback(() => {
    if (!articleId || !userId) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollHeight > 0 
      ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100))
      : 0;

    scrollPercentageRef.current = Math.max(scrollPercentageRef.current, percentage);

    // Record scroll milestones
    const currentMilestone = Math.floor(scrollPercentageRef.current / 25) * 25;
    const lastMilestone = Math.floor(lastRecordedScrollRef.current / 25) * 25;

    if (currentMilestone > lastMilestone && currentMilestone > 0) {
      recordScroll(articleId, scrollPercentageRef.current);
      lastRecordedScrollRef.current = scrollPercentageRef.current;
    }
  }, [articleId, userId, recordScroll]);

  // Set up web scroll listener
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && articleId && userId) {
      // Throttle scroll events
      let scrollTimeout;
      const throttledScroll = () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
          handleWebScroll();
          scrollTimeout = null;
        }, 200); // Check every 200ms
      };

      window.addEventListener('scroll', throttledScroll);
      return () => {
        window.removeEventListener('scroll', throttledScroll);
        if (scrollTimeout) clearTimeout(scrollTimeout);
      };
    }
  }, [articleId, userId, handleWebScroll]);

  return {
    handleScroll, // For React Native ScrollView
    currentScrollPercentage: scrollPercentageRef.current,
    timeSpent: startTimeRef.current 
      ? Math.floor((Date.now() - startTimeRef.current) / 1000) 
      : 0,
  };
};

export default useArticleTracking;
