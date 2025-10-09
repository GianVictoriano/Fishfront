import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function UserDetail() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>User Detail</Text>
			<Text style={styles.message}>This page is under construction.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
	title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
	message: { fontSize: 16, color: '#666' },
});
