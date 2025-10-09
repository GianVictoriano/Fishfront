import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const [highlights, setHighlights] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [grouped, setGrouped] = useState({});
  const [activeArticle, setActiveArticle] = useState(null); // { title, articleId }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@highlights');
        const parsed = raw ? JSON.parse(raw) : [];
        if (mounted) setHighlights(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.warn('Failed to load highlights', e);
      }
    })();
    return () => (mounted = false);
  }, []);

  // regroup whenever highlights change
  useEffect(() => {
    const g = (highlights || []).reduce((acc, h) => {
      const key = `${h.articleId || 'unknown'}::${h.title || 'Untitled'}`;
      acc[key] = acc[key] || { articleId: h.articleId, title: h.title, items: [] };
      acc[key].items.push(h);
      return acc;
    }, {});
    setGrouped(g);
  }, [highlights]);

  // helper to persist highlights
  const persistHighlights = async (next) => {
    try {
      await AsyncStorage.setItem('@highlights', JSON.stringify(next));
      setHighlights(next);
    } catch (e) {
      console.warn('Failed to save highlights', e);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete highlight', 'Are you sure you want to delete this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const next = highlights.filter((h) => h.id !== id);
        await persistHighlights(next);
      } },
    ]);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingText(item.text || '');
  };

  const saveEdit = async () => {
    const next = highlights.map((h) => (h.id === editingId ? { ...h, text: editingText } : h));
    await persistHighlights(next);
    setEditingId(null);
    setEditingText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Saved highlights by article</Text>

      <View style={styles.containerBox}>
        {Object.keys(grouped).length === 0 ? (
          <Text style={{ color: '#666' }}>No highlights yet. Highlight text in Read More to save here.</Text>
        ) : (
          <ScrollView>
            {Object.values(grouped).map((g) => (
              <TouchableOpacity key={`${g.articleId}-${g.title}`} style={styles.groupCard} onPress={() => setActiveArticle({ articleId: g.articleId, title: g.title })}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                <Text style={styles.groupMeta}>{g.items.length} highlight{g.items.length > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Modal: show highlights for selected article */}
      <Modal visible={!!activeArticle} animationType="slide">
        <View style={styles.container}>
          <TouchableOpacity onPress={() => setActiveArticle(null)} style={{ marginBottom: 12 }}>
            <Text style={{ color: '#007AFF' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{activeArticle?.title}</Text>
          <FlatList
            data={(highlights || []).filter((h) => h.articleId === (activeArticle?.articleId))}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.item}>
                {editingId === item.id ? (
                  <View>
                    <TextInput
                      value={editingText}
                      onChangeText={setEditingText}
                      multiline
                      style={styles.editInput}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity onPress={saveEdit} style={styles.actionButton}>
                        <Text style={styles.actionText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setEditingId(null); setEditingText(''); }} style={[styles.actionButton, { backgroundColor: '#ddd' }]}>
                        <Text style={[styles.actionText, { color: '#333' }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.itemText}>{item.text}</Text>
                    <Text style={styles.itemMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionButton}>
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}>
                        <Text style={[styles.actionText, { color: 'white' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: '#666' }}>No highlights for this article.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 12 },
  item: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 },
  itemTitle: { fontWeight: '700', marginBottom: 6 },
  itemText: { fontSize: 16, marginBottom: 6 },
  itemMeta: { color: '#999', fontSize: 12 },
  containerBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  groupCard: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fafafa', marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  groupTitle: { fontWeight: '700', fontSize: 16 },
  groupMeta: { color: '#666', marginTop: 4 },
  editInput: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, minHeight: 60 },
  actionButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  actionText: { color: 'white', fontWeight: '700' },
});
