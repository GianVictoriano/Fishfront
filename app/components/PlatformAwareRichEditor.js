import React, { useState, useEffect, forwardRef } from 'react';
import { View, Platform, StyleSheet } from 'react-native';

// Placeholder component while the real editor is loading on the web.
const EditorPlaceholder = () => (
  <View style={styles.placeholder} />
);

let RichEditor;
let RichToolbar;
let actions;

// For native platforms, we can import the library directly.
if (Platform.OS !== 'web') {
  try {
    const editorModule = require('react-native-pell-rich-editor');
    RichEditor = editorModule.RichEditor;
    RichToolbar = editorModule.RichToolbar;
    actions = editorModule.actions;
  } catch (e) {
    console.error('Failed to load react-native-pell-rich-editor on native', e);
  }
}

const PlatformAwareRichEditor = forwardRef((props, ref) => {
  const [Editor, setEditor] = useState(Platform.OS === 'web' ? null : RichEditor);

  useEffect(() => {
    // For web, dynamically import the editor on the client-side after mounting.
    if (Platform.OS === 'web' && !Editor) {
      import('react-native-pell-rich-editor')
        .then(module => {
          setEditor(() => module.RichEditor); // Use a function to set state to ensure it's the component class
        })
        .catch(err => {
          console.error('Failed to dynamically load RichEditor on web:', err);
        });
    }
  }, [Editor]);

  // Render a placeholder on the web until the editor is loaded.
  if (!Editor) {
    return <EditorPlaceholder />;
  }

  return <Editor ref={ref} {...props} />;
});

const PlatformAwareRichToolbar = ({ editor, ...props }) => {
  const [Toolbar, setToolbar] = useState(Platform.OS === 'web' ? null : RichToolbar);
  const [editorActions, setEditorActions] = useState(Platform.OS === 'web' ? null : actions);

  useEffect(() => {
    if (Platform.OS === 'web' && !Toolbar) {
      import('react-native-pell-rich-editor')
        .then(module => {
          setToolbar(() => module.RichToolbar);
          setEditorActions(module.actions);
        })
        .catch(err => {
          console.error('Failed to dynamically load RichToolbar on web:', err);
        });
    }
  }, [Toolbar]);

  if (Platform.OS === 'web' && (!Toolbar || !editorActions)) {
    return null; // Don't render toolbar on web until it's loaded
  }

  // The toolbar is not needed on the web, so we'll conditionally render it only for native.
  if (Platform.OS === 'web') {
    return null;
  }

  return <Toolbar editor={editor} actions={Object.values(editorActions)} {...props} />;
};

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
});

export { PlatformAwareRichEditor, PlatformAwareRichToolbar };
