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
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>FaceAuth</Text>
            <Text style={styles.tagline}>Offline face recognition</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>◉</Text>
          </View>
        </View>

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
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>ATTENDANCE</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.attendanceCard, styles.checkInCard]}
            onPress={() => onAttendance('checkin')}
            activeOpacity={0.8}>
            <View style={[styles.iconCircle, styles.greenBg]}>
              <Text style={styles.iconDark}>↓</Text>
            </View>
            <Text style={styles.attendanceTitle}>Check In</Text>
            <Text style={styles.attendanceSub}>Start of day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.attendanceCard, styles.checkOutCard]}
            onPress={() => onAttendance('checkout')}
            activeOpacity={0.8}>
            <View style={[styles.iconCircle, styles.amberBg]}>
              <Text style={styles.iconDark}>↑</Text>
            </View>
            <Text style={styles.attendanceTitle}>Check Out</Text>
            <Text style={styles.attendanceSub}>End of day</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>MANAGE</Text>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={onEnroll}
          activeOpacity={0.8}>
          <View style={styles.featureRow}>
            <View style={[styles.iconCircle, styles.coralBg]}>
              <Text style={styles.iconWhite}>＋</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.cardTitle}>Enroll worker</Text>
              <Text style={styles.cardSubtitle}>Register a new face</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

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
  container: { flex: 1, backgroundColor: '#1C1A19' },
  content: { flex: 1, padding: 22, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  logo: { fontSize: 26, fontWeight: '700', color: '#F7F4F0' },
  tagline: { fontSize: 13, color: '#8B847C', marginTop: 3 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#C8703C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: { color: '#C8703C', fontSize: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: {
    flex: 1,
    backgroundColor: '#262321',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statNumber: { fontSize: 26, fontWeight: '700', color: '#C8703C' },
  statLabel: { fontSize: 12, color: '#8B847C', marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    color: '#6B645C',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  attendanceCard: { flex: 1, borderRadius: 18, padding: 18, borderWidth: 1 },
  checkInCard: { backgroundColor: '#1E2620', borderColor: '#2C4438' },
  checkOutCard: { backgroundColor: '#2A1A0E', borderColor: '#4A3220' },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F7F4F0',
    marginTop: 12,
  },
  attendanceSub: { fontSize: 12, color: '#8B847C', marginTop: 3 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenBg: { backgroundColor: '#5DAE8B' },
  amberBg: { backgroundColor: '#D89B5C' },
  coralBg: { backgroundColor: '#C8703C' },
  iconWhite: { color: '#fff', fontSize: 22, fontWeight: '600' },
  iconDark: { color: '#15201A', fontSize: 24, fontWeight: '700' },
  featureCard: {
    backgroundColor: '#262321',
    borderRadius: 18,
    padding: 18,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureText: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#F7F4F0' },
  cardSubtitle: { fontSize: 13, color: '#8B847C', marginTop: 3 },
  chevron: { fontSize: 26, color: '#5A544C' },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2724',
    backgroundColor: '#161413',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C8703C',
    marginRight: 8,
  },
  statusText: { fontSize: 13, color: '#8B847C' },
});