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
  const pendingCount = classroom.active_tasks_count !== undefined ? classroom.active_tasks_count : 0;

  return (
    <Pressable 
      style={[styles.card, { backgroundColor: theme.bg }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Classroom: ${classroom.name}`}
    >
      {/* Google Classroom Atmospheric Ambient Shapes */}
      <View style={styles.ambientGlow} />
      <View style={[styles.ambientDeco, { borderColor: theme.accent }]} />

      {/* Top Header Row: Subject, Subtitle / Cohort, and 3-Dots Kebab */}
      <View style={styles.topHeader}>
        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>
            {classroom.name || classroom.subject_name || 'Classroom Subject'}
          </Text>
          <Text style={styles.cohortText} numberOfLines={1}>
            {classroom.subject_code ? `${classroom.subject_code} • IT 3rd year` : 'IT 3rd year'}
          </Text>
        </View>

        <Pressable 
          style={styles.kebabBtn}
          onPress={(e) => {
            e.stopPropagation();
            alert(`Classroom: ${classroom.name}`);
          }}
          accessibilityLabel="Options"
        >
          <Text style={styles.kebabText}>⋮</Text>
        </Pressable>
      </View>

      {/* Bottom Footer Row: Teacher Name and Tasks Indicator */}
      <View style={styles.bottomFooter}>
        <Text style={styles.instructor} numberOfLines={1}>
          {classroom.teacher_name || 'Rajnish Singh Bhutani'}
        </Text>

        {pendingCount > 0 && (
          <View style={[styles.taskChip, { backgroundColor: theme.accent }]}>
            <Text style={styles.taskChipText}>{pendingCount} due</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  ambientGlow: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ambientDeco: {
    position: 'absolute',
    right: 25,
    top: -15,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    opacity: 0.25,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  cohortText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 4,
  },
  kebabBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  kebabText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 20,
  },
  bottomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  instructor: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
    flex: 1,
  },
  taskChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  taskChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0b1b4d',
    textTransform: 'uppercase',
  },
});

export default ClassroomCard;
