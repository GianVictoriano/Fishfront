import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

// Only import createPortal on web
let createPortal;
if (Platform.OS === 'web') {
  createPortal = require('react-dom').createPortal;
}

const WebDropdown = ({ isVisible, onClose, onLogout, isAdmin, router }) => {
  const [portalRoot, setPortalRoot] = useState(null);
  const dropdownRef = useRef(null);

  // Initialize portal root on mount (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let root = document.getElementById('portal-root');
    let created = false;
    
    if (!root) {
      root = document.createElement('div');
      root.id = 'portal-root';
      document.body.appendChild(root);
      created = true;
    }
    setPortalRoot(root);

    return () => {
      // Only attempt to remove if we're the ones who created it
      if (created && root && document.body.contains(root)) {
        try {
          document.body.removeChild(root);
        } catch (e) {
          console.warn('Error cleaning up portal root:', e);
        }
      }
    };
  }, []);

  // Handle clicks outside the dropdown
  useEffect(() => {
    if (Platform.OS !== 'web' || !isVisible) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Don't render if not visible, on native platforms, or if portal root isn't ready
  if (Platform.OS !== 'web' || !isVisible || !portalRoot) return null;
  
  // Ensure the portal root is still in the document
  if (portalRoot && !document.body.contains(portalRoot)) {
    return null;
  }

  const dropdownContent = (
    <div style={styles.overlay}>
      <div style={styles.dropdown} ref={dropdownRef}>
        <div 
          style={styles.item}
          onClick={() => {
            router.push('/profile');
            onClose();
          }}
        >
          <FontAwesome name="user" size={13} style={styles.icon} />
          <span style={styles.text}>Profile</span>
        </div>
        <div 
          style={styles.item}
          onClick={() => {
            router.push('/my-requests');
            onClose();
          }}
        >
          <FontAwesome name="list" size={13} style={styles.icon} />
          <span style={styles.text}>My Requests</span>
        </div>
        {isAdmin && (
          <div 
            style={styles.item}
            onClick={() => {
              router.push('/admin/branding');
              onClose();
            }}
          >
            <FontAwesome name="desktop" size={13} style={styles.icon} />
            <span style={styles.text}>Manage Website</span>
          </div>
        )}
        <div 
          style={styles.item}
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          <FontAwesome name="sign-out" size={13} style={styles.icon} />
          <span style={styles.text}>Logout</span>
        </div>
      </div>
    </div>
  );

  if (Platform.OS === 'web') {
    return createPortal(dropdownContent, portalRoot);
  }
  
  // Return null for native platforms (they'll use their own dropdown)
  return null;
};

const styles = Platform.OS === 'web' ? {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  dropdown: {
    position: 'absolute',
    right: 20,
    top: 60,
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '8px 0',
    minWidth: 200,
    zIndex: 9999,
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: 'pointer',
  },
  itemHover: {
    backgroundColor: '#f5f5f5',
  },
  icon: {
    marginRight: 10,
    color: '#555',
  },
  text: {
    fontSize: 13,
    color: '#333',
  },
} : {};

export default WebDropdown;
