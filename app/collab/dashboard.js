import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Modal, TextInput, FlatList, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useBranding } from '~/context/BrandingContext';
import { useNotifications } from '~/context/NotificationContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';
import Svg, { Rect, Circle, Text as SvgText, Line, Path } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';

// Simple Bar Chart Component with Tooltips
const SimpleBarChart = ({ data, width = 300, height = 200 }) => {
  const [tooltip, setTooltip] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const hoverTimeoutRef = useRef(null);

  if (!data || !data.datasets || !data.labels) return null;

  const values = data.datasets[0].data;
  const maxValue = Math.max(...values);
  
  // Adjust the available width to account for left margin (30px) and right margin (20px)
  const availableWidth = width - 50; // 30px left margin + 20px right margin
  const barWidth = availableWidth / values.length;
  const chartHeight = height - 40;

  // Calculate bar positions for mouse tracking
  const barPositions = values.map((value, index) => ({
    index,
    x: 30 + index * barWidth,
    y: maxValue > 0 ? 20 + (chartHeight - 40) - (value / maxValue) * (chartHeight - 40) : 20 + chartHeight - 40,
    width: barWidth - 5, // Reduce width for spacing between bars
    height: maxValue > 0 ? (value / maxValue) * (chartHeight - 40) : 0
  }));

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Find which bar the mouse is over
    let hoveredIndex = null;
    for (const bar of barPositions) {
      if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
          mouseY >= bar.y && mouseY <= bar.y + bar.height) {
        hoveredIndex = bar.index;
        break;
      }
    }

    if (hoveredIndex !== hoveredBarIndex) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      if (hoveredIndex !== null) {
        // Mouse entered a bar - show tooltip immediately
        hoverTimeoutRef.current = setTimeout(() => {
          const genre = data.labels[hoveredIndex];
          const count = values[hoveredIndex];
          const barHeight = (count / maxValue) * (chartHeight - 40);

          // Position tooltip above the bar
          const tooltipX = 30 + hoveredIndex * barWidth + (barWidth - 5) / 2;
          const tooltipY = 20 + (chartHeight - 40) - barHeight - 10;

          setTooltip({
            x: tooltipX,
            y: tooltipY,
            genre: genre,
            count: count,
            label: `${genre}: ${count} views`,
            barWidth: barWidth - 5 // Store actual bar width for tooltip
          });
          setHoveredBarIndex(hoveredIndex);
        }, 0);
      } else {
        // Mouse left all bars - hide tooltip immediately
        hoverTimeoutRef.current = setTimeout(() => {
          setTooltip(null);
          setHoveredBarIndex(null);
        }, 0);
      }
    }
  };

  const handleBarPress = (index) => {
    const genre = data.labels[index];
    const count = values[index];

    setTooltip({
      genre: genre,
      count: count,
      label: `${genre}: ${count} views`
    });
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      {/* Invisible overlay for mouse tracking */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: width,
          height: height,
          zIndex: 5,
        }}
        onMouseMove={handleMouseMove}
      />

      <Svg width={width} height={height}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const value = Math.round(maxValue * ratio);
          const y = 20 + (1 - ratio) * (chartHeight - 40);
          return (
            <SvgText
              key={i}
              x={10}
              y={y + 4}
              fontSize="12"
              fill="#666"
              textAnchor="end"
            >
              {value}
            </SvgText>
          );
        })}

        {/* Bars */}
        {values.map((value, index) => {
          const barHeight = maxValue > 0 ? (value / maxValue) * (chartHeight - 40) : 0;
          const x = 30 + index * barWidth;
          const y = maxValue > 0 ? 20 + (chartHeight - 40) - barHeight : 20 + chartHeight - 40;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth - 5}
              height={barHeight}
              fill="#4CAF50"
              rx="2"
            />
          );
        })}

        {/* X-axis labels */}
        {data.labels.map((label, index) => {
          const x = 30 + index * barWidth + (barWidth - 5) / 2;
          return (
            <SvgText
              key={index}
              x={x}
              y={height - 5}
              fontSize="12"
              fill="#666"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Tooltip */}
      {tooltip && (
        <View style={{
          position: 'absolute',
          left: tooltip.x - tooltip.barWidth / 2, // Center on bar
          top: tooltip.y - 40,
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 8,
          borderRadius: 4,
          width: tooltip.barWidth, // Match exact bar width
          zIndex: 20,
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {tooltip.genre}
          </Text>
          <Text style={{ color: 'white', fontSize: 12 }}>
            {tooltip.count} total views
          </Text>
        </View>
      )}

      {/* Invisible overlay to dismiss tooltip */}
      {tooltip && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={() => setTooltip(null)}
        />
      )}
    </View>
  );
};

// Simple Pie Chart Component with Tooltips
const SimplePieChart = ({ data, width = 300, height = 200 }) => {
  const [tooltip, setTooltip] = useState(null);

  if (!data || !Array.isArray(data)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>No status data</Text>
        </View>
      </View>
    );
  }

  const filteredData = data.filter(item => item.count > 0);
  if (filteredData.length === 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>No status data</Text>
        </View>
      </View>
    );
  }

  const total = filteredData.reduce((sum, item) => sum + item.count, 0);
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  const colors = ['#FF5722', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0'];

  // Color mapping for status types
  const getStatusColor = (statusName) => {
    switch (statusName.toLowerCase()) {
      case 'pending':
        return '#FF5722'; // Red
      case 'in review':
        return '#FF9800'; // Orange
      case 'approved':
        return '#4CAF50'; // Green
      default:
        return colors[0]; // Fallback
    }
  };

  const [hoveredSlice, setHoveredSlice] = useState(null);

  const handleSliceHover = (index) => {
    const item = filteredData[index];
    
    setHoveredSlice({
      name: item.name,
      count: item.count,
      percentage: ((item.count / total) * 100).toFixed(1),
      groups: item.groups || []
    });
  };

  const handleSliceLeave = () => {
    setHoveredSlice(null);
  };

  const handleSlicePress = (index) => {
    const item = filteredData[index];
    
    setTooltip({
      name: item.name,
      count: item.count,
      percentage: ((item.count / total) * 100).toFixed(1),
      groups: item.groups || []
    });
  };

  let currentAngle = -Math.PI / 2; // Start from top

  return (
    <View style={{ flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <TouchableOpacity
        onPress={() => setTooltip(null)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      />
      <Svg width={width} height={height} style={{ zIndex: 2 }}>
        {filteredData.map((item, index) => {
          const percentage = item.count / total;
          const angle = percentage * 2 * Math.PI;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;

          // Special handling for single data point (100%)
          if (filteredData.length === 1) {
            // Create a full circle for single data point
            return (
              <Circle
                key={index}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill={getStatusColor(item.name)}
                stroke="#fff"
                strokeWidth="1"
                onPress={() => handleSlicePress(index)}
                onMouseEnter={() => handleSliceHover(index)}
                onMouseLeave={handleSliceLeave}
                style={{ cursor: 'pointer' }}
              />
            );
          }

          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);

          const largeArcFlag = percentage > 0.5 ? 1 : 0;
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          currentAngle = endAngle;

          return (
            <Path
              key={index}
              d={pathData}
              fill={getStatusColor(item.name)}
              stroke="#fff"
              strokeWidth="1"
              onPress={() => handleSlicePress(index)}
              onMouseEnter={() => handleSliceHover(index)}
              onMouseLeave={handleSliceLeave}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </Svg>

      {/* Legend with tooltips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
        {filteredData.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleSlicePress(index)}
            onMouseEnter={() => handleSliceHover(index)}
            onMouseLeave={handleSliceLeave}
            style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 8, cursor: 'pointer' }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: getStatusColor(item.name),
                marginRight: 8,
                borderRadius: 2
              }}
            />
            <Text style={{ fontSize: 12, color: '#666' }}>
              {item.name}: {item.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tooltip */}
      {(tooltip || hoveredSlice) && (
        <View style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: [{ translateY: -25 }],
          backgroundColor: 'rgba(0,0,0,0.9)',
          padding: 12,
          borderRadius: 6,
          minWidth: 200,
          maxWidth: 300,
          zIndex: 3,
          pointerEvents: 'none', // Prevent tooltip from being hoverable
        }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
            {(hoveredSlice || tooltip).name} Projects
          </Text>
          <Text style={{ color: 'white', fontSize: 12, marginBottom: 8 }}>
            Count: {(hoveredSlice || tooltip).count} ({(hoveredSlice || tooltip).percentage}%)
          </Text>
          {(hoveredSlice || tooltip).groups && (hoveredSlice || tooltip).groups.length > 0 && (
            <View>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                Projects:
              </Text>
              {(hoveredSlice || tooltip).groups.map((groupName, idx) => (
                <Text key={idx} style={{ color: 'white', fontSize: 11, marginLeft: 8, marginBottom: 2 }}>
                  • {groupName}
                </Text>
              ))}
            </View>
          )}
          {tooltip && (
            <TouchableOpacity
              onPress={() => setTooltip(null)}
              style={{ position: 'absolute', top: 4, right: 4 }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// Simple Line Chart Component with Tooltips
const SimpleLineChart = ({ data, width = 300, height = 200 }) => {
  const [tooltip, setTooltip] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Calculate distance between two points
  const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // Track which point is currently being hovered
  const [activePointIndex, setActivePointIndex] = useState(null);

  const hoverTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse movement on the chart area to check distance from active point
  const handleMouseMove = (event) => {
    if (activePointIndex !== null && points[activePointIndex]) {
      const rect = event.currentTarget.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      const activePoint = points[activePointIndex];
      const distance = getDistance(mouseX, mouseY, activePoint.x, activePoint.y);
      
      // Hide tooltip if mouse moves beyond 35 pixel radius from data point
      if (distance > 35) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredPoint(null);
          setActivePointIndex(null);
        }, 150); // Increased delay to 150ms for more forgiveness
      } else {
        // Mouse is still within radius, cancel any pending hide
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
    }
  };

  const values = data.datasets[0].data;
  const maxValue = Math.max(...values);
  const chartWidth = width - 40;
  const chartHeight = height - 40;
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;

  // Calculate touchable points for positioning
  const points = values.map((value, index) => ({
    x: 20 + index * stepX,
    y: maxValue > 0 ? 20 + (1 - value / maxValue) * (chartHeight - 40) : 20 + chartHeight / 2,
    index
  }));

  const handlePointHover = (index) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set active point
    setActivePointIndex(index);

    // Set new timeout to show tooltip after 50ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      const date = new Date(data.labels[index]);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const count = values[index];
      const groupNames = data.datasets[0].group_names ? data.datasets[0].group_names[index] || [] : [];

      setHoveredPoint({
        x: 20 + index * stepX,
        y: 20 + (1 - count / maxValue) * (chartHeight - 40),
        date: formattedDate,
        count: count,
        groupNames: groupNames,
        label: `Submissions: ${count}`
      });
    }, 50);
  };

  const handlePointLeave = () => {
    // Don't hide immediately - the distance tracking will handle it
    // Just clear any existing timeout to avoid conflicts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  return (
    <View 
      style={{ position: 'relative' }}
      onMouseLeave={() => {
        // Hide tooltip immediately when mouse leaves the chart area
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setHoveredPoint(null);
        setActivePointIndex(null);
      }}
    >
      {/* Invisible overlay for mouse movement tracking */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: width,
          height: height,
          zIndex: 5,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          // Hide tooltip immediately when mouse leaves the overlay
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          setHoveredPoint(null);
          setActivePointIndex(null);
        }}
      />
      
      {/* Touchable points positioned absolutely */}
      {points.map((point) => (
        <TouchableOpacity
          key={`point-${point.index}`}
          onPress={() => handlePointPress(point.index)}
          onMouseEnter={() => handlePointHover(point.index)}
          onMouseLeave={handlePointLeave}
          style={{
            position: 'absolute',
            left: point.x - 12,
            top: point.y - 12,
            width: 24,
            height: 24,
            borderRadius: 12,
            zIndex: 15,
            cursor: 'pointer',
          }}
        />
      ))}

      <Svg width={width} height={height} style={{ zIndex: 10 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = 20 + ratio * (chartHeight - 40);
          return (
            <Line
              key={i}
              x1="20"
              y1={y}
              x2={width - 20}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          );
        })}

        {/* Line */}
        <Path
          d={`M ${values.map((value, index) => {
            const x = 20 + index * stepX;
            const y = maxValue > 0 ? 20 + (1 - value / maxValue) * (chartHeight - 40) : 20 + chartHeight / 2;
            return `${x},${y}`;
          }).join(' L ')}`}
          stroke="#2196F3"
          strokeWidth="3"
          fill="none"
        />

        {/* Data points */}
        {values.map((value, index) => {
          const x = 20 + index * stepX;
          const y = maxValue > 0 ? 20 + (1 - value / maxValue) * (chartHeight - 40) : 20 + chartHeight / 2;
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="#2196F3"
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, i) => {
          const value = Math.round(maxValue * ratio);
          const y = 20 + (1 - ratio) * (chartHeight - 40);
          return (
            <SvgText
              key={i}
              x="15"
              y={y + 4}
              fontSize="10"
              fill="#666"
              textAnchor="end"
            >
              {value}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {data.labels.map((label, index) => {
          const x = 20 + index * stepX;
          return (
            <SvgText
              key={index}
              x={x}
              y={height - 5}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Tooltip */}
      {(tooltip || hoveredPoint) && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            left: (hoveredPoint || tooltip).x - 50,
            top: (hoveredPoint || tooltip).y - 40,
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 8,
            borderRadius: 4,
            minWidth: 120,
            zIndex: 20,
          }}
          onMouseLeave={() => {
            // Hide tooltip when mouse leaves the tooltip itself
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            setHoveredPoint(null);
            setActivePointIndex(null);
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {(hoveredPoint || tooltip).date}
          </Text>
          <Text style={{ color: 'white', fontSize: 12 }}>
            {(hoveredPoint || tooltip).label}
          </Text>
          {(hoveredPoint || tooltip).groupNames && (hoveredPoint || tooltip).groupNames.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                Projects:
              </Text>
              {(hoveredPoint || tooltip).groupNames.map((name, idx) => (
                <Text key={idx} style={{ color: 'white', fontSize: 10, marginLeft: 8 }}>
                  • {name}
                </Text>
              ))}
            </View>
          )}
          {tooltip && (
            <TouchableOpacity
              onPress={() => setTooltip(null)}
              style={{ position: 'absolute', top: 2, right: 2 }}
            >
              <Text style={{ color: 'white', fontSize: 14 }}>×</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* Invisible overlay to dismiss tooltip */}
      {tooltip && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 }}
          onPress={() => setTooltip(null)}
        />
      )}
    </View>
  );
};

const StatCard = ({ title, value, iconName, color, isMobile, cardStyle }) => (
  <View style={[styles.statCard, isMobile && styles.statCardMobile, cardStyle]}>
    <View style={[styles.iconContainer, { backgroundColor: color }, isMobile && styles.iconContainerMobile]}>
      <Feather name={iconName} size={isMobile ? 18 : 24} color="#fff" />
    </View>
    <View>
      <Text style={[styles.statCardTitle, isMobile && styles.statCardTitleMobile]}>{title}</Text>
      <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile]}>{value}</Text>
    </View>
  </View>
);

const QuickAction = ({ title, iconName, href, isMobile }) => {
  const router = useRouter();
  return (
    <TouchableOpacity style={[styles.quickAction, isMobile && styles.quickActionMobile]} onPress={() => router.push(href)}>
      <Feather name={iconName} size={isMobile ? 16 : 22} color="#303F9F" />
      <Text style={[styles.quickActionText, isMobile && styles.quickActionTextMobile]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return styles.approvedStatus;
      case 'review':
        return styles.reviewStatus;
      default:
        return styles.pendingStatus;
    }
  };

const UpcomingActivityItem = ({ title, date, time, location, creator, isMobile }) => (
  <View style={styles.activityItem}>
    <Feather name="calendar" size={isMobile ? 18 : 24} color="#555" />
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <View style={styles.activityDetails}>
        <Text style={styles.activityDetail}>📅 {date} at {time}</Text>
        <Text style={styles.activityDetail}>📍 {location}</Text>
        <Text style={styles.activityDetail}>👤 Created by {creator}</Text>
      </View>
    </View>
  </View>
);

  const { user, logout, hasModule } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { pendingReviewCount, pendingApplicantsCount, pendingRequestsCount, setPendingReviewCount, setPendingApplicantsCount, setPendingRequestsCount } = useNotifications();
  const [stats, setStats] = useState([
    { title: "In Review", value: "0", iconName: "file-text", color: "#FFA726" },
    { title: "Approved", value: "0", iconName: "check-square", color: "#66BB6A" },
    { title: "Pending Tasks", value: "0", iconName: "alert-circle", color: "#EF5350" },
    { title: "Active Projects", value: "0", iconName: "briefcase", color: "#5C6BC0" },
  ]);
  const [loading, setLoading] = useState(true);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [topContributors, setTopContributors] = useState(null); // Start with null to indicate initial loading
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [allContributors, setAllContributors] = useState([]);
  const [contributorsSearch, setContributorsSearch] = useState('');
  const [contributorsRole, setContributorsRole] = useState('all');
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [loadingGraphs, setLoadingGraphs] = useState(false);
  const [groupChatTimeline, setGroupChatTimeline] = useState([]);
  const [userWorkingHours, setUserWorkingHours] = useState({});
  const [originalWorkingHours, setOriginalWorkingHours] = useState({}); // Track original data for CRUD operations
  const [collaboratorsWorkingHours, setCollaboratorsWorkingHours] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState(null); // { entryKey, fieldType: 'start_time' | 'end_time' }
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [showMyWorkingHours, setShowMyWorkingHours] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showEditHoursModal, setShowEditHoursModal] = useState(false);

  // Dashboard notification visibility state (separate from sidebar badges)
  const [showReviewNotification, setShowReviewNotification] = useState(true);
  const [showApplicantsNotification, setShowApplicantsNotification] = useState(true);
  const [showRequestsNotification, setShowRequestsNotification] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const fetchGraphData = async () => {
    console.log('fetchGraphData called');
    try {
      setLoadingGraphs(true);
      
      console.log('Making API call to /graph-data?period=20');
      const response = await apiClient.get('/graph-data?period=20')
        .then(response => {
          console.log('Graph data response:', response.data);
          console.log('Group chat status:', response.data.group_chat_status);
          setGraphData(response.data);
          setLoadingGraphs(false);
        })
        .catch(error => {
          console.error('Error fetching graph data:', error);
          console.error('Error response:', error.response);
          console.error('Error status:', error.response?.status);
          setLoadingGraphs(false);
        });
    } catch (error) {
      console.error('Error fetching graph data:', error);
    } finally {
      setLoadingGraphs(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // Listen for broadcast acceptance events to refresh dashboard
  useEffect(() => {
    const handleBroadcastAccepted = () => {
      console.log('Broadcast accepted, refreshing dashboard stats...');
      fetchDashboardStats(true); // Refresh with isRefresh=true
    };

    // Add event listener
    window.addEventListener('broadcastAccepted', handleBroadcastAccepted);

    // Cleanup
    return () => {
      window.removeEventListener('broadcastAccepted', handleBroadcastAccepted);
    };
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    console.log('Stats state changed:', stats);
  }, [stats]);

  useEffect(() => {
    console.log('Upcoming activities state changed:', upcomingActivities);
  }, [upcomingActivities]);

  useEffect(() => {
    console.log('Top contributors state changed:', topContributors);
  }, [topContributors]);

  useEffect(() => {
    console.log('Graph data state changed:', graphData);
  }, [graphData]);

  useEffect(() => {
    console.log('Loading states changed:', { loading, loadingGraphs, refreshing });
  }, [loading, loadingGraphs, refreshing]);

  const fetchDashboardStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiClient.get('/dashboard-stats');
      const data = response.data;
      
      setStats([
        { title: "In Review", value: data.in_review.toString(), iconName: "file-text", color: "#FFA726" },
        { title: "Approved", value: data.approved.toString(), iconName: "check-square", color: "#66BB6A" },
        { title: "Pending Tasks", value: data.pending_tasks.toString(), iconName: "alert-circle", color: "#EF5350" },
        { title: "Active Projects", value: data.active_projects.toString(), iconName: "briefcase", color: "#5C6BC0" },
      ]);
      
      setUpcomingActivities(data.upcoming_activities || []);
      
      // Ensure we have valid data and it's an array
      const contributors = Array.isArray(data.top_contributors) ? data.top_contributors : [];
      setTopContributors(contributors);
      
      // Set group chat timeline
      setGroupChatTimeline(data.group_chat_timeline || []);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllContributors = async () => {
    setLoadingContributors(true);
    try {
      const params = new URLSearchParams({
        search: contributorsSearch,
        timeframe: '30', // Always use 30 days for consistency with main list
        role: contributorsRole,
      });
      
      const response = await apiClient.get(`/contributors?${params}`);
      const data = response.data;
      
      // Handle paginated response - data is in data.data for contributors endpoint
      const contributors = data.data || data || [];
      setAllContributors(contributors);
    } catch (error) {
      console.error('Error fetching all contributors:', error);
    } finally {
      setLoadingContributors(false);
    }
  };

  useEffect(() => {
    if (showContributorsModal) {
      fetchAllContributors();
    }
  }, [showContributorsModal, contributorsSearch, contributorsRole]);

  const fetchUserWorkingHours = async () => {
    try {
      const response = await apiClient.get('/working-hours/me');
      const data = response.data.working_hours || [];
      
      console.log('Raw working hours data from backend:', data);
      
      // Convert from API array format to new UI format, preserving database IDs
      const uiFormat = {};
      
      data.forEach((entry, index) => {
        console.log('Processing entry:', entry);
        
        if (entry.preferred_start_time && entry.preferred_end_time) {
          const key = `preferred_${entry.id || index}`;
          console.log('Adding preferred entry with key:', key);
          uiFormat[key] = {
            type: 'preferred',
            day: entry.day_of_week,
            start_time: entry.preferred_start_time,
            end_time: entry.preferred_end_time,
            id: entry.id // Preserve original database ID
          };
        }
        if (entry.possible_start_time && entry.possible_end_time) {
          const key = `possible_${entry.id || index}`;
          console.log('Adding possible entry with key:', key);
          uiFormat[key] = {
            type: 'possible',
            day: entry.day_of_week,
            start_time: entry.possible_start_time,
            end_time: entry.possible_end_time,
            id: entry.id // Preserve original database ID
          };
        }
      });
      
      console.log('Final UI format:', uiFormat);
      setUserWorkingHours(uiFormat);
      setOriginalWorkingHours(JSON.parse(JSON.stringify(uiFormat))); // Deep copy for comparison
    } catch (error) {
      console.error('Error fetching user working hours:', error);
    }
  };

  const fetchCollaboratorsWorkingHours = async () => {
    try {
      setLoadingSchedule(true);
      const response = await apiClient.get('/working-hours');
      setCollaboratorsWorkingHours(response.data.collaborators || []);
    } catch (error) {
      console.error('Error fetching collaborators working hours:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const saveUserWorkingHours = async (workingHours) => {
    try {
      setSavingSchedule(true);
      
      // Validate time ranges
      for (const [key, entry] of Object.entries(workingHours)) {
        if (key.startsWith('preferred_') || key.startsWith('possible_')) {
          if (entry.start_time && entry.end_time && entry.start_time >= entry.end_time) {
            alert(`Invalid time range for ${entry.type}: Start time must be before end time`);
            return;
          }
        }
      }
      
      // Step 1: Replace all working hours (backend handles deletion automatically)
      console.log('Replacing all working hours...');
      
      const formattedData = Object.entries(workingHours)
        .filter(([key, entry]) => key.startsWith('preferred_') || key.startsWith('possible_'))
        .map(([key, entry]) => ({
          day_of_week: entry.day,
          preferred_start_time: entry.type === 'preferred' ? entry.start_time : null,
          preferred_end_time: entry.type === 'preferred' ? entry.end_time : null,
          possible_start_time: entry.type === 'possible' ? entry.start_time : null,
          possible_end_time: entry.type === 'possible' ? entry.end_time : null,
        }))
        .filter(entry => {
          // Only save entries that have a day and both start and end times for their type
          if (!entry.day_of_week) return false;
          
          if (entry.preferred_start_time || entry.possible_start_time) {
            return (entry.preferred_start_time && entry.preferred_end_time) || 
                   (entry.possible_start_time && entry.possible_end_time);
          }
          
          return false;
        });

      console.log('Sending replacement entries:', formattedData);
      await apiClient.post('/working-hours', { working_hours: formattedData });
      
      // Update local state
      setUserWorkingHours(workingHours);
      setOriginalWorkingHours(JSON.parse(JSON.stringify(workingHours)));
      
      // Refresh team working hours to show updated data
      await fetchCollaboratorsWorkingHours();
      
      setShowConfirmationModal(true);
      setShowEditHoursModal(false); // Close edit modal after saving
    } catch (error) {
      console.error('Error saving working hours:', error);
      alert('Failed to save working hours. Please try again.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const openTimePicker = (entryKey, fieldType) => {
    const entry = userWorkingHours[entryKey];
    if (!entry) return;

    const currentTime = entry[fieldType];
    if (currentTime) {
      // Parse the time string (HH:MM) into hour and minute
      const [hours, minutes] = currentTime.split(':');
      setSelectedHour(hours);
      setSelectedMinute(minutes);
    } else {
      setSelectedHour('09');
      setSelectedMinute('00');
    }

    setCurrentTimeField({ entryKey, fieldType });
    setShowTimePickerModal(true);
  };

  const handleTimeConfirm = () => {
    if (currentTimeField) {
      const { entryKey, fieldType } = currentTimeField;
      const timeString = `${selectedHour}:${selectedMinute}`;
      
      setUserWorkingHours(prev => ({
        ...prev,
        [entryKey]: {
          ...prev[entryKey],
          [fieldType]: timeString
        }
      }));
    }
    
    setShowTimePickerModal(false);
    setCurrentTimeField(null);
  };

  const handleTimeCancel = () => {
    setShowTimePickerModal(false);
    setCurrentTimeField(null);
  };

  useEffect(() => {
    if (showScheduleModal) {
      fetchCollaboratorsWorkingHours();
    }
  }, [showScheduleModal]);

  useEffect(() => {
    if (!showEditHoursModal) {
      // Clear working hours when edit modal closes
      setUserWorkingHours({});
      setOriginalWorkingHours({});
    }
  }, [showEditHoursModal]);

  return (
    <View style={{ flex: 1 }}>
      {/* Notification Popups */}
      {(pendingReviewCount > 0 || pendingApplicantsCount > 0 || pendingRequestsCount > 0) && (
        <View style={styles.notificationsContainer}>
          {pendingReviewCount > 0 && (
            <View style={[styles.notificationPopup, styles.reviewNotification]}>
              <TouchableOpacity 
                style={styles.notificationContent}
                onPress={() => router.push('/collab/review-content')}
              >
                <Feather name="eye" size={20} color="#FFF" />
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Review Content</Text>
                  <Text style={styles.notificationMessage}>
                    {pendingReviewCount} item{pendingReviewCount > 1 ? 's' : ''} awaiting review
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.notificationClose}
                  onPress={() => setPendingReviewCount(0)}
                >
                  <Text style={styles.notificationCloseText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}

          {pendingApplicantsCount > 0 && (
            <View style={[styles.notificationPopup, styles.applicantNotification]}>
              <TouchableOpacity 
                style={styles.notificationContent}
                onPress={() => router.push('/collab/manage-applicants')}
              >
                <Feather name="users" size={20} color="#FFF" />
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Manage Applicants</Text>
                  <Text style={styles.notificationMessage}>
                    {pendingApplicantsCount} pending applicant{pendingApplicantsCount > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.notificationClose}
                  onPress={() => setPendingApplicantsCount(0)}
                >
                  <Text style={styles.notificationCloseText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}

          {pendingRequestsCount > 0 && (
            <View style={[styles.notificationPopup, styles.requestNotification]}>
              <TouchableOpacity 
                style={styles.notificationContent}
                onPress={() => router.push('/collab/manage-requests')}
              >
                <Feather name="file-text" size={20} color="#FFF" />
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Manage Requests</Text>
                  <Text style={styles.notificationMessage}>
                    {pendingRequestsCount} pending request{pendingRequestsCount > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.notificationClose}
                  onPress={() => setPendingRequestsCount(0)}
                >
                  <Text style={styles.notificationCloseText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Welcome, {user?.profile?.name || 'Collaborator'}!</Text>
            <Text style={styles.subtitle}>Here's a summary of your workspace.</Text>
          </View>
          <TouchableOpacity 
            style={[styles.refreshButton, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => setShowScheduleModal(true)}
          >
            <Feather 
              name="calendar" 
              size={20} 
              color="#303F9F" 
            />
            <Text style={styles.scheduleText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {stats.length > 0 && (
          isMobile ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsContainerHorizontal}
            >
              {stats.map(stat => <StatCard key={stat.title} {...stat} isMobile={isMobile} cardStyle={{ width: width * 0.75 }} />)}
            </ScrollView>
          ) : (
            <View style={styles.statsContainer}>
              {stats.map(stat => <StatCard key={stat.title} {...stat} isMobile={isMobile} />)}
            </View>
          )
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={[styles.quickActionsGrid, isMobile && styles.mobileQuickActionsGrid]}>
            {hasModule('create-content') && (
              <QuickAction title="Publish" iconName="send" href="/collab/create-content" isMobile={isMobile} />
            )}
            <QuickAction title="Go to Home" iconName="home" href="/home" isMobile={isMobile} />
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Upcoming Activities</Text>
          <View style={styles.activityList}>
            {upcomingActivities.length > 0 ? (
              upcomingActivities.map((activity, index) => (
                <UpcomingActivityItem
                  key={activity.id}
                  title={activity.title}
                  date={activity.date}
                  time={activity.time}
                  location={activity.location}
                  creator={activity.creator}
                  isMobile={isMobile}
                />
              ))
            ) : (
              <View style={styles.noActivitiesContainer}>
                <Feather name="calendar" size={32} color="#ccc" />
                <Text style={styles.noActivitiesText}>No upcoming activities</Text>
                <Text style={styles.noActivitiesSubtext}>You'll see activities you're enrolled in here</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Contributors (Last 30 Days)</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowContributorsModal(true)}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Feather name="chevron-right" size={16} color="#303F9F" />
            </TouchableOpacity>
          </View>
          <View style={styles.contributorsList}>
            {topContributors && topContributors.length > 0 ? (
              topContributors.map((contributor, index) => (
                <View key={contributor.id} style={styles.contributorItem}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{contributor.name}</Text>
                    <Text style={styles.contributorEmail}>{contributor.email}</Text>
                    <View style={styles.contributorBadges}>
                      <View style={[styles.badge, styles.approvedBadge]}>
                        <Text style={styles.badgeText}>✓ {contributor.approved}</Text>
                      </View>
                      <View style={[styles.badge, styles.reviewBadge]}>
                        <Text style={styles.badgeText}>⏳ {contributor.in_review}</Text>
                      </View>
                      <View style={[styles.badge, styles.pendingBadge]}>
                        <Text style={styles.badgeText}>! {contributor.pending}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.contributorStats}>
                    <Text style={styles.contributorCount}>{contributor.total_assigned}</Text>
                    <Text style={styles.contributorLabel}>Assigned</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noContributorsContainer}>
                <Feather name="users" size={32} color="#ccc" />
                <Text style={styles.noContributorsText}>
                  {topContributors === null ? 'Loading contributors...' : 'No contributor data available'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Project Timeline</Text>
          <View style={styles.timelineList}>
            {groupChatTimeline.length > 0 ? (
              groupChatTimeline.map((item, index) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineConnector}>
                    <View style={styles.timelineDot} />
                    {index < groupChatTimeline.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineTitle}>{item.name}</Text>
                      <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                        <Text style={styles.statusText}>{item.status === 'approved' ? 'Approved' : item.status === 'review' ? 'In Review' : 'Pending'}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineDetails}>
                      <Text style={styles.timelineDeadline}>📅 Deadline: {item.deadline || 'No deadline set'}</Text>
                      <Text style={styles.timelineLead}>👤 Lead: {item.lead_reviewer}</Text>
                      <Text style={styles.timelineMembers}>👥 {item.members_count} members</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noTimelineContainer}>
                <Feather name="calendar" size={32} color="#ccc" />
                <Text style={styles.noTimelineText}>No projects with deadlines found</Text>
                <Text style={styles.noTimelineSubtext}>Projects with deadlines will appear here</Text>
              </View>
            )}
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Project Status Overview</Text>
          
          {/* Content Submissions Over Time */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Content Submissions (Last 20 Days)</Text>
            {loadingGraphs ? (
              <View style={styles.loadingContainer}>
                <Text>Loading chart data...</Text>
              </View>
            ) : graphData && graphData.content_submissions && graphData.content_submissions.length > 0 ? (
              <SimpleLineChart
                data={{
                  labels: graphData.content_submissions.map(item => {
                    const date = new Date(item.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }),
                  datasets: [{
                    data: graphData.content_submissions.map(item => item.count),
                    group_names: graphData.content_submissions.map(item => item.group_names || [])
                  }]
                }}
                width={isMobile ? width - 48 : width - 370} // Use full screen width without 800px limit
                height={220}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No submission data available</Text>
              </View>
            )}
          </View>

          {/* Published Content Over Time */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Published Content (Last 20 Days)</Text>
            {loadingGraphs ? (
              <View style={styles.loadingContainer}>
                <Text>Loading chart data...</Text>
              </View>
            ) : graphData && graphData.published_content && graphData.published_content.length > 0 ? (
              <SimpleLineChart
                data={{
                  labels: graphData.published_content.map(item => {
                    const date = new Date(item.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }),
                  datasets: [{
                    data: graphData.published_content.map(item => item.count),
                    group_names: graphData.published_content.map(item => item.group_names || [])
                  }]
                }}
                width={isMobile ? width - 48 : width - 370} // Use full screen width without 800px limit
                height={220}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No published content data available</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          
          <View style={[styles.chartsGrid, isMobile && styles.mobileChartsGrid, { flexDirection: isMobile ? 'column' : 'row', marginHorizontal: 0 }]}>
            {/* Project Status */}
            <View style={[styles.chartContainer, { 
              flex: isMobile ? 1 : 0.45,
              marginRight: isMobile ? 0 : 10
            }]}>
              <Text style={styles.chartTitle}>Project Status</Text>
              {loadingGraphs ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading...</Text>
                </View>
              ) : graphData && graphData.group_chat_status ? (
                (() => {
                  const pieData = [
                    {
                      name: 'Pending',
                      count: graphData.group_chat_status.pending?.count || 0,
                      groups: graphData.group_chat_status.pending?.groups || []
                    },
                    {
                      name: 'In Review',
                      count: graphData.group_chat_status.review?.count || 0,
                      groups: graphData.group_chat_status.review?.groups || []
                    },
                    {
                      name: 'Approved',
                      count: graphData.group_chat_status.approved?.count || 0,
                      groups: graphData.group_chat_status.approved?.groups || []
                    }
                  ].filter(item => item.count > 0);
                  
                  console.log('Pie chart data:', pieData);
                  console.log('Raw group_chat_status:', graphData.group_chat_status);
                  
                  return (
                    <SimplePieChart
                      data={pieData}
                      width={isMobile ? width - 48 : Math.floor((width - 370) * 0.45) - 32}
                      height={200}
                    />
                  );
                })()
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No status data</Text>
                </View>
              )}
            </View>


            {/* Most Viewed Articles by Genre */}
            <View style={[styles.chartContainer, { 
              flex: isMobile ? 1 : 0.55,
              marginLeft: isMobile ? 0 : 0
            }]}>
              <Text style={styles.chartTitle}>Most Viewed by Genre</Text>
              {loadingGraphs ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading...</Text>
                </View>
              ) : graphData && graphData.article_publications && graphData.article_publications.length > 0 ? (
                <SimpleBarChart
                  data={{
                    labels: graphData.article_publications.map(item => item.genre),
                    datasets: [{
                      data: graphData.article_publications.map(item => item.count)
                    }]
                  }}
                  width={isMobile ? width - 48 : Math.floor((width - 370) * 0.55) - 32}
                  height={200}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No publication data</Text>
                </View>
              )}
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Contributors Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showContributorsModal}
        onRequestClose={() => setShowContributorsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContributorsModal(false)}>
              <Feather name="arrow-left" size={24} color="#303F9F" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Contributors</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search */}
          <View style={styles.filtersContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contributors by name or email..."
              value={contributorsSearch}
              onChangeText={setContributorsSearch}
            />
          </View>

          {/* Contributors List */}
          {loadingContributors ? (
            <View style={styles.loadingContainer}>
              <Text>Loading contributors...</Text>
            </View>
          ) : allContributors && allContributors.length > 0 ? (
            <FlatList
              data={allContributors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <View key={item.id} style={styles.contributorItem}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{item.name}</Text>
                    <Text style={styles.contributorEmail}>{item.email}</Text>
                    <View style={styles.contributorBadges}>
                      <View style={[styles.badge, styles.approvedBadge]}>
                        <Text style={styles.badgeText}>✓ {item.approved || 0}</Text>
                      </View>
                      <View style={[styles.badge, styles.reviewBadge]}>
                        <Text style={styles.badgeText}>⏳ {item.in_review || 0}</Text>
                      </View>
                      <View style={[styles.badge, styles.pendingBadge]}>
                        <Text style={styles.badgeText}>! {item.pending || 0}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.contributorStats}>
                    <Text style={styles.contributorCount}>{item.total_assigned || 0}</Text>
                    <Text style={styles.contributorLabel}>Assigned</Text>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noContributorsContainer}>
              <Feather name="users" size={32} color="#ccc" />
              <Text style={styles.noContributorsText}>No contributors found</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showScheduleModal}
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Feather name="arrow-left" size={24} color="#303F9F" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Team Schedule</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Collaborators' Schedules - Shown First */}
            <View style={styles.scheduleSection}>
              <Text style={styles.sectionTitle}>Team Working Hours</Text>
              {loadingSchedule ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading team schedules...</Text>
                </View>
              ) : collaboratorsWorkingHours.length > 0 ? (
                <View style={styles.teamCalendarContainer}>
                  {/* Calendar Header */}
                  <View style={styles.calendarHeader}>
                    <View style={styles.calendarCorner}>
                      <Text style={styles.cornerText}>Team</Text>
                    </View>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <View key={day} style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{day}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Calendar Grid */}
                  {collaboratorsWorkingHours.map((collaborator) => (
                    <View key={collaborator.id} style={styles.calendarRow}>
                      {/* User Info */}
                      <View style={styles.userCell}>
                        <Text style={styles.userName}>{collaborator.name.split(' ')[0]}</Text>
                        <Text style={styles.userEmail}>{collaborator.email.split('@')[0]}</Text>
                      </View>
                      
                      {/* Day Cells */}
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                        const dayEntries = [];
                        
                        // Collect all entries for this day from the user's working hours
                        collaborator.working_hours.forEach((hours) => {
                          if (hours.day_of_week === day) {
                            if (hours.preferred_start_time && hours.preferred_end_time) {
                              dayEntries.push({
                                type: 'preferred',
                                start: hours.preferred_start_time,
                                end: hours.preferred_end_time
                              });
                            }
                            if (hours.possible_start_time && hours.possible_end_time) {
                              dayEntries.push({
                                type: 'possible',
                                start: hours.possible_start_time,
                                end: hours.possible_end_time
                              });
                            }
                          }
                        });
                        
                        return (
                          <View key={day} style={styles.dayCell}>
                            {dayEntries.length > 0 ? (
                              <View style={styles.timeBlock}>
                                {dayEntries.map((entry, index) => (
                                  <View 
                                    key={index}
                                    style={[
                                      entry.type === 'preferred' ? styles.preferredTimeBlock : styles.possibleTimeBlock
                                    ]}
                                  >
                                    <Text style={styles.timeText}>
                                      {entry.start}-{entry.end}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <View style={styles.emptyCell}>
                                <Text style={styles.emptyText}>—</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No team schedules available</Text>
                </View>
              )}
            </View>

            {/* User's Schedule Input - Collapsible */}
            <View style={styles.scheduleSection}>
              <TouchableOpacity 
                style={styles.collapsibleHeader}
                onPress={() => setShowMyWorkingHours(!showMyWorkingHours)}
              >
                <Text style={styles.sectionTitle}>My Working Hours</Text>
                <Feather 
                  name={showMyWorkingHours ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#303F9F" 
                />
              </TouchableOpacity>
              
              {showMyWorkingHours && (
                <View style={styles.collapsibleContent}>
                  {/* Edit Hours Button */}
                  <TouchableOpacity 
                    style={styles.editHoursButton}
                    onPress={() => setShowEditHoursModal(true)}
                  >
                    <Feather name="edit" size={16} color="#303F9F" />
                    <Text style={styles.editHoursButtonText}>Edit Hours</Text>
                  </TouchableOpacity>

                  {/* Add Buttons */}
                  <View style={styles.addButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => setUserWorkingHours(prev => ({
                        ...prev,
                        [`preferred_${Date.now()}`]: { type: 'preferred', day: '', start_time: '', end_time: '' }
                      }))}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                      <Text style={styles.addButtonText}>Add Preferred Time</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.addButton, styles.addButtonSecondary]}
                      onPress={() => setUserWorkingHours(prev => ({
                        ...prev,
                        [`possible_${Date.now()}`]: { type: 'possible', day: '', start_time: '', end_time: '' }
                      }))}
                    >
                      <Feather name="plus" size={16} color="#303F9F" />
                      <Text style={styles.addButtonTextSecondary}>Add Possible Time</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Schedule Entries */}
                  <View style={styles.scheduleEntries}>
                    {Object.entries(userWorkingHours)
                      .filter(([key, entry]) => key.startsWith('preferred_') || key.startsWith('possible_'))
                      .map(([key, entry]) => (
                        <View key={key} style={styles.scheduleEntry}>
                          <View style={styles.entryHeader}>
                            <Text style={[
                              styles.entryType, 
                              entry.type === 'preferred' ? styles.preferredType : styles.possibleType
                            ]}>
                              {entry.type === 'preferred' ? 'Preferred' : 'Possible'}
                            </Text>
                            <TouchableOpacity 
                              style={styles.removeButton}
                              onPress={() => setUserWorkingHours(prev => {
                                const updated = { ...prev };
                                delete updated[key];
                                return updated;
                              })}
                            >
                              <Feather name="x" size={16} color="#EF5350" />
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.entryForm}>
                            <View style={styles.formRow}>
                              <Text style={styles.fieldLabel}>Day:</Text>
                              <View style={styles.daySelector}>
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                  <TouchableOpacity
                                    key={day}
                                    style={[
                                      styles.dayOption,
                                      entry.day === day && styles.dayOptionSelected
                                    ]}
                                    onPress={() => setUserWorkingHours(prev => ({
                                      ...prev,
                                      [key]: { ...entry, day }
                                    }))}
                                  >
                                    <Text style={[
                                      styles.dayOptionText,
                                      entry.day === day && styles.dayOptionTextSelected
                                    ]}>
                                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                            
                            <View style={styles.formRow}>
                              <Text style={styles.fieldLabel}>Time:</Text>
                              <View style={styles.timeFields}>
                                <TouchableOpacity
                                  style={styles.timeInput}
                                  onPress={() => openTimePicker(key, 'start_time')}
                                >
                                  <Text style={[styles.timeInputText, !entry.start_time && styles.timeInputPlaceholder]}>
                                    {entry.start_time || 'Start'}
                                  </Text>
                                </TouchableOpacity>
                                <Text style={styles.timeSeparator}>to</Text>
                                <TouchableOpacity
                                  style={styles.timeInput}
                                  onPress={() => openTimePicker(key, 'end_time')}
                                >
                                  <Text style={[styles.timeInputText, !entry.end_time && styles.timeInputPlaceholder]}>
                                    {entry.end_time || 'End'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                  </View>

                  {Object.keys(userWorkingHours).filter(key => 
                    key.startsWith('preferred_') || key.startsWith('possible_')
                  ).length > 0 && (
                    <TouchableOpacity 
                      style={[styles.saveButton, savingSchedule && styles.saveButtonDisabled]}
                      onPress={() => saveUserWorkingHours(userWorkingHours)}
                      disabled={savingSchedule}
                    >
                      <Text style={styles.saveButtonText}>
                        {savingSchedule ? 'Saving...' : 'Save My Schedule'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConfirmationModal}
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationContent}>
              <View style={styles.confirmationIcon}>
                <Feather name="check-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.confirmationTitle}>Schedule Saved!</Text>
              <Text style={styles.confirmationMessage}>
                Your working hours have been successfully updated and are now visible to your team.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.confirmationButton}
              onPress={() => setShowConfirmationModal(false)}
            >
              <Text style={styles.confirmationButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Hours Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showEditHoursModal}
        onRequestClose={() => setShowEditHoursModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditHoursModal(false)}>
              <Feather name="arrow-left" size={24} color="#303F9F" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Working Hours</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.editHoursContent}>
              <Text style={styles.editHoursSubtitle}>Manage your saved working hours</Text>
              
              {/* Load/Edit Hours */}
              <TouchableOpacity 
                style={styles.loadHoursButton}
                onPress={() => fetchUserWorkingHours()}
              >
                <Feather name="download" size={16} color="#303F9F" />
                <Text style={styles.loadHoursButtonText}>Load My Hours</Text>
              </TouchableOpacity>

              {/* Schedule Entries for Editing */}
              <View style={styles.editScheduleEntries}>
                {Object.entries(userWorkingHours)
                  .filter(([key, entry]) => key.startsWith('preferred_') || key.startsWith('possible_'))
                  .map(([key, entry]) => (
                    <View key={key} style={styles.editScheduleEntry}>
                      <View style={styles.entryHeader}>
                        <Text style={[
                          styles.entryType, 
                          entry.type === 'preferred' ? styles.preferredType : styles.possibleType
                        ]}>
                          {entry.type === 'preferred' ? 'Preferred' : 'Possible'}
                        </Text>
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => setUserWorkingHours(prev => {
                            const updated = { ...prev };
                            delete updated[key];
                            return updated;
                          })}
                        >
                          <Feather name="trash-2" size={16} color="#EF5350" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.entryForm}>
                        <View style={styles.formRow}>
                          <Text style={styles.fieldLabel}>Day:</Text>
                          <View style={styles.daySelector}>
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                              <TouchableOpacity
                                key={day}
                                style={[
                                  styles.dayOption,
                                  entry.day === day && styles.dayOptionSelected
                                ]}
                                onPress={() => setUserWorkingHours(prev => ({
                                  ...prev,
                                  [key]: { ...entry, day }
                                }))}
                              >
                                <Text style={[
                                  styles.dayOptionText,
                                  entry.day === day && styles.dayOptionTextSelected
                                ]}>
                                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        
                        <View style={styles.formRow}>
                          <Text style={styles.fieldLabel}>Time:</Text>
                          <View style={styles.timeFields}>
                            <TouchableOpacity
                              style={styles.timeInput}
                              onPress={() => openTimePicker(key, 'start_time')}
                            >
                              <Text style={[styles.timeInputText, !entry.start_time && styles.timeInputPlaceholder]}>
                                {entry.start_time || 'Start'}
                              </Text>
                            </TouchableOpacity>
                            <Text style={styles.timeSeparator}>to</Text>
                            <TouchableOpacity
                              style={styles.timeInput}
                              onPress={() => openTimePicker(key, 'end_time')}
                            >
                              <Text style={[styles.timeInputText, !entry.end_time && styles.timeInputPlaceholder]}>
                                {entry.end_time || 'End'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
              </View>

              {Object.keys(userWorkingHours).filter(key => 
                key.startsWith('preferred_') || key.startsWith('possible_')
              ).length > 0 && (
                <TouchableOpacity 
                  style={[styles.saveButton, savingSchedule && styles.saveButtonDisabled]}
                  onPress={() => saveUserWorkingHours(userWorkingHours)}
                  disabled={savingSchedule}
                >
                  <Text style={styles.saveButtonText}>
                    {savingSchedule ? 'Updating...' : 'Update Hours'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Time Picker Modal - Rendered last to appear on top */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTimePickerModal}
        onRequestClose={handleTimeCancel}
      >
        <View style={[styles.timePickerOverlay, { zIndex: 1000 }]}>
          <View style={[styles.timePickerModal, { zIndex: 1001 }]}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleTimeCancel}
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={(itemValue) => setSelectedHour(itemValue)}
                  style={styles.picker}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <Picker.Item
                      key={i}
                      label={i.toString().padStart(2, '0')}
                      value={i.toString().padStart(2, '0')}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                  style={styles.picker}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <Picker.Item
                      key={i}
                      label={i.toString().padStart(2, '0')}
                      value={i.toString().padStart(2, '0')}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.timePickerFooter}>
              <TouchableOpacity style={styles.timePickerButtonCancel} onPress={handleTimeCancel}>
                <Text style={styles.timePickerButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timePickerButtonConfirm} onPress={handleTimeConfirm}>
                <Text style={styles.timePickerButtonTextConfirm}>Confirm</Text>
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
    padding: 24,
    paddingBottom: 48, // Ensure space at the bottom
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#303F9F",
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statsContainerHorizontal: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    flexBasis: '46%',
    flexGrow: 1,
  },
  statCardMobile: {
    padding: 8,
    margin: 6,
    borderRadius: 8,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  iconContainerMobile: {
    padding: 8,
    marginRight: 10,
    borderRadius: 6,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statCardTitleMobile: {
    fontSize: 12,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 4,
  },
  statCardValueMobile: {
    fontSize: 18,
    marginTop: 1,
  },
  sectionContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexBasis: '46%',
    flexGrow: 1,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionMobile: {
    padding: 10,
    borderRadius: 10,
    margin: 6,
  },
  quickActionText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#303F9F',
  },
  quickActionTextMobile: {
    marginLeft: 10,
    fontSize: 14,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  activityText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4A4A4A',
  },
  activityTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  activityDetails: {
    gap: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: '#718096',
  },
  noActivitiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noActivitiesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 8,
  },
  noActivitiesSubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 4,
    textAlign: 'center',
  },

  mobileQuickActionsGrid: {
    flexDirection: 'column',
  },
  // Contributors Section Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303F9F',
    marginRight: 4,
  },
  contributorsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  contributorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#303F9F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  contributorEmail: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  contributorBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  approvedBadge: {
    backgroundColor: '#D4EDDA',
  },
  reviewBadge: {
    backgroundColor: '#FFF3CD',
  },
  pendingBadge: {
    backgroundColor: '#F8D7DA',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contributorStats: {
    alignItems: 'flex-end',
  },
  contributorCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#303F9F',
  },
  contributorLabel: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 2,
  },
  noContributorsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noContributorsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#303F9F',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalContributorsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalContributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  // Chart Styles
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  mobileChartsGrid: {
    flexDirection: 'column',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  // Timeline Styles
  timelineList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#303F9F',
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  approvedStatus: {
    backgroundColor: '#D4EDDA',
  },
  reviewStatus: {
    backgroundColor: '#FFF3CD',
  },
  pendingStatus: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
  },
  timelineDetails: {
    gap: 4,
  },
  timelineDeadline: {
    fontSize: 14,
    color: '#4A5568',
  },
  timelineLead: {
    fontSize: 14,
    color: '#4A5568',
  },
  timelineMembers: {
    fontSize: 14,
    color: '#4A5568',
  },
  noTimelineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noTimelineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 8,
  },
  noTimelineSubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 4,
    textAlign: 'center',
  },
  // Schedule Modal Styles
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  collapsibleContent: {
    marginTop: 16,
  },
  editHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  editHoursButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303F9F',
  },
  scheduleSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303F9F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#303F9F',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonTextSecondary: {
    color: '#303F9F',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleEntries: {
    gap: 16,
  },
  scheduleEntry: {
    backgroundColor: '#F7F8FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryType: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  preferredType: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  possibleType: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  removeButton: {
    padding: 4,
  },
  entryForm: {
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    width: 50,
    marginRight: 12,
  },
  daySelector: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    minWidth: 60,
    alignItems: 'center',
  },
  dayOptionSelected: {
    backgroundColor: '#303F9F',
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  dayOptionTextSelected: {
    color: '#fff',
  },
  timeFields: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    minHeight: 36,
  },
  timeInputText: {
    fontSize: 14,
    color: '#2D3748',
  },
  timeInputPlaceholder: {
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  timeSeparator: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#303F9F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  collaboratorSchedule: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  // Team Calendar Styles
  teamCalendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calendarCorner: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  cornerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayHeader: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  calendarRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userCell: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: '#FAFBFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 11,
    color: '#6B7280',
  },
  dayCell: {
    flex: 1,
    minHeight: 80,
    padding: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  timeBlock: {
    gap: 2,
    alignItems: 'center',
  },
  preferredTimeBlock: {
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    marginBottom: 2,
    minWidth: '100%',
  },
  possibleTimeBlock: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    minWidth: '100%',
  },
  timeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
  emptyCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  collaboratorHeader: {
    marginBottom: 12,
  },
  collaboratorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  collaboratorEmail: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  collaboratorScheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayScheduleSummary: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F7F8FA',
    borderRadius: 6,
  },
  daySummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  hoursSummary: {
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  preferredHours: {
    color: '#303F9F',
  },
  possibleHours: {
    color: '#718096',
  },
  noHoursText: {
    fontSize: 11,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  // Time Picker Modal Styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 280,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0,
    position: 'relative',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
  },
  picker: {
    width: '100%',
    height: 40,
  },
  timePickerFooter: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  timePickerButtonCancel: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  timePickerButtonConfirm: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#303F9F',
    alignItems: 'center',
  },
  timePickerButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timePickerButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Confirmation Modal Styles
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 320,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmationContent: {
    padding: 32,
    alignItems: 'center',
  },
  confirmationIcon: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmationButton: {
    marginHorizontal: 32,
    marginVertical: 20,
    paddingVertical: 12,
    backgroundColor: '#303F9F',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Edit Hours Modal Styles
  editHoursContent: {
    padding: 20,
  },
  editHoursSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  loadHoursButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#303F9F',
  },
  editScheduleEntries: {
    gap: 16,
  },
  editScheduleEntry: {
    backgroundColor: '#F7F8FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Notification Popup Styles
  notificationsContainer: {
    position: 'absolute',
    top: 100,
    right: 24,
    zIndex: 1000,
    gap: 12,
  },
  notificationPopup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 280,
    maxWidth: 320,
  },
  reviewNotification: {
    backgroundColor: '#FFA726',
  },
  applicantNotification: {
    backgroundColor: '#EF5350',
  },
  requestNotification: {
    backgroundColor: '#42A5F5',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  notificationClose: {
    padding: 4,
    marginLeft: 8,
  },
  notificationCloseText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
