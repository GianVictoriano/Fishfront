import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SelectableText = ({ 
  content, 
  highlights, 
  onTextSelect, 
  style 
}) => {
  const [selection, setSelection] = useState({ start: -1, end: -1 });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  
  const handleTextPress = (event) => {
    // This is a simplified version - in a real implementation,
    // you would need to calculate the actual text position
    // For now, we'll simulate text selection
    const words = content.split(' ');
    const randomStart = Math.floor(Math.random() * Math.max(0, words.length - 5));
    const randomEnd = Math.min(randomStart + Math.floor(Math.random() * 5) + 1, words.length);
    
    const startIndex = content.indexOf(words.slice(randomStart, randomEnd).join(' '));
    const endIndex = startIndex + words.slice(randomStart, randomEnd).join(' ').length;
    
    const text = content.substring(startIndex, endIndex);
    
    if (text.trim().length > 0) {
      setSelectedText(text);
      setSelection({ start: startIndex, end: endIndex });
      setModalVisible(true);
    }
  };
  
  const handleAddComment = () => {
    if (selection.start !== -1 && selectedText.trim()) {
      onTextSelect({
        start: selection.start,
        end: selection.end,
        text: selectedText
      });
      setModalVisible(false);
      setSelection({ start: -1, end: -1 });
      setSelectedText('');
    }
  };
  
  const renderHighlightedContent = () => {
    if (!content || highlights.length === 0) {
      return (
        <Text style={style} onPress={handleTextPress}>
          {content}
        </Text>
      );
    }
    
    const elements = [];
    let lastIndex = 0;
    
    // Sort highlights by start index
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
    
    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        elements.push(
          <Text key={`text-${index}`} style={style} onPress={handleTextPress}>
            {content.substring(lastIndex, highlight.start)}
          </Text>
        );
      }
      
      // Add highlighted text
      elements.push(
        <View key={`highlight-${index}`} style={[highlight.containerStyle, { backgroundColor: highlight.color }]}>
          <Text style={highlight.textStyle}>
            {content.substring(highlight.start, highlight.end)}
          </Text>
          <View style={highlight.badgeStyle}>
            <Text style={highlight.badgeTextStyle}>{highlight.user}</Text>
          </View>
        </View>
      );
      
      lastIndex = highlight.end;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <Text key="text-final" style={style} onPress={handleTextPress}>
          {content.substring(lastIndex)}
        </Text>
      );
    }
    
    return elements;
  };
  
  return (
    <>
      <TouchableOpacity onPress={handleTextPress}>
        {renderHighlightedContent()}
      </TouchableOpacity>
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Feather name="message-circle" size={24} color="#1a237e" />
              <Text style={modalStyles.title}>Add Comment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={modalStyles.content}>
              <Text style={modalStyles.label}>Selected Text:</Text>
              <View style={modalStyles.selectedTextContainer}>
                <Text style={modalStyles.selectedText}>
                  "{selectedText}"
                </Text>
              </View>
              
              <Text style={modalStyles.label}>Your Comment:</Text>
              <TextInput
                style={modalStyles.input}
                multiline
                numberOfLines={4}
                placeholder="Enter your comment here..."
                onChangeText={(text) => {
                  // Store comment text in parent component
                }}
                textAlignVertical="top"
              />
            </View>
            
            <View style={modalStyles.footer}>
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.saveButton}
                onPress={handleAddComment}
              >
                <Feather name="save" size={16} color="#fff" style={{marginRight: 6}} />
                <Text style={modalStyles.saveText}>Save Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const modalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectedTextContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  selectedText: {
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
};

export default SelectableText;
