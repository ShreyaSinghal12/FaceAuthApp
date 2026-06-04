import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface Props {
  onEnroll: () => void;
  onAttendance: (mode: 'checkin' | 'checkout') => void;
  pendingCount?: number;
  enrolledCount?: number;
  todayCount?: number;
}

export default function HomeScreen({
  onEnroll,
  onAttendance,
  pendingCount = 0,
  enrolledCount = 0,
  todayCount = 0,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>FaceAuth</Text>
            <Text style={styles.tagline}>Offline face recognition</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>⬡</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{enrolledCount}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{todayCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, styles.statAmber]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>ATTENDANCE</Text>

        {/* Check In / Check Out */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.attendanceCard, styles.checkInCard]}
            onPress={() => onAttendance('checkin')}
            activeOpacity={0.8}>
            <View style={[styles.iconCircle, styles.greenIconBg]}>
              <Text style={styles.iconGreen}>↑</Text>
            </View>
            <Text style={styles.attendanceTitle}>Check In</Text>
            <Text style={styles.attendanceSub}>Start of day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.attendanceCard, styles.checkOutCard]}
            onPress={() => onAttendance('checkout')}
            activeOpacity={0.8}>
            <View style={[styles.iconCircle, styles.amberIconBg]}>
              <Text style={styles.iconAmber}>↓</Text>
            </View>
            <Text style={styles.attendanceTitle}>Check Out</Text>
            <Text style={styles.attendanceSub}>End of day</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>MANAGE</Text>

        {/* Enroll */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={onEnroll}
          activeOpacity={0.8}>
          <View style={styles.featureRow}>
            <View style={[styles.iconCircle, styles.amberIconBg]}>
              <Text style={styles.iconAmber}>+</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.cardTitle}>Enroll worker</Text>
              <Text style={styles.cardSubtitle}>Register a new face</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

      </View>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>
          Offline · {pendingCount} pending sync
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { flex: 1, padding: 22, paddingTop: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  logo: { fontSize: 26, fontWeight: '700', color: '#F0F0F0', letterSpacing: 0.5 },
  tagline: { fontSize: 12, color: '#444444', marginTop: 3 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: { color: '#1D9E75', fontSize: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  statBox: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    borderWidth: 0.5,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '600', color: '#1D9E75' },
  statAmber: { color: '#D89B5C' },
  statLabel: { fontSize: 11, color: '#444444', marginTop: 4 },

  sectionLabel: {
    fontSize: 10,
    color: '#333333',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  row: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  attendanceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
  },
  checkInCard: { backgroundColor: '#071410', borderColor: '#0F3D2E' },
  checkOutCard: { backgroundColor: '#120A04', borderColor: '#3D2010' },
  attendanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
    marginTop: 10,
  },
  attendanceSub: { fontSize: 11, color: '#444444', marginTop: 2 },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenIconBg: { backgroundColor: '#071410', borderWidth: 0.5, borderColor: '#1D9E75' },
  amberIconBg: { backgroundColor: '#120A04', borderWidth: 0.5, borderColor: '#D89B5C' },
  iconGreen: { color: '#1D9E75', fontSize: 18, fontWeight: '600' },
  iconAmber: { color: '#D89B5C', fontSize: 18, fontWeight: '600' },

  featureCard: {
    backgroundColor: '#0F0F0F',
    borderWidth: 0.5,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureText: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#E0E0E0' },
  cardSubtitle: { fontSize: 12, color: '#444444', marginTop: 2 },
  chevron: { fontSize: 22, color: '#333333' },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#111111',
    backgroundColor: '#050505',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D9E75',
    marginRight: 8,
  },
  statusText: { fontSize: 12, color: '#333333' },
});