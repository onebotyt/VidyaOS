import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { api, type Classroom } from '@vidyaos/core';
import { ClassroomCard } from '../components/ClassroomCard';

interface ClassesScreenProps {
  onNavigate: (route: string) => void;
}

export const ClassesScreen: React.FC<ClassesScreenProps> = () => {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await api.get<{ data: Classroom[] }>('/teaching-groups/student/my-groups').catch(() => null);
      if (res?.data) {
        setClasses(res.data);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      setErrorMsg('Please enter a 6-character class code');
      return;
    }
    setJoining(true);
    setErrorMsg('');

    try {
      await api.post('/teaching-groups/join', { code: classCode.trim() });
      setJoinModalOpen(false);
      setClassCode('');
      loadClasses();
    } catch (e: any) {
      setErrorMsg(e.message || 'Invalid or expired classroom code');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Action Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.heading}>Enrolled Classes</Text>
          <Text style={styles.subheading}>{classes.length} active academic subjects</Text>
        </View>
        <Pressable 
          style={styles.joinBtn} 
          onPress={() => setJoinModalOpen(true)}
          accessibilityLabel="Join Class"
        >
          <Text style={styles.joinBtnText}>+ Join Class</Text>
        </Pressable>
      </View>

      {/* Classroom Cards Grid */}
      {loading ? (
        <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 32 }} />
      ) : classes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>No Enrolled Classes</Text>
          <Text style={styles.emptySub}>Ask your department teacher for the 6-character class code to enroll.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setJoinModalOpen(true)}>
            <Text style={styles.primaryBtnText}>Join Your First Class</Text>
          </Pressable>
        </View>
      ) : (
        classes.map(c => (
          <ClassroomCard 
            key={c.id} 
            classroom={c} 
            onPress={() => {}}
          />
        ))
      )}

      {/* MODAL: Join Class by Code */}
      <Modal
        visible={joinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Classroom</Text>
            <Text style={styles.modalDesc}>
              Enter the 6-character code provided by your instructor to join the course.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. AB12CD"
              placeholderTextColor="#94a3b8"
              value={classCode}
              onChangeText={setClassCode}
              autoCapitalize="characters"
              maxLength={8}
            />

            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable 
                style={styles.cancelBtn} 
                onPress={() => setJoinModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable 
                style={styles.submitBtn} 
                onPress={handleJoinClass}
                disabled={joining}
              >
                <Text style={styles.submitBtnText}>
                  {joining ? 'Joining...' : 'Join Class'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ClassesScreen;
