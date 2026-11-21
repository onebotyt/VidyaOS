import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { api, authStore, type Classroom, type User } from '@vidyaos/core';
import { AttendanceGauge } from '../components/AttendanceGauge';
import { ClassroomCard } from '../components/ClassroomCard';

interface HomeScreenProps {
  onNavigate: (route: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(authStore.getState().user);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const groupsRes = await api.get<{ data: Classroom[] }>('/teaching-groups/student/my-groups').catch(() => null);
      if (groupsRes?.data) {
        setClasses(groupsRes.data);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const name = user?.full_name || 'Student';
  const dept = user?.department_name || 'Information Technology';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Header Hero Greeting */}
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.greeting}>Good day, {name.split(' ')[0]} 👋</Text>
          <Text style={styles.cohort}>{dept} • Year 3, Sem 5</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>2026–27 Session</Text>
        </View>
      </View>

      {/* 2. Today's Timetable Up Next Strip */}
      <View style={styles.upNextCard}>
        <View style={styles.upNextTop}>
          <View style={styles.upNextIconWrap}>
            <Text style={styles.upNextIcon}>⏱️</Text>
          </View>
          <View style={styles.upNextTextWrap}>
            <Text style={styles.upNextTag}>SCHEDULE FREE</Text>
            <Text style={styles.upNextTitle}>No Lectures Scheduled Currently</Text>
            <Text style={styles.upNextSub}>Campus Library / Independent Study</Text>
          </View>
        </View>
        <Pressable 
          style={styles.routineBtn}
          onPress={() => onNavigate('routine')}
        >
          <Text style={styles.routineBtnText}>Full Routine →</Text>
        </Pressable>
      </View>

      {/* 3. 4-Touch Quick Action Dock */}
      <View style={styles.quickDock}>
        <Pressable style={styles.quickTile} onPress={() => onNavigate('classes')}>
          <View style={[styles.tileIconWrap, { backgroundColor: '#eff6ff' }]}>
            <Text style={styles.tileEmoji}>📚</Text>
          </View>
          <Text style={styles.tileLabel}>Classes</Text>
        </Pressable>

        <Pressable style={styles.quickTile} onPress={() => onNavigate('routine')}>
          <View style={[styles.tileIconWrap, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.tileEmoji}>⏱️</Text>
          </View>
          <Text style={styles.tileLabel}>Routine</Text>
        </Pressable>

        <Pressable style={styles.quickTile} onPress={() => onNavigate('classes')}>
          <View style={[styles.tileIconWrap, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.tileEmoji}>📝</Text>
          </View>
          <Text style={styles.tileLabel}>Classwork</Text>
        </Pressable>

        <Pressable style={styles.quickTile} onPress={() => onNavigate('settings')}>
          <View style={[styles.tileIconWrap, { backgroundColor: '#f5f3ff' }]}>
            <Text style={styles.tileEmoji}>⚙️</Text>
          </View>
          <Text style={styles.tileLabel}>Settings</Text>
        </Pressable>
      </View>

      {/* 4. 75% Attendance Health Cockpit */}
      <AttendanceGauge 
        percentage={100}
        attended={0}
        conducted={0}
      />

      {/* 5. Enrolled Classes Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Enrolled Classes</Text>
        <Pressable onPress={() => onNavigate('classes')}>
          <Text style={styles.sectionLink}>Classes Hub →</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
      ) : classes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No classes loaded yet. Check back soon.</Text>
        </View>
      ) : (
        classes.map(c => (
          <ClassroomCard 
            key={c.id} 
            classroom={c} 
            onPress={() => onNavigate('classes')}
          />
        ))
      )}
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
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  cohort: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  upNextCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 16,
  },
  upNextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  upNextIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextIcon: {
    fontSize: 20,
  },
  upNextTextWrap: {
    flex: 1,
  },
  upNextTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  upNextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  upNextSub: {
    fontSize: 12,
    color: '#64748b',
  },
  routineBtn: {
    alignSelf: 'flex-end',
  },
  routineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  quickDock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  tileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileEmoji: {
    fontSize: 18,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});

export default HomeScreen;
