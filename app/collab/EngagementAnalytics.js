import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText, Line, Path } from 'react-native-svg';
import apiClient from '../../utils/api';

/**
 * Heatmap Component - Shows peak reading hours by day
 * X-axis: Hours (0-23), Y-axis: Days (Mon-Sun)
 */
const ReaderBehaviorHeatmap = ({ data, width = 400, height = 250 }) => {
  console.log('🔥 ReaderBehaviorHeatmap received data:', data);
  
  if (!data || data.length === 0) {
    console.warn('⚠️ No reader behavior data provided to heatmap');
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height }}>
        <Text style={{ color: '#666' }}>No reader behavior data available</Text>
      </View>
    );
  }

  console.log('✅ Heatmap data count:', data.length);
  console.log('📊 Data sample:', data[0]);
  console.log('📋 All data items:', data.map(d => ({ day: d.day, hour: d.hour, visits: d.visits })));

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayMap = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun',
    'Mon': 'Mon',
    'Tue': 'Tue',
    'Wed': 'Wed',
    'Thu': 'Thu',
    'Fri': 'Fri',
    'Sat': 'Sat',
    'Sun': 'Sun'
  };
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Create a 2D grid for heatmap
  const grid = {};
  let maxValue = 0;
  
  data.forEach(item => {
    const normalizedDay = dayMap[item.day] || item.day;
    const key = `${normalizedDay}-${item.hour}`;
    grid[key] = item.visits;
    maxValue = Math.max(maxValue, item.visits);
    console.log(`📍 Grid entry: ${key} = ${item.visits}`);
  });

  const cellWidth = (width - 60) / 24;
  const cellHeight = (height - 40) / 7;

  const getColor = (value) => {
    if (!value) return '#f5f5f5';
    const intensity = value / maxValue;
    if (intensity > 0.8) return '#d32f2f'; // Dark red - peak hours
    if (intensity > 0.6) return '#f57c00'; // Orange
    if (intensity > 0.4) return '#fbc02d'; // Yellow
    if (intensity > 0.2) return '#7cb342'; // Light green
    return '#c8e6c9'; // Very light green
  };

  console.log('🎨 Heatmap rendering:', { maxValue, cellWidth, cellHeight, gridSize: Object.keys(grid).length });

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Day labels */}
        {days.map((day, dayIndex) => (
          <SvgText
            key={`day-${dayIndex}`}
            x={15}
            y={40 + dayIndex * cellHeight + cellHeight / 2 + 4}
            fontSize="12"
            fill="#666"
            textAnchor="end"
          >
            {day}
          </SvgText>
        ))}

        {/* Hour labels */}
        {hours.map((hour, hourIndex) => (
          <SvgText
            key={`hour-${hourIndex}`}
            x={60 + hourIndex * cellWidth + cellWidth / 2}
            y={30}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {hour}h
          </SvgText>
        ))}

        {/* Heatmap cells */}
        {days.map((day, dayIndex) =>
          hours.map((hour, hourIndex) => {
            const key = `${day}-${hour}`;
            const value = grid[key] || 0;
            const color = getColor(value);
            console.log(`🔲 Rendering cell ${key}: value=${value}, color=${color}`);
            return (
              <Rect
                key={`cell-${dayIndex}-${hourIndex}`}
                x={60 + hourIndex * cellWidth}
                y={40 + dayIndex * cellHeight}
                width={cellWidth - 1}
                height={cellHeight - 1}
                fill={color}
                stroke="#ddd"
                strokeWidth="0.5"
              />
            );
          })
        )}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 16, height: 16, backgroundColor: '#d32f2f' }} />
          <Text style={{ fontSize: 11, color: '#666' }}>Peak</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 16, height: 16, backgroundColor: '#fbc02d' }} />
          <Text style={{ fontSize: 11, color: '#666' }}>Moderate</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 16, height: 16, backgroundColor: '#c8e6c9' }} />
          <Text style={{ fontSize: 11, color: '#666' }}>Low</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Content Lifecycle Chart - Shows how article views decay over time
 */
const ContentLifecycleChart = ({ data, width = 400, height = 250 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height }}>
        <Text style={{ color: '#666' }}>No lifecycle data available</Text>
      </View>
    );
  }

  // Group by genre and calculate average decay
  const genreData = {};
  data.forEach(item => {
    if (!genreData[item.genre]) {
      genreData[item.genre] = [];
    }
    genreData[item.genre].push({
      days: item.days_since_publish,
      avgDaily: item.avg_daily_views
    });
  });

  const chartWidth = width - 60;
  const chartHeight = height - 60;
  const maxDays = Math.max(...data.map(d => d.days_since_publish));
  const maxViews = Math.max(...data.map(d => d.avg_daily_views));

  const colors = ['#2196F3', '#FF9800', '#4CAF50', '#F44336', '#9C27B0'];
  let colorIndex = 0;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = 20 + ratio * chartHeight;
          return (
            <Line
              key={`grid-${i}`}
              x1="50"
              y1={y}
              x2={width - 10}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, i) => {
          const value = Math.round(maxViews * ratio);
          const y = 20 + (1 - ratio) * chartHeight;
          return (
            <SvgText
              key={`y-label-${i}`}
              x={45}
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
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const days = Math.round(maxDays * ratio);
          const x = 50 + ratio * chartWidth;
          return (
            <SvgText
              key={`x-label-${i}`}
              x={x}
              y={height - 10}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {days}d
            </SvgText>
          );
        })}

        {/* Lines for each genre */}
        {Object.entries(genreData).map(([genre, points]) => {
          const color = colors[colorIndex++ % colors.length];
          const sortedPoints = points.sort((a, b) => a.days - b.days);
          
          return (
            <Path
              key={`line-${genre}`}
              d={sortedPoints
                .map((point, idx) => {
                  const x = 50 + (point.days / maxDays) * chartWidth;
                  const y = 20 + (1 - point.avgDaily / maxViews) * chartHeight;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              stroke={color}
              strokeWidth="2"
              fill="none"
            />
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, gap: 12 }}>
        {Object.keys(genreData).map((genre, idx) => (
          <View key={genre} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 2, backgroundColor: colors[idx % colors.length] }} />
            <Text style={{ fontSize: 11, color: '#666' }}>{genre}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Audience Growth Chart - Shows unique visitor trends
 */
const AudienceGrowthChart = ({ data, width = 400, height = 250 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height }}>
        <Text style={{ color: '#666' }}>No audience growth data available</Text>
      </View>
    );
  }

  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  const maxVisitors = Math.max(...sortedData.map(d => d.unique_visitors));

  const chartWidth = width - 60;
  const chartHeight = height - 60;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = 20 + ratio * chartHeight;
          return (
            <Line
              key={`grid-${i}`}
              x1="50"
              y1={y}
              x2={width - 10}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, i) => {
          const value = Math.round(maxVisitors * ratio);
          const y = 20 + (1 - ratio) * chartHeight;
          return (
            <SvgText
              key={`y-label-${i}`}
              x={45}
              y={y + 4}
              fontSize="10"
              fill="#666"
              textAnchor="end"
            >
              {value}
            </SvgText>
          );
        })}

        {/* Line chart */}
        <Path
          d={sortedData
            .map((item, idx) => {
              const x = 50 + (idx / (sortedData.length - 1 || 1)) * chartWidth;
              const y = 20 + (1 - item.unique_visitors / maxVisitors) * chartHeight;
              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ')}
          stroke="#2196F3"
          strokeWidth="3"
          fill="none"
        />

        {/* Data points */}
        {sortedData.map((item, idx) => {
          const x = 50 + (idx / (sortedData.length - 1 || 1)) * chartWidth;
          const y = 20 + (1 - item.unique_visitors / maxVisitors) * chartHeight;
          return (
            <Circle
              key={`point-${idx}`}
              cx={x}
              cy={y}
              r="4"
              fill="#2196F3"
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}

        {/* X-axis labels (dates) */}
        {sortedData.map((item, idx) => {
          if (idx % Math.ceil(sortedData.length / 5) === 0) {
            const x = 50 + (idx / (sortedData.length - 1 || 1)) * chartWidth;
            const date = new Date(item.date);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <SvgText
                key={`x-label-${idx}`}
                x={x}
                y={height - 10}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          }
          return null;
        })}
      </Svg>
    </View>
  );
};

/**
 * Engagement Quality Chart - Shows reaction rates by genre
 */
const EngagementQualityChart = ({ data, width = 400, height = 250 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height }}>
        <Text style={{ color: '#666' }}>No engagement data available</Text>
      </View>
    );
  }

  // Group by genre and calculate average engagement rate
  const genreStats = {};
  data.forEach(item => {
    if (!genreStats[item.genre]) {
      genreStats[item.genre] = { totalRate: 0, count: 0 };
    }
    genreStats[item.genre].totalRate += item.engagement_rate;
    genreStats[item.genre].count += 1;
  });

  const genres = Object.keys(genreStats);
  const avgRates = genres.map(genre => genreStats[genre].totalRate / genreStats[genre].count);
  const maxRate = Math.max(...avgRates);

  const barWidth = (width - 60) / genres.length;
  const chartHeight = height - 60;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, i) => {
          const value = Math.round(maxRate * ratio * 100) / 100;
          const y = 20 + (1 - ratio) * chartHeight;
          return (
            <SvgText
              key={`y-label-${i}`}
              x={45}
              y={y + 4}
              fontSize="10"
              fill="#666"
              textAnchor="end"
            >
              {value}%
            </SvgText>
          );
        })}

        {/* Bars */}
        {avgRates.map((rate, idx) => {
          const barHeight = (rate / maxRate) * chartHeight;
          const x = 50 + idx * barWidth;
          const y = 20 + chartHeight - barHeight;

          return (
            <g key={`bar-${idx}`}>
              <Rect
                x={x + 5}
                y={y}
                width={barWidth - 10}
                height={barHeight}
                fill="#4CAF50"
                rx="2"
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 10}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {genres[idx]}
              </SvgText>
            </g>
          );
        })}
      </Svg>
    </View>
  );
};

/**
 * Main Engagement Analytics Component
 */
export default function EngagementAnalytics({ isMobile, width }) {
  const [readerBehavior, setReaderBehavior] = useState(null);
  const [contentLifecycle, setContentLifecycle] = useState(null);
  const [audienceGrowth, setAudienceGrowth] = useState(null);
  const [engagementQuality, setEngagementQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementAnalytics();
  }, []);

  const fetchEngagementAnalytics = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching engagement analytics...');
      
      // Fetch all engagement analytics data
      const [readerRes, lifecycleRes, audienceRes, qualityRes] = await Promise.all([
        apiClient.get('/engagement-analytics/reader-behavior?period=30'),
        apiClient.get('/engagement-analytics/content-lifecycle?period=90'),
        apiClient.get('/engagement-analytics/audience-growth?period=30'),
        apiClient.get('/engagement-analytics/engagement-quality?period=30')
      ]);

      console.log('📊 Reader Behavior Response:', readerRes.data);
      console.log('📊 Content Lifecycle Response:', lifecycleRes.data);
      console.log('📊 Audience Growth Response:', audienceRes.data);
      console.log('📊 Engagement Quality Response:', qualityRes.data);

      setReaderBehavior(readerRes.data?.data || []);
      setContentLifecycle(lifecycleRes.data?.data || []);
      setAudienceGrowth(audienceRes.data?.data || []);
      setEngagementQuality(qualityRes.data?.data || []);

      console.log('✅ Analytics data loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching engagement analytics:', error);
      console.error('Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const chartWidth = isMobile ? width - 48 : width - 370;

  console.log('📈 EngagementAnalytics render state:', {
    loading,
    readerBehaviorCount: readerBehavior?.length || 0,
    contentLifecycleCount: contentLifecycle?.length || 0,
    audienceGrowthCount: audienceGrowth?.length || 0,
    engagementQualityCount: engagementQuality?.length || 0
  });

  return (
    <View>
      {/* Reader Behavior Heatmap */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Reader Behavior Patterns (Peak Hours)</Text>
        <Text style={styles.chartDescription}>
          Shows when readers are most active. Red = peak hours, Green = low activity
        </Text>
        <ReaderBehaviorHeatmap data={readerBehavior} width={chartWidth} height={250} />
      </View>

      {/* Content Lifecycle */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Content Lifecycle (Decay Rates)</Text>
        <Text style={styles.chartDescription}>
          How quickly article views decline after publication by genre
        </Text>
        <ContentLifecycleChart data={contentLifecycle} width={chartWidth} height={250} />
      </View>

      {/* Audience Growth */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Audience Growth Trends</Text>
        <Text style={styles.chartDescription}>
          Weekly unique visitor growth over the last 30 days
        </Text>
        <AudienceGrowthChart data={audienceGrowth} width={chartWidth} height={250} />
      </View>

      {/* Engagement Quality */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Engagement Quality by Genre</Text>
        <Text style={styles.chartDescription}>
          Average reaction rate (reactions/views %) by content genre
        </Text>
        <EngagementQualityChart data={engagementQuality} width={chartWidth} height={250} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  chartDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
});
