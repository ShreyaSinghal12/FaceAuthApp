import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { SyncService } from '../services/SyncService';

interface Props {
  onBack: () => void;
}

interface Person {
  userId: string;
  enrolledAt: number;
  dayCount: number;
}

interface DayRecord {
  date: string;
  check_in: number;
  check_out: number | null;
  synced: number;
}

export default function AttendanceLogScreen({ onBack }: Props) {
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const cleanName = (id: string) => id.replace(/\(.*\)/, '').trim();

  const loadPeople = async () => {
    const users = await DatabaseService.getEnrolledUsers();
    const withCounts: Person[] = [];
    for (const u of users) {
      const count = await DatabaseService.getAttendanceCount(u.userId);
      withCounts.push({ userId: u.userId, enrolledAt: u.enrolledAt, dayCount: count });
    }
    setPeople(withCounts);
    setPendingCount(await DatabaseService.getUnsyncedCount());
  };

  const loadRecords = async (userId: string) => {
    const recs = await DatabaseService.getAttendanceForUser(userId);
    setRecords(recs);
    setSelected(userId);
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await DatabaseService.syncAll();
    await loadPeople();
    setSyncing(false);
  };

  const getInitials = (name: string): string => {
    const parts = cleanName(name).split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return cleanName(name).substring(0, 2).toUpperCase();
  };

  const fmtTime = (ts: number | null): string => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const avatarColors = ['#3A2B22', '#2E2A3A', '#22302A', '#322A22'];
  const textColors = ['#C8703C', '#A88BC8', '#5DAE8B', '#D89B5C'];

  // ===== PERSON DETAIL VIEW =====
  if (selected) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{cleanName(selected)}</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{records.length}</Text>
          <Text style={styles.summaryLabel}>days present</Text>
        </View>

        {records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No attendance yet</Text>
            <Text style={styles.emptySub}>This person hasn't checked in</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.dayCard}>
                <View style={styles.dayLeft}>
                  <View style={styles.dayDot} />
                  <Text style={styles.dayDate}>{fmtDate(item.date)}</Text>
                </View>
                <View style={styles.timesRow}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>IN</Text>
                    <Text style={styles.timeValue}>{fmtTime(item.check_in)}</Text>
                  </View>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>OUT</Text>
                    <Text style={styles.timeValue}>{fmtTime(item.check_out)}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ===== PEOPLE LIST VIEW =====
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Records</Text>
        {pendingCount > 0 ? (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{pendingCount} pending</Text>
          </View>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSync}
        disabled={syncing || pendingCount === 0}>
        <Text style={styles.syncText}>
          {syncing ? 'Syncing...' : 'Sync to server'}
        </Text>
      </TouchableOpacity>

      {people.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No one enrolled yet</Text>
          <Text style={styles.emptySub}>Enroll a worker to begin</Text>
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.personCard}
              onPress={() => loadRecords(item.userId)}
              activeOpacity={0.8}>
              <View style={[styles.avatar, { backgroundColor: avatarColors[index % 4] }]}>
                <Text style={[styles.avatarText, { color: textColors[index % 4] }]}>
                  {getInitials(item.userId)}
                </Text>
              </View>
              <View style={styles.personContent}>
                <Text style={styles.personName}>{cleanName(item.userId)}</Text>
                <Text style={styles.personDays}>
                  {item.dayCount} day{item.dayCount !== 1 ? 's' : ''} present
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1A19', paddingTop: 55 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  back: { color: '#C8703C', fontSize: 16, width: 50 },
  title: { fontSize: 18, fontWeight: '600', color: '#F7F4F0' },
  headerBadge: {
    backgroundColor: '#C8703C',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 11, color: '#412402', fontWeight: '600' },
  syncButton: {
    backgroundColor: '#262321',
    borderWidth: 1,
    borderColor: '#3A352F',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 22,
    marginBottom: 16,
  },
  syncText: { color: '#C8703C', fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 22, paddingBottom: 22 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262321',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600' },
  personContent: { flex: 1, marginLeft: 14 },
  personName: { fontSize: 15, fontWeight: '500', color: '#F7F4F0' },
  personDays: { fontSize: 12, color: '#8B847C', marginTop: 2 },
  chevron: { fontSize: 24, color: '#5A544C' },
  summaryCard: {
    backgroundColor: '#262321',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 22,
    marginBottom: 16,
  },
  summaryNumber: { fontSize: 34, fontWeight: '700', color: '#C8703C' },
  summaryLabel: { fontSize: 13, color: '#8B847C', marginTop: 2 },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262321',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5DAE8B',
  },
  dayDate: { fontSize: 14, fontWeight: '500', color: '#F7F4F0' },
  timesRow: { flexDirection: 'row', gap: 16 },
  timeBox: { alignItems: 'center' },
  timeLabel: { fontSize: 9, color: '#6B645C', letterSpacing: 1 },
  timeValue: { fontSize: 13, color: '#C8B8A8', marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: '#F7F4F0', fontSize: 17, fontWeight: '500' },
  emptySub: { color: '#6B645C', fontSize: 13, textAlign: 'center' },
});