import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AttendanceGaugeProps {
  percentage: number;
  attended: number;
  conducted: number;
  onPressDetails?: () => void;
}

export const AttendanceGauge: React.FC<AttendanceGaugeProps> = ({
  percentage = 100,
  attended = 0,
  conducted = 0,
}) => {
  const isHealthy = percentage >= 75;
  const statusColor = isHealthy ? '#10b981' : percentage >= 65 ? '#f59e0b' : '#ef4444';
  const statusText = isHealthy ? 'Statutory Exam Eligible' : 'Attendance Shortage Risk';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.titleIcon}>📊</Text>
          <Text style={styles.title}>75% Statutory Attendance Health</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isHealthy ? '#ecfdf5' : '#fef2f2' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Text style={[styles.percentage, { color: statusColor }]}>
          {percentage.toFixed(1)}%
        </Text>
        <Text style={styles.ratio}>
          {attended} of {conducted} hours attended
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${Math.min(Math.max(percentage, 0), 100)}%`,
              backgroundColor: statusColor,
            }
          ]} 
        />
        {/* 75% Target Marker */}
        <View style={styles.targetMarker} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerAdvice}>
          {isHealthy 
            ? '✓ Academic standing is compliant with UBTER semester mandates.' 
            : '⚠️ Attend upcoming lectures consecutively to restore eligibility.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleIcon: {
    fontSize: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 10,
  },
  percentage: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  ratio: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetMarker: {
    position: 'absolute',
    left: '75%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#0f172a',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  footerAdvice: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
});

export default AttendanceGauge;
