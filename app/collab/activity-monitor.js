import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, FlatList, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';
import Svg, { Rect, Circle, Text as SvgText, Line, Path, G } from 'react-native-svg';

// Deadline Timeline Component
const DeadlineGraph = ({ data, width = 400, height = 250 }) => {
  if (!data || !data.deadlines || data.deadlines.length === 0) return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Text style={{ color: '#A0AEC0', fontSize: 14 }}>No deadlines to display</Text>
    </View>
  );

  const deadlines = data.deadlines;
  const now = new Date();

  // Sort deadlines by date
  const sortedDeadlines = [...deadlines].sort((a, b) => {
    const dateA = new Date(a.deadline_raw);
    const dateB = new Date(b.deadline_raw);
    return dateA - dateB;
  });

  // Find min and max dates for timeline range
  const dates = sortedDeadlines.map(d => new Date(d.deadline_raw));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Extend range by 30 days on each side
  const startDate = new Date(minDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date(maxDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const timelineWidth = width - 60; // Leave space for labels
  const timelineHeight = height - 80; // Leave space for title and labels

  const getDatePosition = (date) => {
    const totalRange = endDate.getTime() - startDate.getTime();
    const dateOffset = date.getTime() - startDate.getTime();
    return 40 + (dateOffset / totalRange) * timelineWidth; // 40px left margin
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {/* Title */}
        <SvgText
          x={width / 2}
          y={20}
          fontSize="14"
          fontWeight="bold"
          fill="#1A202C"
          textAnchor="middle"
        >
          Project Timeline
        </SvgText>

        {/* Timeline line */}
        <Line
          x1="40"
          y1={height - 50}
          x2={width - 20}
          y2={height - 50}
          stroke="#E2E8F0"
          strokeWidth="2"
        />

        {/* Date markers - show key dates without overlaps */}
        {(() => {
          const dateMarkers = [];
          
          // Always show "Today" if it's within range
          if (now >= startDate && now <= endDate) {
            dateMarkers.push({ date: now, label: '', isToday: true });
          }
          
          // Show min deadline
          if (minDate.getTime() !== now.getTime() && minDate >= startDate && minDate <= endDate) {
            dateMarkers.push({ date: minDate, label: formatDate(minDate), isToday: false });
          }
          
          // Show nearest upcoming deadline (closest future deadline)
          const upcomingDeadlines = sortedDeadlines.filter(d => new Date(d.deadline_raw) > now);
          if (upcomingDeadlines.length > 0) {
            const nearestUpcoming = upcomingDeadlines[0]; // Already sorted by date
            const nearestDate = new Date(nearestUpcoming.deadline_raw);
            if (nearestDate.getTime() !== now.getTime() && nearestDate.getTime() !== minDate.getTime()) {
              dateMarkers.push({ date: nearestDate, label: formatDate(nearestDate), isToday: false });
            }
          }
          
          // Remove duplicates based on date
          const uniqueMarkers = dateMarkers.filter((marker, index, self) => 
            index === self.findIndex(m => m.date.getTime() === marker.date.getTime())
          );
          
          return uniqueMarkers.slice(0, 3).map((marker, index) => {
            const x = getDatePosition(marker.date);
            return (
              <G key={index}>
                <Line
                  x1={x}
                  y1={height - 55}
                  x2={x}
                  y2={height - 45}
                  stroke={marker.isToday ? "#303F9F" : "#CBD5E0"}
                  strokeWidth={marker.isToday ? "2" : "1"}
                />
                <SvgText
                  x={x}
                  y={height - 35}
                  fontSize="9"
                  fill={marker.isToday ? "#303F9F" : "#666"}
                  textAnchor="middle"
                  fontWeight={marker.isToday ? "bold" : "normal"}
                >
                  {marker.label}
                </SvgText>
              </G>
            );
          });
        })()}

        {/* Project points */}
        {sortedDeadlines.map((deadline, index) => {
          const x = getDatePosition(new Date(deadline.deadline_raw));
          const y = height - 50;
          const color = getUrgencyColor(deadline.urgency);
          
          // Stagger the text vertically to avoid overlaps
          const textOffset = (index % 4) * 20;
          const nameY = y - 50 - textOffset;

          return (
            <G key={deadline.id}>
              {/* Connection line to project name */}
              <Line
                x1={x}
                y1={y - 15}
                x2={x}
                y2={nameY + 10}
                stroke={color}
                strokeWidth="1"
                opacity="0.5"
              />

              {/* Project name */}
              <SvgText
                x={x}
                y={nameY}
                fontSize="9"
                fill={color}
                textAnchor="middle"
                fontWeight="600"
              >
                {deadline.name.length > 12 ? deadline.name.substring(0, 12) + '...' : deadline.name}
              </SvgText>

              {/* Deadline point */}
              <Circle
                cx={x}
                cy={y}
                r="5"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F44336', marginRight: 5 }} />
          <Text style={{ fontSize: 12, color: '#666' }}>Urgent</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF9800', marginRight: 5 }} />
          <Text style={{ fontSize: 12, color: '#666' }}>Warning</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', marginRight: 5 }} />
          <Text style={{ fontSize: 12, color: '#666' }}>Normal</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 2, height: 12, backgroundColor: '#303F9F', marginRight: 5 }} />
          <Text style={{ fontSize: 12, color: '#666' }}>Today</Text>
        </View>
      </View>
    </View>
  );
};

// PDF Generation
const generatePDFReport = async (activities, filter, activityGenres = {}) => {
  // Ensure activities is an array
  if (!Array.isArray(activities)) {
    activities = [];
  }
  
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
  const [publicationTimelineVisible, setPublicationTimelineVisible] = useState(false);
  const [publications, setPublications] = useState([]);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [deadlineData, setDeadlineData] = useState(null);

  const fetchGenresForActivities = async (activities) => {
    if (!Array.isArray(activities)) {
      return {};
    }
    
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

  const getGenreColor = (genre) => {
    const colors = {
      articles: '#2196F3',
      opinions: '#FF9800',
      sports: '#4CAF50',
      editorial: '#9C27B0',
      artworks: '#FF5722',
      creative: '#607D8B',
    };
    return colors[genre] || '#607D8B';
  };

  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return { backgroundColor: '#F44336', borderColor: '#F44336' };
      case 'warning':
        return { backgroundColor: '#FF9800', borderColor: '#FF9800' };
      default:
        return { backgroundColor: '#4CAF50', borderColor: '#4CAF50' };
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

  const fetchPublications = async () => {
    try {
      setLoadingPublications(true);
      const response = await apiClient.get('/publication-deadlines');
      
      if (response.data.success) {
        setDeadlineData(response.data);
        setPublications(response.data.deadlines || []);
      } else {
        setDeadlineData(null);
        setPublications([]);
      }
    } catch (error) {
      console.error('Error fetching publication deadlines:', error);
      setDeadlineData(null);
      setPublications([]);
    } finally {
      setLoadingPublications(false);
    }
  };

  const handlePublicationTimelinePress = () => {
    setPublicationTimelineVisible(true);
    fetchPublications();
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
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.publicationTimelineButton, isMobile && styles.publicationTimelineButtonMobile]}
            onPress={handlePublicationTimelinePress}
          >
            <Feather
              name="calendar"
              size={isMobile ? 16 : 20}
              color="#303F9F"
            />
            <Text style={[styles.publicationTimelineText, isMobile && styles.publicationTimelineTextMobile]}>
              Publication Timeline
            </Text>
          </TouchableOpacity>
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

      {/* Publication Timeline Modal */}
      <Modal 
        visible={publicationTimelineVisible} 
        animationType="fade" 
        transparent 
        onRequestClose={() => setPublicationTimelineVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.timelineModalContent]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setPublicationTimelineVisible(false)}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.modalHeader}>
              <Feather name="calendar" size={24} color="#303F9F" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Publication Timeline</Text>
            </View>
            
            <Text style={styles.timelineSubtitle}>Publication deadlines across all projects</Text>
            
            {loadingPublications ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#303F9F" />
                <Text style={styles.loadingText}>Loading deadlines...</Text>
              </View>
            ) : deadlineData && deadlineData.total > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Deadline Timeline */}
                <View style={styles.graphContainer}>
                  <Text style={styles.graphTitle}>Project Timeline</Text>
                  <DeadlineGraph 
                    data={deadlineData} 
                    width={isMobile ? width - 80 : 500} 
                    height={300} 
                  />
                </View>

                {/* Upcoming Deadlines List */}
                <View style={styles.deadlinesList}>
                  <Text style={styles.deadlinesTitle}>Pending Deadlines ({deadlineData.total})</Text>
                  {publications.map((item, index) => (
                    <View key={item.id} style={[styles.deadlineItem, isMobile && styles.deadlineItemMobile]}>
                      <View style={styles.deadlineConnector}>
                        <View style={[styles.deadlineDot, getUrgencyStyle(item.urgency)]} />
                        {index < publications.length - 1 && <View style={styles.deadlineLine} />}
                      </View>
                      <View style={styles.deadlineContent}>
                        <View style={styles.deadlineHeader}>
                          <Text style={[styles.deadlineTitle, isMobile && styles.deadlineTitleMobile]}>
                            {item.name}
                          </Text>
                          <View style={[styles.urgencyBadge, getUrgencyStyle(item.urgency)]}>
                            <Text style={styles.urgencyText}>
                              {item.days_until_deadline <= 0 ? 'Overdue' : 
                               item.days_until_deadline === 1 ? 'Tomorrow' : 
                               `${item.days_until_deadline} days`}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.deadlineMeta}>
                          <Text style={[styles.deadlineDate, isMobile && styles.deadlineDateMobile]}>
                            📅 {item.deadline}
                          </Text>
                          <Text style={[styles.deadlineLead, isMobile && styles.deadlineLeadMobile]}>
                            👤 {item.lead_reviewer}
                          </Text>
                          <Text style={[styles.deadlineMembers, isMobile && styles.deadlineMembersMobile]}>
                            👥 {item.members_count} members
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="calendar" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No projects with deadlines found</Text>
                <Text style={styles.emptySubtext}>
                  Projects with deadlines will appear here
                </Text>
              </View>
            )}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  publicationTimelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  publicationTimelineButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  publicationTimelineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303F9F',
  },
  publicationTimelineTextMobile: {
    fontSize: 12,
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
  // Publication Timeline Modal Styles
  timelineModalContent: {
    maxHeight: '80%',
    width: '90%',
    maxWidth: 600,
  },
  timelineSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  graphContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 15,
  },
  deadlinesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  deadlinesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 15,
  },
  deadlineItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  deadlineItemMobile: {
    paddingVertical: 12,
  },
  deadlineConnector: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  deadlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  deadlineLine: {
    width: 2,
    height: 60,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  deadlineContent: {
    flex: 1,
    marginLeft: 12,
  },
  deadlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deadlineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
  },
  deadlineTitleMobile: {
    fontSize: 16,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  deadlineMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deadlineDate: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  deadlineDateMobile: {
    fontSize: 13,
  },
  deadlineLead: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
    textAlign: 'center',
  },
  deadlineLeadMobile: {
    fontSize: 13,
  },
  deadlineMembers: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'right',
  },
  deadlineMembersMobile: {
    fontSize: 13,
  },
  publicationsList: {
    padding: 20,
  },
  publicationItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  publicationItemMobile: {
    paddingVertical: 12,
  },
  publicationConnector: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  publicationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#303F9F',
  },
  publicationLine: {
    width: 2,
    height: 60,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  publicationContent: {
    flex: 1,
    marginLeft: 12,
  },
  publicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  publicationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
  },
  publicationTitleMobile: {
    fontSize: 16,
  },
  genreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  publicationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  publicationAuthor: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  publicationAuthorMobile: {
    fontSize: 13,
  },
  publicationDate: {
    fontSize: 14,
    color: '#718096',
  },
  publicationDateMobile: {
    fontSize: 13,
  },
  publicationExcerpt: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  publicationExcerptMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
});
