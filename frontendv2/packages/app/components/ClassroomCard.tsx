import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Classroom } from '@vidyaos/core';

interface ClassroomCardProps {
  classroom: Classroom;
  onPress?: () => void;
}

const THEME_GRADIENTS = [
  { bg: '#1e40af', accent: '#60a5fa', icon: '💻' }, // Blue - Tech / Programming
  { bg: '#065f46', accent: '#34d399', icon: '🌿' }, // Green - Environmental / Labs
  { bg: '#6b21a8', accent: '#c084fc', icon: '📐' }, // Purple - Math / Logic
  { bg: '#9a3412', accent: '#fb923c', icon: '⚡' }, // Orange - Electronics / Physics
  { bg: '#374151', accent: '#9ca3af', icon: '📚' }, // Dark - Projects / Core
];

export const ClassroomCard: React.FC<ClassroomCardProps> = ({ classroom, onPress }) => {
  const themeIndex = (classroom.id || 0) % THEME_GRADIENTS.length;
  const theme = THEME_GRADIENTS[themeIndex];

  return (
    <Pressable 
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Classroom: ${classroom.name}`}
    >
      {/* 1. Header Banner (Google Classroom style) */}
      <View style={[styles.banner, { backgroundColor: theme.bg }]}>
        <View style={styles.bannerGlow} />
        <View style={styles.bannerContent}>
          <View style={styles.codeRow}>
            <Text style={[styles.codeBadge, { color: theme.accent }]}>
              {classroom.subject_code || classroom.code || 'SUB-101'}
            </Text>
            <Text style={styles.bannerEmoji}>{theme.icon}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {classroom.name || 'Classroom Subject'}
          </Text>
          <Text style={styles.instructor}>
            {classroom.teacher_name || 'Department Faculty'}
          </Text>
        </View>
      </View>

      {/* 2. Body Details (Deadlines & Status) */}
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tasks Due</Text>
          <View style={styles.taskBadge}>
            <Text style={styles.taskCount}>
              {classroom.active_tasks_count !== undefined ? classroom.active_tasks_count : 0} active
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.enterText}>Enter Class →</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  banner: {
    height: 110,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bannerContent: {
    zIndex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codeBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerEmoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  instructor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  body: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  taskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  taskCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  enterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
});

export default ClassroomCard;
