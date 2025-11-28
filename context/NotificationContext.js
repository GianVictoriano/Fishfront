import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, hasModule } = useAuth();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingApplicantsCount, setPendingApplicantsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Fetch pending review count
  useEffect(() => {
    const fetchPendingReviewCount = async () => {
      if (!user) return;

      try {
        const params = new URLSearchParams({
          status: 'pending',
        });
        params.append('current_reviewer_id', user.id);

        const [draftsRes, imagesRes] = await Promise.all([
          apiClient.get(`/review-content?${params.toString()}`),
          apiClient.get(`/review-images?${params.toString()}`),
        ]);

        // Get actual count of pending items, not last_page
        const draftsData = draftsRes.data.data || draftsRes.data || [];
        const imagesData = imagesRes.data.data || imagesRes.data || [];
        
        const draftsCount = Array.isArray(draftsData) ? draftsData.length : 0;
        const imagesCount = Array.isArray(imagesData) ? imagesData.length : 0;
        
        const totalPending = draftsCount + imagesCount;
        console.log('Pending review count:', { draftsCount, imagesCount, totalPending });
        setPendingReviewCount(totalPending);
      } catch (error) {
        console.error('Failed to fetch pending review count:', error);
        setPendingReviewCount(0);
      }
    };

    if (hasModule('review-content')) {
      fetchPendingReviewCount();
    }
  }, [user, hasModule]);

  // Fetch pending applicants count
  useEffect(() => {
    const fetchPendingApplicantsCount = async () => {
      if (!user) return;

      try {
        const response = await apiClient.get('/api/applications?status=pending&limit=1');
        // Count the pending applicants from the data
        const applicants = response.data.data || response.data;
        const pendingCount = Array.isArray(applicants) ? applicants.filter(a => a.status === 'pending').length : 0;
        setPendingApplicantsCount(pendingCount);
      } catch (error) {
        console.error('Failed to fetch pending applicants count:', error);
        setPendingApplicantsCount(0);
      }
    };

    if (hasModule('applicants')) {
      fetchPendingApplicantsCount();
    }
  }, [user, hasModule]);

  // Fetch pending requests count (both coverage and documentation)
  useEffect(() => {
    const fetchPendingRequestsCount = async () => {
      if (!user) return;

      try {
        const response = await apiClient.get('/api/contributions');
        const list = response.data.data || response.data;
        const validList = Array.isArray(list) ? list.filter(item => item != null) : [];

        // Count pending items from both coverage and documentation categories
        const pendingCoverage = validList.filter(item =>
          item.category === 'coverage' && item.status === 'pending'
        ).length;
        const pendingDocumentation = validList.filter(item =>
          item.category === 'documentation' && item.status === 'pending'
        ).length;

        const totalPending = pendingCoverage + pendingDocumentation;
        setPendingRequestsCount(totalPending);
      } catch (error) {
        console.error('Failed to fetch pending requests count:', error);
        setPendingRequestsCount(0);
      }
    };

    if (hasModule('requests')) {
      fetchPendingRequestsCount();
    }
  }, [user, hasModule]);

  const value = {
    pendingReviewCount,
    pendingApplicantsCount,
    pendingRequestsCount,
    setPendingReviewCount,
    setPendingApplicantsCount,
    setPendingRequestsCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
