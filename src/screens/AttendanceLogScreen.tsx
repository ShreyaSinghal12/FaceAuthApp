import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

interface Props {
  onBack: () => void;
}

interface LogEntry {
  id: number;
  user_id: string;
  name: string;
  timestamp: number;
  synced: number;
}

export default function AttendanceLogScreen({ onBack }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    try {
      const records = await DatabaseService.getAttendanceLogs();
      setLogs(records);
    } catch (error) {
      console.log('Error loading logs:', error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={styles.logCard}>
      <View style={styles.logLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.logName}>{item.name}</Text>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      <View style={[
        styles.syncBadge,
        item.synced ? styles.synced : styles.pending,
      ]}>
        <Text style={[
          styles.syncText,
          item.synced ? styles.syncedText : styles.pendingText,
        ]}>
          {item.synced ? 'Synced' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Log</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{logs.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {logs.filter(l => l.synced).length}
          </Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {logs.filter(l => !l.synced).length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No attendance records yet</Text>
          <Text style={styles.emptySubtext}>
            Authenticate a user to create the first record
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1D9E75"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 50,
  },
  backText: {
    color: '#1D9E75',
    fontSize: 17,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D9E75',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logTime: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  syncBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  synced: {
    backgroundColor: '#0F3D2E',
  },
  pending: {
    backgroundColor: '#3D2E0F',
  },
  syncText: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncedText: {
    color: '#1D9E75',
  },
  pendingText: {
    color: '#E0A82E',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});