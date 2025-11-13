import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, PanResponder, Dimensions } from 'react-native';

const SelectableText = ({ 
  content, 
  highlights, 
  onTextSelect, 
  style 
}) => {
  const [selection, setSelection] = useState({ start: -1, end: -1 });
  const [isSelecting, setIsSelecting] = useState(false);
  const textLayout = useRef(null);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        const charPosition = getCharPositionFromTouch(evt.nativeEvent);
        if (charPosition !== -1) {
          setIsSelecting(true);
          setSelection({ start: charPosition, end: charPosition });
        }
      },
      
      onPanResponderMove: (evt) => {
        if (!isSelecting) return;
        
        const charPosition = getCharPositionFromTouch(evt.nativeEvent);
        if (charPosition !== -1) {
          setSelection(prev => ({
            start: Math.min(prev.start, charPosition),
            end: Math.max(prev.start, charPosition)
          }));
        }
      },
      
      onPanResponderRelease: (evt) => {
        if (!isSelecting) return;
        
        setIsSelecting(false);
        
        const start = Math.min(selection.start, selection.end);
        const end = Math.max(selection.start, selection.end);
        
        if (end > start && (end - start) > 3) {
          const selectedText = content.substring(start, end);
          onTextSelect({
            start,
            end,
            text: selectedText.trim()
          });
        }
        
        setSelection({ start: -1, end: -1 });
      }
    })
  ).current;
  
  const getCharPositionFromTouch = (event) => {
    // This is a simplified implementation
    // In a real app, you'd calculate the actual character position based on touch coordinates
    // For demo purposes, we'll return a random position within the text
    const textLength = content.length;
    if (textLength === 0) return -1;
    
    // Simulate touch position calculation
    const touchX = event.locationX;
    const touchY = event.locationY;
    const screenWidth = Dimensions.get('window').width;
    
    // Estimate character position based on touch coordinates
    const estimatedCharsPerLine = Math.floor(screenWidth / 8); // Rough estimate
    const estimatedLine = Math.floor(touchY / 20); // Rough line height estimate
    const estimatedCharInLine = Math.floor(touchX / 8);
    
    const estimatedPosition = (estimatedLine * estimatedCharsPerLine) + estimatedCharInLine;
    
    return Math.min(Math.max(0, estimatedPosition), textLength - 1);
  };
  
  const renderHighlightedContent = () => {
    if (!content) return null;
    
    const elements = [];
    let lastIndex = 0;
    
    // Combine permanent highlights and current selection
    const allHighlights = [...highlights];
    if (selection.start !== -1 && selection.end !== -1 && isSelecting) {
      allHighlights.push({
        id: 'current-selection',
        start: selection.start,
        end: selection.end,
        text: content.substring(selection.start, selection.end),
        comment: '',
        user: 'You',
        color: '#FEE2E2', // Light red for selection
        isTemporary: true
      });
    }
    
    // Sort highlights by start index
    const sortedHighlights = allHighlights.sort((a, b) => a.start - b.start);
    
    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        elements.push(
          <Text key={`text-${index}`} style={style}>
            {content.substring(lastIndex, highlight.start)}
          </Text>
        );
      }
      
      // Add highlighted text
      elements.push(
        <View key={`highlight-${index}`} style={[highlightStyles.container, { backgroundColor: highlight.color }]}>
          <Text style={highlightStyles.text}>
            {content.substring(highlight.start, highlight.end)}
          </Text>
          {!highlight.isTemporary && (
            <View style={highlightStyles.badge}>
              <Text style={highlightStyles.badgeText}>{highlight.user}</Text>
            </View>
          )}
        </View>
      );
      
      lastIndex = highlight.end;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <Text key="text-final" style={style}>
          {content.substring(lastIndex)}
        </Text>
      );
    }
    
    return elements;
  };
  
  return (
    <View {...panResponder.panHandlers} style={{ padding: 20 }}>
      {highlights.length > 0 || (selection.start !== -1 && selection.end !== -1) ? 
        renderHighlightedContent() : 
        <Text style={style}>{content}</Text>
      }
    </View>
  );
};

const highlightStyles = {
  container: {
    borderRadius: 4,
    padding: 2,
    marginVertical: 2,
    position: 'relative',
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1a237e',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
};

export default SelectableText;
