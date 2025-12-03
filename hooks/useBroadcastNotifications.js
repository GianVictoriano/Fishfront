import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const useBroadcastNotifications = () => {
  const [pendingBroadcasts, setPendingBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [checkedToday, setCheckedToday] = useState(false);
  const { user } = useAuth();

  const checkPendingBroadcasts = useCallback(async () => {
    // Check if we already checked today (to avoid spamming on every app visit)
    const today = new Date().toDateString();
    const lastCheck = localStorage.getItem('lastBroadcastCheck');
    
    if (lastCheck === today && checkedToday) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get('/my-broadcasts?per_page=50');
      const broadcasts = response.data.data || [];
      
      // Filter for pending broadcasts only
      const pending = broadcasts.filter(broadcast => 
        broadcast.recipients?.some(recipient => 
          recipient.user_id === user?.id && 
          recipient.response_status === 'pending'
        )
      );

      setPendingBroadcasts(pending);
      
      // Show notifications if there are pending broadcasts
      if (pending.length > 0) {
        setShowNotifications(true);
      }

      // Mark as checked for today
      localStorage.setItem('lastBroadcastCheck', today);
      setCheckedToday(true);

    } catch (error) {
      console.error('Failed to check broadcast notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkedToday]);

  const dismissNotification = useCallback((broadcastId = null) => {
    if (broadcastId) {
      // Remove specific broadcast from list
      setPendingBroadcasts(prev => prev.filter(b => b.id !== broadcastId));
    } else {
      // Dismiss all notifications
      setShowNotifications(false);
    }

    // If no more pending broadcasts, hide the modal
    if (broadcastId && pendingBroadcasts.length <= 1) {
      setShowNotifications(false);
    }
  }, [pendingBroadcasts.length]);

  const refreshNotifications = useCallback(() => {
    setCheckedToday(false); // Force re-check
    checkPendingBroadcasts();
  }, [checkPendingBroadcasts]);

  // Check for broadcasts on component mount and when user changes
  useEffect(() => {
    if (user?.id) {
      checkPendingBroadcasts();
    }
  }, [checkPendingBroadcasts, user?.id]);

  return {
    pendingBroadcasts,
    loading,
    showNotifications,
    checkPendingBroadcasts,
    dismissNotification,
    refreshNotifications,
  };
};
