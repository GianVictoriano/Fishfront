import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, FlatList, TextInput, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';

// PDF Generation
const generatePDFReport = async (activities, filter, activityGenres = {}) => {
  // For web platform, use printable HTML
  if (Platform.OS === 'web') {
    try {
      // Skip html2pdf and go directly to printable HTML

      // Create HTML content for the PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #303F9F; border-bottom: 2px solid #303F9F; padding-bottom: 10px; }
            h2 { margin-top: 40px; }
            .header { margin-bottom: 30px; }
            .activity { margin-bottom: 10px; padding: 8px; border-left: 3px solid #303F9F; background: #f9f9f9; }
            .timestamp { color: #666; font-size: 12px; }
            .user { font-weight: bold; color: #303F9F; }
            .description { margin-left: 10px; }
            @page { margin: 1in 1in 1.5in 1in; }
            @page :first { margin-top: 0.5in; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Activity Report</h1>
            <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Filter:</strong> ${filter.charAt(0).toUpperCase() + filter.slice(1)}</p>
          </div>

          <div class="activities">
      `;

  // Collaborator tasks
  const taskActivities = activities.filter(activity => {
    return activity.id.startsWith('task_') || activity.description?.includes('task');
  });

  let taskHtml = '';
  if (taskActivities.length === 0) {
    taskHtml = '<p>No collaborator tasks found.</p>';
  } else {
    taskActivities.slice(0, 50).forEach((activity) => {
      let borderColor = '#607D8B'; // default gray
      if (activity.type === 'pending') borderColor = '#F44336'; // red
      else if (activity.type === 'review') borderColor = '#FF9800'; // yellow
      else if (activity.type === 'approved') borderColor = '#4CAF50'; // green
      taskHtml += `
        <div class="activity" style="border-left-color: ${borderColor};">
          <div class="timestamp">${activity.timestamp}</div>
          <div><span class="user">${activity.user_name}</span><span class="description">${activity.description}</span></div>
        </div>
      `;
    });
  }

  // Published content genre summary
  const publishedActivities = activities.filter(activity => {
    const type = activity.type;
    return type === 'approved' || activity.description?.includes('published') || activity.description?.includes('article');
  });

  let publishedHtml = '';
  if (publishedActivities.length === 0) {
    publishedHtml = '<p>No published content found.</p>';
  } else {
    publishedActivities.slice(0, 50).forEach((activity) => {
      publishedHtml += `
        <div class="activity">
          <div class="timestamp">${activity.timestamp}</div>
          <div><span class="user">${activity.user_name}</span><span class="description">${activity.description}</span></div>
        </div>
      `;
    });
  }

  // Create genre summary from existing activityGenres data
  const genreSummary = {};
  publishedActivities.forEach(activity => {
    const genre = activityGenres[activity.id] || 'General';
    genreSummary[genre] = (genreSummary[genre] || 0) + 1;
  });

  let summaryHtml = '<h3>Published Content Summary by Genre</h3><ul>';
  Object.entries(genreSummary).forEach(([genre, count]) => {
    summaryHtml += `<li>${genre}: ${count} items</li>`;
  });
  summaryHtml += '</ul>';

  const activitiesHtml = `
        <h2>Collaborator Tasks</h2>
        ${taskHtml}

        <h2>Published Content</h2>
        ${summaryHtml}
        ${publishedHtml}
      </div>
  `;

      const fullHtml = htmlContent + activitiesHtml + '</body></html>';

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        printWindow.focus();

        // Wait a moment for content to load, then show print dialog
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      alert('Opening printable report. Use your browser\'s print dialog (Ctrl+P) to save as PDF.');
      return false;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report. Please try again.');
    }
  } else {
    // For mobile platforms, show instructions
    alert('PDF generation is only available on web. Please use this feature on a web browser.');
    return false;
  }
};

const ActivityItem = ({ activity, isMobile, onDetailsPress, genre }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'login': return 'log-in';
      case 'logout': return 'log-out';
      case 'create': return 'plus';
      case 'update': return 'edit';
      case 'delete': return 'trash-2';
      case 'view': return 'eye';
      case 'comment': return 'message-square';
      default: return 'activity';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'login': return '#4CAF50';
      case 'logout': return '#FF9800';
      case 'create': return '#2196F3';
      case 'update': return '#FF9800';
      case 'delete': return '#F44336';
      case 'view': return '#9C27B0';
      case 'comment': return '#FF5722';
      case 'pending': return '#F44336'; // red
      case 'review': return '#FF9800'; // yellow
      case 'approved': return '#4CAF50'; // green
      default: return '#607D8B';
    }
  };

  return (
    <View style={[styles.activityItem, isMobile && styles.activityItemMobile]}>
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.type) }]}>
        <Feather name={getActivityIcon(activity.type)} size={isMobile ? 14 : 16} color="#fff" />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityText, isMobile && styles.activityTextMobile]}>
          <Text style={styles.activityUser}>{activity.user_name}</Text> {activity.description}
        </Text>
        {genre && (
          <Text style={[styles.activityGenre, isMobile && styles.activityGenreMobile]}>
            Genre: {genre}
          </Text>
        )}
        <Text style={[styles.activityTime, isMobile && styles.activityTimeMobile]}>
          {activity.timestamp}
        </Text>
      </View>
      {activity.details && (
        <TouchableOpacity style={styles.detailsButton} onPress={() => onDetailsPress(activity)}>
          <Feather name="chevron-right" size={isMobile ? 16 : 18} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const ActivityFilter = ({ filter, setFilter, isMobile }) => {
  const filters = [
    { key: 'all', label: 'All Activities', icon: 'activity' },
    { key: 'user', label: 'User Actions', icon: 'user' },
    { key: 'publishing', label: 'Publishing', icon: 'file-text' },
    { key: 'submission', label: 'Content Submission', icon: 'upload' },
    { key: 'collaborator', label: 'Collaborator Tasks', icon: 'clipboard' },
    { key: 'system', label: 'System Events', icon: 'settings' },
  ];

  return (
    <View style={[styles.filterContainer, isMobile && styles.filterContainerMobile]}>
      <ScrollView
        horizontal={isMobile}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={isMobile ? styles.filterScrollMobile : styles.filterScroll}
      >
        {filters.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive,
              isMobile && styles.filterButtonMobile
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Feather
              name={item.icon}
              size={isMobile ? 14 : 16}
              color={filter === item.key ? '#fff' : '#666'}
            />
            <Text style={[
              styles.filterText,
              filter === item.key && styles.filterTextActive,
              isMobile && styles.filterTextMobile
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default function ActivityMonitorScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityGenres, setActivityGenres] = useState({});
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activityDetails, setActivityDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [pdfSuccessModalVisible, setPdfSuccessModalVisible] = useState(false);

  const fetchGenresForActivities = async (activities) => {
    const articleActivities = activities.filter(activity => activity.id.startsWith('article_'));
    const genrePromises = articleActivities.map(async (activity) => {
      if (!activityGenres[activity.id]) {
        try {
          const response = await apiClient.get(`/public/activity-details?id=${activity.id}`);
          if (response.data.success) {
            return { id: activity.id, genre: response.data.data.genre || 'General' };
          }
        } catch (error) {
          console.error('Error fetching genre:', error);
        }
      }
      return null;
    });

    const results = await Promise.all(genrePromises);
    const newGenres = { ...activityGenres };
    results.forEach(result => {
      if (result) {
        newGenres[result.id] = result.genre;
      }
    });
    setActivityGenres(newGenres);
  };

  const onDetailsPress = async (activity) => {
    setSelectedActivity(activity);
    setModalVisible(true);
    setLoadingDetails(true);
    try {
      const response = await apiClient.get(`/public/activity-details?id=${activity.id}`);
      if (response.data.success) {
        setActivityDetails(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching activity details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const renderDetails = (activity, details) => {
    if (activity.id.startsWith('task_')) {
      return (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="clipboard" size={24} color="#303F9F" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>{activity.user_name}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="users" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Members:</Text>
            </View>
            <Text style={styles.detailValue}>
              {details.members.length > 0 ? details.members.join(', ') : 'No members'}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="layers" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Versions Submitted:</Text>
            </View>
            <Text style={styles.detailValue}>{details.versions}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="check-circle" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Status:</Text>
            </View>
            <Text style={[styles.detailValue, styles.statusBadge, getStatusStyle(details.status)]}>
              {details.status.charAt(0).toUpperCase() + details.status.slice(1)}
            </Text>
          </View>
        </View>
      );
    } else if (activity.id.startsWith('article_')) {
      const articleId = activity.id.substring(8);
      return (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="file-text" size={24} color="#303F9F" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>View Article</Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.articleTitle}>{details.title}</Text>
            <Text style={styles.articleGenre}>{details.genre}</Text>
          </View>
          
          <Text style={styles.confirmationText}>Do you want to view this article?</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]} 
              onPress={() => {
                setModalVisible(false);
                // Navigate to article
                router.push(`/news/article/${articleId}`);
              }}
            >
              <Text style={styles.viewButtonText}>View Article</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (activity.id.startsWith('review_')) {
      return (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="upload" size={24} color="#303F9F" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>{activity.user_name}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="user" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Submitted By:</Text>
            </View>
            <Text style={styles.detailValue}>{details.user}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="check-circle" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Status:</Text>
            </View>
            <Text style={[styles.detailValue, styles.statusBadge, getStatusStyle(details.status)]}>
              {details.status.charAt(0).toUpperCase() + details.status.slice(1)}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Submitted At:</Text>
            </View>
            <Text style={styles.detailValue}>{details.submitted_at}</Text>
          </View>
        </View>
      );
    } else if (activity.id.startsWith('topic_')) {
      return (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="message-square" size={24} color="#303F9F" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>{activity.user_name}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="user" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Created By:</Text>
            </View>
            <Text style={styles.detailValue}>{details.user}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Created At:</Text>
            </View>
            <Text style={styles.detailValue}>{details.created_at}</Text>
          </View>
        </View>
      );
    } else if (activity.id.startsWith('branding_')) {
      return (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="settings" size={24} color="#303F9F" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Branding Update</Text>
          </View>
          
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="user" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Updated By:</Text>
            </View>
            <Text style={styles.detailValue}>{activity.user_name}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="activity" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Action:</Text>
            </View>
            <Text style={styles.detailValue}>{details.action === 'updated' ? 'Updated Settings' : 'Reset to Default'}</Text>
          </View>

          {details.changes && Object.keys(details.changes).length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Feather name="list" size={16} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Changes:</Text>
              </View>
              <Text style={styles.detailValue}>
                {Object.keys(details.changes).map((key) => {
                  if (key === 'logo_path') return 'Logo was updated';
                  if (key === 'background_path') return 'Background was updated';
                  if (key === 'colors') {
                    return Object.entries(details.changes[key]).map(([subKey, change]) => 
                      `Color ${subKey}: ${change.old || 'none'} → ${change.new || 'none'}`
                    ).join('\n');
                  }
                  if (key === 'typography') {
                    return Object.entries(details.changes[key]).map(([subKey, change]) => 
                      `Font ${subKey}: ${change.old || 'none'} → ${change.new || 'none'}`
                    ).join('\n');
                  }
                  if (key === 'pages') {
                    return Object.entries(details.changes[key]).map(([page, pageChanges]) => 
                      Object.entries(pageChanges).map(([setting, change]) => 
                        `Page ${page} ${setting}: ${change.old || 'none'} → ${change.new || 'none'}`
                      ).join('\n')
                    ).join('\n');
                  }
                  return `${key}: ${details.changes[key].old || 'none'} → ${details.changes[key].new || 'none'}`;
                }).join('\n')}
              </Text>
            </View>
          )}
        </View>
      );
    } else if (activity.id.startsWith('module_')) {
      return (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="shield" size={24} color="#303F9F" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Module Change</Text>
          </View>
          
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="user" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>User:</Text>
            </View>
            <Text style={styles.detailValue}>{details.user}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="settings" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Module:</Text>
            </View>
            <Text style={styles.detailValue}>{details.module_name}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Feather name="activity" size={16} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Action:</Text>
            </View>
            <Text style={styles.detailValue}>{details.action}</Text>
          </View>
        </View>
      );
    }
    return <Text style={styles.loadingText}>No details available</Text>;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { backgroundColor: '#4CAF50', color: '#fff' };
      case 'review': return { backgroundColor: '#FF9800', color: '#fff' };
      case 'pending': return { backgroundColor: '#F44336', color: '#fff' };
      default: return { backgroundColor: '#607D8B', color: '#fff' };
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [filter, search]);

  const fetchActivities = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        limit: '50',
        filter: filter,
        search: search,
      });

      const response = await apiClient.get(`/public/activity-data?${params}`);
      const data = response.data;

      if (data.success) {
        const newActivities = data.data || [];
        setActivities(newActivities);
        // Fetch genres for article activities
        fetchGenresForActivities(newActivities);
      } else {
        console.error('API Error:', data.message);
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchActivities(true);
  };

  const handleGenerateReport = async () => {
    setGeneratingPDF(true);
    try {
      // Fetch all activities for the report
      const params = new URLSearchParams({
        limit: '100', // Get more activities for the report
        filter: 'all',
        search: '',
      });

      const response = await apiClient.get(`/public/activity-data?${params}`);
      const data = response.data;

      if (data.success) {
        const allActivities = data.data || [];
        await generatePDFReport(allActivities, 'All Activities', activityGenres);
        setPdfSuccessModalVisible(true);
      } else {
        console.error('API Error:', data.message);
        alert('Failed to fetch activities for report. Please try again.');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert(error.message || 'Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>
            Activity Monitor
          </Text>
          <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
            Track user activities and system events in real-time
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.generateReportButton, isMobile && styles.generateReportButtonMobile]}
          onPress={handleGenerateReport}
          disabled={generatingPDF || activities.length === 0}
        >
          <Feather
            name="file-text"
            size={isMobile ? 16 : 20}
            color={generatingPDF || activities.length === 0 ? "#ccc" : "#303F9F"}
          />
          <Text style={[styles.generateReportText, isMobile && styles.generateReportTextMobile]}>
            {generatingPDF ? 'Generating...' : 'Generate Report'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={[styles.controlsContainer, isMobile && styles.controlsContainerMobile]}>
        <View style={[styles.searchContainer, isMobile && styles.searchContainerMobile]}>
          <Feather name="search" size={isMobile ? 16 : 18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isMobile && styles.searchInputMobile]}
            placeholder="Search activities..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ActivityFilter filter={filter} setFilter={setFilter} isMobile={isMobile} />
      </View>

      {/* Activity Feed */}
      <View style={[styles.feedContainer, isMobile && styles.feedContainerMobile]}>
        <View style={styles.feedHeader}>
          <Text style={[styles.feedTitle, isMobile && styles.feedTitleMobile]}>
            Recent Activities ({activities.length})
          </Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Feather name="activity" size={32} color="#ccc" />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : activities.length > 0 ? (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ActivityItem 
                activity={item} 
                isMobile={isMobile} 
                onDetailsPress={onDetailsPress}
                genre={activityGenres[item.id] || null}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.activityList}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="activity" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No activities found</Text>
            <Text style={styles.emptySubtext}>
              {search || filter !== 'all' ? 'Try adjusting your filters' : 'Activities will appear here when users interact with the system'}
            </Text>
          </View>
        )}
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
            {loadingDetails ? (
              <View style={styles.loadingContainer}>
                <Feather name="activity" size={32} color="#ccc" />
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            ) : selectedActivity && activityDetails ? (
              renderDetails(selectedActivity, activityDetails)
            ) : (
              <Text style={styles.loadingText}>No details available</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={pdfSuccessModalVisible} animationType="fade" transparent onRequestClose={() => setPdfSuccessModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setPdfSuccessModalVisible(false)}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <Feather name="check-circle" size={24} color="#4CAF50" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>PDF Report Generated</Text>
            </View>
            <Text style={styles.confirmationText}>
              Your activity report has been generated successfully. The printable report has been opened in a new window.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => setPdfSuccessModalVisible(false)}
              >
                <Text style={styles.viewButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerMobile: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  titleMobile: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 4,
  },
  subtitleMobile: {
    fontSize: 14,
  },
  generateReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  generateReportButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  generateReportText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303F9F',
  },
  generateReportTextMobile: {
    fontSize: 12,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonMobile: {
    padding: 6,
  },
  controlsContainer: {
    marginBottom: 24,
  },
  controlsContainerMobile: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchContainerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A202C',
  },
  searchInputMobile: {
    fontSize: 14,
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  filterContainerMobile: {
    padding: 12,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterScrollMobile: {
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#303F9F',
  },
  filterButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterTextMobile: {
    fontSize: 12,
    marginLeft: 6,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  feedContainerMobile: {
    borderRadius: 8,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  feedTitleMobile: {
    fontSize: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  activityList: {
    padding: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  activityItemMobile: {
    paddingVertical: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  activityTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  activityUser: {
    fontWeight: '600',
    color: '#1A202C',
  },
  activityTime: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  activityTimeMobile: {
    fontSize: 11,
    marginTop: 1,
  },
  activityGenre: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityGenreMobile: {
    fontSize: 11,
  },
  detailsButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#A0AEC0',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A202C',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalIcon: {
    marginTop: -14,
    marginRight: 8,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  detailValue: {
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 20,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  articleGenre: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  confirmationText: {
    fontSize: 16,
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E2E8F0',
  },
  viewButton: {
    backgroundColor: '#303F9F',
  },
  cancelButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageComparison: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 8,
  },
  previewImageSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    marginBottom: 8,
  },
});
