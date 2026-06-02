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
import { SyncService } from '../services/SyncService';

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
  const [syncing, setSyncing] = useState(false);

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

  const handleSync = async () => {
    setSyncing(true);
    await SyncService.sync();
    await loadLogs();
    setSyncing(false);
  };

  const getInitials = (name: string): string => {
    const parts = name.replace(/\(.*\)/, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const time = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (isToday) return `Today ${time}`;
    return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${time}`;
  };

  const avatarColors = ['#3A2B22', '#2E2A3A', '#22302A', '#322A22'];
  const textColors = ['#C8703C', '#A88BC8', '#5DAE8B', '#D89B5C'];

  const pendingCount = logs.filter(l => !l.synced).length;

  const renderItem = ({ item, index }: { item: LogEntry; index: number }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: avatarColors[index % 4] }]}>
        <Text style={[styles.avatarText, { color: textColors[index % 4] }]}>
          {getInitials(item.name)}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.name.replace(/\(.*\)/, '').trim()}</Text>
        <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <View style={[styles.pill, item.synced ? styles.syncedPill : styles.pendingPill]}>
        <Text style={[styles.pillText, item.synced ? styles.syncedText : styles.pendingText]}>
          {item.synced ? 'synced' : 'pending'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Sync button */}
      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSync}
        disabled={syncing || pendingCount === 0}>
        <Text style={styles.syncText}>
          {syncing ? 'Syncing...' : '☁  Sync to server'}
        </Text>
      </TouchableOpacity>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>▤</Text>
          <Text style={styles.emptyText}>No records yet</Text>
          <Text style={styles.emptySub}>Mark attendance to create the first record</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8703C" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1A19',
    paddingTop: 55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  back: {
    color: '#C8703C',
    fontSize: 16,
    width: 50,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7F4F0',
  },
  headerBadge: {
    backgroundColor: '#C8703C',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    color: '#412402',
    fontWeight: '600',
  },
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
  syncText: {
    color: '#C8703C',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262321',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F7F4F0',
  },
  cardTime: {
    fontSize: 12,
    color: '#6B645C',
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pendingPill: {
    backgroundColor: '#C8703C',
  },
  syncedPill: {
    backgroundColor: '#5DAE8B',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pendingText: {
    color: '#412402',
  },
  syncedText: {
    color: '#15201A',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 50,
    color: '#3A352F',
  },
  emptyText: {
    color: '#F7F4F0',
    fontSize: 17,
    fontWeight: '500',
  },
  emptySub: {
    color: '#6B645C',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});