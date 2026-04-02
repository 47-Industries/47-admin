import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface TimeEntry {
  id: string
  clockIn: string
  clockOut: string | null
  duration: number | null
  breakMinutes: number
  status: string
  task: string | null
  teamMember: { id: string; name: string }
  project: { id: string; name: string; code: string | null; color: string } | null
  approvedBy: { id: string; name: string } | null
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function getWeekStart(offset = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function statusStyle(status: string): { bg: string; text: string } {
  if (status === 'ACTIVE') return { bg: '#16a34a20', text: '#4ade80' }
  if (status === 'COMPLETED') return { bg: '#2563eb20', text: '#60a5fa' }
  if (status === 'APPROVED') return { bg: '#059669 20', text: '#34d399' }
  if (status === 'EDITED') return { bg: '#ca8a0420', text: '#fbbf24' }
  if (status === 'VOID') return { bg: colors.surfaceElevated, text: colors.textMuted }
  return { bg: colors.surfaceElevated, text: colors.textMuted }
}

export default function TimesheetsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [acting, setActing] = useState(false)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const params = new URLSearchParams({
        start: weekStart.toISOString().slice(0, 10),
        end: weekEnd.toISOString().slice(0, 10),
        limit: '100',
      })
      const data = await api.request<{ entries: TimeEntry[]; total: number }>(`/admin/timeclock/entries?${params}`)
      setEntries(data.entries || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [weekOffset])

  useEffect(() => { setLoading(true); load() }, [weekOffset])

  const approve = async (id: string) => {
    setActing(true)
    try {
      await api.request('/admin/timeclock/entries', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'approve' }),
      })
      load()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setActing(false)
    }
  }

  const totalWorked = entries.filter(e => e.status !== 'VOID').reduce((s, e) => s + (e.duration ?? 0), 0)
  const pending = entries.filter(e => e.status === 'COMPLETED').length

  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })

  const renderEntry = ({ item: e }: { item: TimeEntry }) => {
    const st = statusStyle(e.status)
    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryLeft}>
            {e.project && <View style={[styles.projectDot, { backgroundColor: e.project.color }]} />}
            <View>
              <Text style={styles.memberName}>{e.teamMember.name}</Text>
              {e.project && <Text style={styles.projectName}>{e.project.name}</Text>}
              {e.task && <Text style={styles.taskText}>{e.task}</Text>}
            </View>
          </View>
          <View style={styles.entryRight}>
            <Text style={styles.duration}>{formatDuration(e.duration)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.text }]}>{e.status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.entryMeta}>
          <Text style={styles.metaText}>
            {new Date(e.clockIn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            {'  '}
            {new Date(e.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {e.clockOut ? ` – ${new Date(e.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (active)'}
          </Text>
          {e.status === 'COMPLETED' && (
            <TouchableOpacity
              onPress={() => approve(e.id)}
              disabled={acting}
              style={styles.approveBtn}
            >
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timesheets</Text>
        </View>
      )}

      {/* Week nav */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.weekBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity
          onPress={() => setWeekOffset(w => Math.min(0, w + 1))}
          disabled={weekOffset === 0}
          style={[styles.weekBtn, weekOffset === 0 && styles.weekBtnDisabled]}
        >
          <Ionicons name="chevron-forward" size={20} color={weekOffset === 0 ? colors.border : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{formatDuration(totalWorked)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Entries</Text>
          <Text style={styles.summaryValue}>{total}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, pending > 0 && { color: '#fbbf24' }]}>{pending}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          renderItem={renderEntry}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No entries for this period</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, paddingBottom: 0 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  weekBtn: { padding: spacing.sm },
  weekBtnDisabled: { opacity: 0.3 },
  weekLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },

  summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center',
  },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },

  listContent: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing.xl * 2 },

  entryCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  entryLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  projectDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  memberName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  projectName: { fontSize: fontSize.sm, color: colors.textSecondary },
  taskText: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  entryRight: { alignItems: 'flex-end', gap: 4 },
  duration: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  entryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: fontSize.sm, color: colors.textMuted },
  approveBtn: {
    backgroundColor: '#05966920', borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: '#05966940',
  },
  approveBtnText: { fontSize: fontSize.xs, color: '#34d399', fontWeight: fontWeight.semibold },

  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl * 2 },
})
