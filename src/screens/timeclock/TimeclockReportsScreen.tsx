import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface MemberReport {
  member: { id: string; name: string; title: string | null; profileImageUrl: string | null; hourlyRate: number | null }
  totalMinutes: number
  totalCost: number
  entryCount: number
}

interface ProjectReport {
  project: { id: string; name: string; code: string | null; color: string } | null
  totalMinutes: number
  totalCost: number
  entryCount: number
}

interface Summary {
  totalMinutes: number
  totalHours: number
  totalCost: number
  entryCount: number
  pendingApproval: number
}

function formatDuration(minutes: number): string {
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

export default function TimeclockReportsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byMember, setByMember] = useState<MemberReport[]>([])
  const [byProject, setByProject] = useState<ProjectReport[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<'member' | 'project'>('member')

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const params = new URLSearchParams({
        start: weekStart.toISOString().slice(0, 10),
        end: weekEnd.toISOString().slice(0, 10),
      })
      const data = await api.request<{ summary: Summary; byMember: MemberReport[]; byProject: ProjectReport[] }>(
        `/admin/timeclock/reports?${params}`
      )
      setSummary(data.summary)
      setByMember(data.byMember || [])
      setByProject(data.byProject || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [weekOffset])

  useEffect(() => { setLoading(true); load() }, [weekOffset])

  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
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

      {/* Summary cards */}
      {summary && (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryValue}>{formatDuration(summary.totalMinutes)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Labor Cost</Text>
            <Text style={styles.summaryValue}>${summary.totalCost.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Entries</Text>
            <Text style={styles.summaryValue}>{summary.entryCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, summary.pendingApproval > 0 && { color: '#fbbf24' }]}>{summary.pendingApproval}</Text>
          </View>
        </View>
      )}

      {/* Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'member' && styles.toggleBtnActive]}
          onPress={() => setView('member')}
        >
          <Text style={[styles.toggleText, view === 'member' && styles.toggleTextActive]}>By Member</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'project' && styles.toggleBtnActive]}
          onPress={() => setView('project')}
        >
          <Text style={[styles.toggleText, view === 'project' && styles.toggleTextActive]}>By Project</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : view === 'member' ? (
        byMember.sort((a, b) => b.totalMinutes - a.totalMinutes).map(row => (
          <View key={row.member.id} style={styles.reportCard}>
            <View style={styles.reportRow}>
              <View style={styles.reportAvatarCircle}>
                <Text style={styles.reportAvatarText}>{row.member.name[0]}</Text>
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportName}>{row.member.name}</Text>
                {row.member.title && <Text style={styles.reportSub}>{row.member.title}</Text>}
              </View>
              <View style={styles.reportStats}>
                <Text style={styles.reportHours}>{formatDuration(row.totalMinutes)}</Text>
                {row.member.hourlyRate && row.totalCost > 0 && (
                  <Text style={styles.reportCost}>${row.totalCost.toFixed(0)}</Text>
                )}
              </View>
            </View>
            {summary && summary.totalMinutes > 0 && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${(row.totalMinutes / summary.totalMinutes) * 100}%` as any }]} />
              </View>
            )}
            <Text style={styles.entryCount}>{row.entryCount} entries</Text>
          </View>
        ))
      ) : (
        byProject.sort((a, b) => b.totalMinutes - a.totalMinutes).map((row, i) => (
          <View key={row.project?.id || 'none'} style={styles.reportCard}>
            <View style={styles.reportRow}>
              <View style={[styles.projectDot, { backgroundColor: row.project?.color || colors.border }]} />
              <View style={styles.reportInfo}>
                <Text style={styles.reportName}>{row.project?.name || 'No Project'}</Text>
                {row.project?.code && <Text style={styles.reportSub}>{row.project.code}</Text>}
              </View>
              <View style={styles.reportStats}>
                <Text style={styles.reportHours}>{formatDuration(row.totalMinutes)}</Text>
                {row.totalCost > 0 && <Text style={styles.reportCost}>${row.totalCost.toFixed(0)}</Text>}
              </View>
            </View>
            {summary && summary.totalMinutes > 0 && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${(row.totalMinutes / summary.totalMinutes) * 100}%` as any, backgroundColor: row.project?.color || colors.primary }]} />
              </View>
            )}
            <Text style={styles.entryCount}>{row.entryCount} entries</Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  header: { marginBottom: spacing.md },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  weekBtn: { padding: spacing.sm },
  weekBtnDisabled: { opacity: 0.3 },
  weekLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  toggle: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: spacing.md,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm },
  toggleBtnActive: { backgroundColor: colors.surfaceElevated },
  toggleText: { fontSize: fontSize.sm, color: colors.textMuted },
  toggleTextActive: { color: colors.text, fontWeight: fontWeight.semibold },

  reportCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  reportRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  reportAvatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  reportAvatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  projectDot: { width: 14, height: 14, borderRadius: 7, marginRight: spacing.sm },
  reportInfo: { flex: 1 },
  reportName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  reportSub: { fontSize: fontSize.sm, color: colors.textMuted },
  reportStats: { alignItems: 'flex-end' },
  reportHours: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  reportCost: { fontSize: fontSize.sm, color: colors.textMuted },

  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  entryCount: { fontSize: fontSize.xs, color: colors.textMuted },
})
