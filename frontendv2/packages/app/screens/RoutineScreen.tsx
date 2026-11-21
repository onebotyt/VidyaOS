import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Period {
  period: number;
  time: string;
  subject: string;
  code: string;
  room: string;
  teacher: string;
}

const SAMPLE_ROUTINE: Record<string, Period[]> = {
  Monday: [
    { period: 1, time: '10:00 - 10:55', subject: 'Android Development', code: '055004', room: 'Lab 2', teacher: 'Rajnish Bhutani' },
    { period: 2, time: '10:55 - 11:50', subject: 'E-Commerce', code: '125001', room: 'Room 104', teacher: 'Rajnish Bhutani' },
    { period: 3, time: '12:10 - 01:05', subject: 'Minor Project', code: '125002', room: 'Block A', teacher: 'Rajesh Lohani' },
  ],
  Tuesday: [
    { period: 1, time: '10:00 - 10:55', subject: 'Cloud Computing', code: '055008', room: 'Room 102', teacher: 'Navneet Mishra' },
    { period: 2, time: '10:55 - 11:50', subject: 'Android Development', code: '055004', room: 'Lab 2', teacher: 'Rajnish Bhutani' },
  ],
  Wednesday: [
    { period: 1, time: '10:00 - 10:55', subject: 'E-Commerce', code: '125001', room: 'Room 104', teacher: 'Rajnish Bhutani' },
    { period: 2, time: '10:55 - 11:50', subject: 'Minor Project', code: '125002', room: 'Block A', teacher: 'Rajesh Lohani' },
  ],
  Thursday: [
    { period: 1, time: '10:00 - 10:55', subject: 'Android Development', code: '055004', room: 'Lab 2', teacher: 'Rajnish Bhutani' },
    { period: 2, time: '10:55 - 11:50', subject: 'Cloud Computing', code: '055008', room: 'Room 102', teacher: 'Navneet Mishra' },
  ],
  Friday: [
    { period: 1, time: '10:00 - 10:55', subject: 'E-Commerce', code: '125001', room: 'Room 104', teacher: 'Rajnish Bhutani' },
    { period: 2, time: '10:55 - 11:50', subject: 'Minor Project', code: '125002', room: 'Block A', teacher: 'Rajesh Lohani' },
  ],
  Saturday: [
    { period: 1, time: '10:00 - 12:00', subject: 'Remedial & Project Viva', code: '125002', room: 'Auditorium', teacher: 'All Faculty' },
  ],
};

export const RoutineScreen: React.FC = () => {
  const [activeDay, setActiveDay] = useState('Monday');
  const periods = SAMPLE_ROUTINE[activeDay] || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly Academic Routine</Text>
      <Text style={styles.subtitle}>Information Technology • Semester 5</Text>

      {/* Day Selector Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {DAYS.map(day => {
          const isSelected = activeDay === day;
          return (
            <Pressable
              key={day}
              style={[styles.dayPill, isSelected && styles.dayPillActive]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                {day.slice(0, 3)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Period Timeline List */}
      <View style={styles.timeline}>
        {periods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes scheduled for {activeDay}.</Text>
          </View>
        ) : (
          periods.map(p => (
            <View key={p.period} style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <View style={styles.periodBadge}>
                  <Text style={styles.periodBadgeText}>Period {p.period}</Text>
                </View>
                <Text style={styles.periodTime}>{p.time}</Text>
              </View>

              <Text style={styles.subjectName}>{p.subject}</Text>

              <View style={styles.periodFooter}>
                <Text style={styles.footerDetail}>📍 {p.room}</Text>
                <Text style={styles.footerDetail}>👨‍🏫 {p.teacher}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  dayScroll: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  dayPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  dayPillTextActive: {
    color: '#ffffff',
  },
  timeline: {
    gap: 12,
  },
  periodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 10,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  periodTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  periodFooter: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  footerDetail: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});

export default RoutineScreen;
