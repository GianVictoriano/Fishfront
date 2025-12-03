import { useCallback, useRef, useEffect, useState } from 'react';
import apiClient from '../utils/api';

const useInteractionTracking = (userId) => {
  const [sessionId, setSessionId] = useState(null);
  const interactionQueue = useRef([]);
  const flushTimeoutRef = useRef(null);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(Date.now().toString());
  }, []);

  // Flush interactions to server
  const flushInteractions = useCallback(async () => {
    if (interactionQueue.current.length === 0 || !userId || !sessionId) {
      console.log('⏭️ Skipping flush:', { queueLength: interactionQueue.current.length, userId, sessionId });
      return;
    }

    const interactions = [...interactionQueue.current];
    interactionQueue.current = [];

    console.log('📤 Flushing interactions:', interactions);

    try {
      // Send interactions in batch
      const results = await Promise.all(
        interactions.map(interaction => {
          console.log(`🚀 Sending interaction:`, {
            url: `/articles/${interaction.articleId}/interaction`,
            data: { ...interaction.data, session_id: sessionId }
          });
          return apiClient.post(`/articles/${interaction.articleId}/interaction`, {
            ...interaction.data,
            session_id: sessionId,
          });
        })
      );
      console.log('✅ Interactions recorded successfully:', results);
    } catch (error) {
      console.error('❌ Failed to record interactions:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Re-queue failed interactions
      interactionQueue.current.unshift(...interactions);
    }
  }, [userId, sessionId]);

  // Queue interaction for batch processing
  const queueInteraction = useCallback((articleId, interactionType, additionalData = {}) => {
    if (!userId) {
      console.log('⚠️ Cannot queue interaction - no userId');
      return;
    }

    console.log('➕ Queuing interaction:', { articleId, interactionType, additionalData, userId });

    interactionQueue.current.push({
      articleId,
      data: {
        interaction_type: interactionType,
        ...additionalData,
      },
    });

    // Clear existing timeout and set new one
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    // Flush after 2 seconds of inactivity or immediately if queue is full
    if (interactionQueue.current.length >= 5) {
      flushInteractions();
    } else {
      flushTimeoutRef.current = setTimeout(flushInteractions, 2000);
    }
  }, [userId, flushInteractions]);

  // Record different types of interactions
  const recordView = useCallback((articleId) => {
    queueInteraction(articleId, 'view');
  }, [queueInteraction]);

  const recordReaction = useCallback((articleId, reactionType) => {
    queueInteraction(articleId, reactionType);
  }, [queueInteraction]);

  const recordTimeSpent = useCallback((articleId, timeSpent) => {
    queueInteraction(articleId, 'time_spent', { time_spent: timeSpent });
  }, [queueInteraction]);

  const recordScroll = useCallback((articleId, scrollPercentage) => {
    queueInteraction(articleId, 'scroll', { scroll_percentage: scrollPercentage });
  }, [queueInteraction]);

  // Flush on component unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flushInteractions();
    };
  }, [flushInteractions]);

  return {
    recordView,
    recordReaction,
    recordTimeSpent,
    recordScroll,
    flushInteractions,
  };
};

export default useInteractionTracking;
