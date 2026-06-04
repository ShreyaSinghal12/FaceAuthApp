import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

interface Props {
  userId: string;
  mode: 'checkin' | 'checkout';
  justMarked: 'checkin' | 'checkout' | 'already_in' | 'not_in' | null;
  onDone: () => void;
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function AttendanceDashboard({ userId, justMarked, onDone }: Props) {
  const cleanName = userId.replace(/\(.*\)/, '').trim();

  const [now, setNow] = useState(new Date());
  const [todayRec, setTodayRec] = useState<any | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [monthData, setMonthData] = useState<Record<string, any>>({});

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadToday = async () => {
    const rec = await DatabaseService.getTodayRecord(userId);
    setTodayRec(rec);
  };

  const loadMonth = async (y: number, m: number) => {
    const data = await DatabaseService.getMonthAttendance(userId, y, m);
    setMonthData(data);
  };

  useEffect(() => {
    loadToday();
  }, [justMarked]);

  useEffect(() => {
    loadMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth, justMarked]);

  const fmtTime = (ts: number | null | undefined): string => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const fmtClock = (): string => {
    return now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  };

  const fmtDateHeader = (): string => {
    return now.toLocaleDateString('en-IN', {
      weekday: 'long', day: '2-digit', month: 'short',
    }).toUpperCase();
  };

  const isCheckedIn = todayRec && !todayRec.check_out;
  const isDoneToday = todayRec && todayRec.check_out;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayKey = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dayStatus = (d: number): 'present' | 'absent' | 'today' | 'upcoming' => {
    const key = dayKey(d);
    const cellDate = new Date(viewYear, viewMonth, d);
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);

    if (key === todayStr) return 'today';
    if (monthData[key]) return 'present';
    if (cellDate < todayDate) return 'absent';
    return 'upcoming';
  };

  // Status message after marking
  const banner = (() => {
    if (justMarked === 'checkin') return { text: 'Checked In', sub: 'Have a productive day', color: '#5DAE8B' };
    if (justMarked === 'checkout') return { text: 'Checked Out', sub: 'See you tomorrow', color: '#D89B5C' };
    if (justMarked === 'already_in') return { text: 'Already Checked In', sub: 'You checked in earlier today', color: '#D89B5C' };
    if (justMarked === 'not_in') return { text: 'Not Checked In', sub: 'Check in first before checking out', color: '#9E4A3C' };
    return null;
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onDone}>
          <Text style={styles.back}>‹ Done</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{cleanName}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Result banner */}
        {banner && (
          <View style={[styles.resultBanner, { borderColor: banner.color }]}>
            <Text style={[styles.resultText, { color: banner.color }]}>{banner.text}</Text>
            <Text style={styles.resultSub}>{banner.sub}</Text>
          </View>
        )}

        {/* Clock + status */}
        <View style={styles.clockCard}>
          <View>
            <Text style={styles.dateLabel}>{fmtDateHeader()}</Text>
            <Text style={styles.clock}>{fmtClock()}</Text>
          </View>
          <View style={[
            styles.statusPill,
            isCheckedIn ? styles.pillIn : isDoneToday ? styles.pillDone : styles.pillNone,
          ]}>
            <Text style={[
              styles.statusText,
              { color: isCheckedIn ? '#5DAE8B' : isDoneToday ? '#D89B5C' : '#8B847C' },
            ]}>
              {isCheckedIn ? 'Checked In' : isDoneToday ? 'Done' : 'Not In'}
            </Text>
          </View>
        </View>

        {/* Today's in/out */}
        <View style={styles.inOutRow}>
          <View style={[styles.inOutBox, styles.inBox]}>
            <Text style={styles.inOutLabel}>CHECK IN</Text>
            <Text style={[styles.inOutTime, { color: '#5DAE8B' }]}>
              {fmtTime(todayRec?.check_in)}
            </Text>
          </View>
          <View style={[styles.inOutBox, styles.outBox]}>
            <Text style={styles.inOutLabel}>CHECK OUT</Text>
            <Text style={[styles.inOutTime, { color: '#D89B5C' }]}>
              {fmtTime(todayRec?.check_out)}
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <Text style={styles.calMonth}>{MONTHS[viewMonth]} {viewYear}</Text>
            <View style={styles.calNav}>
              <TouchableOpacity onPress={prevMonth}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextMonth}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekRow}>
            {DAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (d === null) return <View key={i} style={styles.cell} />;
              const status = dayStatus(d);
              return (
                <View key={i} style={styles.cell}>
                  <View style={[
                    styles.dayBox,
                    status === 'present' && styles.presentDay,
                    status === 'absent' && styles.absentDay,
                    status === 'today' && styles.todayDay,
                  ]}>
                    <Text style={[
                      styles.dayText,
                      status === 'present' && styles.presentText,
                      status === 'absent' && styles.absentText,
                      status === 'today' && styles.todayText,
                      status === 'upcoming' && styles.upcomingText,
                    ]}>{d}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            <Text style={styles.legendItem}><Text style={{ color: '#5DAE8B' }}>●</Text> Present</Text>
            <Text style={styles.legendItem}><Text style={{ color: '#9E4A3C' }}>●</Text> Absent</Text>
            <Text style={styles.legendItem}><Text style={{ color: '#5A544C' }}>●</Text> Upcoming</Text>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 8,
  },
  back: { color: '#C8703C', fontSize: 16, width: 50 },
  title: { fontSize: 18, fontWeight: '600', color: '#F7F4F0' },
  scroll: { padding: 22, paddingTop: 12 },
  resultBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#262321',
  },
  resultText: { fontSize: 17, fontWeight: '700' },
  resultSub: { fontSize: 12, color: '#8B847C', marginTop: 3 },
  clockCard: {
    backgroundColor: '#262321',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateLabel: { fontSize: 10, color: '#8B847C', letterSpacing: 1 },
  clock: { fontSize: 28, fontWeight: '700', color: '#F7F4F0', marginTop: 4 },
  statusPill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  pillIn: { backgroundColor: '#1E2620', borderColor: '#2C4438' },
  pillDone: { backgroundColor: '#2A1A0E', borderColor: '#4A3220' },
  pillNone: { backgroundColor: '#262321', borderColor: '#3A352F' },
  statusText: { fontSize: 13, fontWeight: '600' },
  inOutRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inOutBox: { flex: 1, borderRadius: 14, padding: 16, borderWidth: 1 },
  inBox: { backgroundColor: '#1E2620', borderColor: '#2C4438' },
  outBox: { backgroundColor: '#2A1A0E', borderColor: '#4A3220' },
  inOutLabel: { fontSize: 10, color: '#8B847C', letterSpacing: 1 },
  inOutTime: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  calCard: { backgroundColor: '#262321', borderRadius: 16, padding: 16 },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calMonth: { fontSize: 15, fontWeight: '600', color: '#F7F4F0' },
  calNav: { flexDirection: 'row', gap: 18 },
  navArrow: { fontSize: 22, color: '#8B847C' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 9, color: '#6B645C' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  dayBox: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presentDay: { backgroundColor: '#5DAE8B' },
  absentDay: { backgroundColor: '#9E4A3C' },
  todayDay: { borderWidth: 2, borderColor: '#C8703C' },
  dayText: { fontSize: 12 },
  presentText: { color: '#15201A', fontWeight: '700' },
  absentText: { color: '#fff' },
  todayText: { color: '#F7F4F0', fontWeight: '700' },
  upcomingText: { color: '#5A544C' },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3A352F',
  },
  legendItem: { fontSize: 10, color: '#8B847C' },
});