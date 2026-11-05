// src/components/TrackPicker.tsx
// Bottom sheet for choosing the ambient sound. Used by the Home mini player and the Focus Zone.
import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TRACK_LIST, SoundTrack } from '../services/trackService';

export default function TrackPicker({
  visible,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedId: string;
  onSelect: (track: SoundTrack) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Ambient Sound</Text>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#2C3E35" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={TRACK_LIST}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? '#3B6B6E' : '#8A938F'}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.optionTitle}>{item.title}</Text>
                    <Text style={styles.optionArtist}>{item.artist}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#2C3E35' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, minHeight: 52 },
  optionSelected: { backgroundColor: '#F0F7F7' },
  optionTitle: { fontSize: 14, fontWeight: '600', color: '#2C3E35' },
  optionArtist: { fontSize: 12, color: '#526E70', marginTop: 2 },
});
