import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface ClockStatus {
  status: 'CLOCKED_OUT' | 'CLOCKED_IN' | 'ON_BREAK'
  lastClockIn: string | null
  currentEntryId: string | null
  currentEntry: {
    id: string
    clockIn: string
    projectId: string | null
    task: string | null
    breakMinutes: number
  } | null
}

interface Project {
  id: string
  name: string
  code: string | null
  color: string
}

function formatElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export default function TimeclockScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [status, setStatus] = useState<ClockStatus | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const breakStartRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback((clockIn: string, breakMinutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const tick = () => {
      const total = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000)
      setElapsed(Math.max(0, total - breakMinutes))
    }
    tick()
    timerRef.current = setInterval(tick, 30000)
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      const data = await api.request<ClockStatus>('/admin/timeclock/clock')
      setStatus(data)
      if (data.currentEntry && (data.status === 'CLOCKED_IN' || data.status === 'ON_BREAK')) {
        startTimer(data.currentEntry.clockIn, data.currentEntry.breakMinutes)
      } else {
        if (timerRef.current) clearInterval(timerRef.current)
        setElapsed(0)
      }
    } catch (e) {
      console.error(e)
    }
  }, [startTimer])

  useEffect(() => {
    Promise.all([
      refreshStatus(),
      api.request<{ projects: Project[] }>('/admin/timeclock/projects?active=true')
        .then(d => setProjects(d.projects || []))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [refreshStatus])

  const act = async (action: string) => {
    setActing(true)
    try {
      const body: any = { action }
      if (action === 'clock-in') {
        if (selectedProject) body.projectId = selectedProject
        if (task.trim()) body.task = task.trim()
      }
      if (action === 'start-break') {
        breakStartRef.current = new Date().toISOString()
      }
      if (action === 'end-break') {
        body.breakStartedAt = breakStartRef.current
        breakStartRef.current = null
      }
      await api.request('/admin/timeclock/clock', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (action === 'clock-in') { setTask(''); setSelectedProject(null) }
      await refreshStatus()
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong')
    } finally {
      setActing(false)
    }
  }

  const isClockedIn = status?.status === 'CLOCKED_IN'
  const isOnBreak = status?.status === 'ON_BREAK'
  const isClockedOut = !status || status.status === 'CLOCKED_OUT'

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={acting} onRefresh={refreshStatus} tintColor={colors.primary} />}
    >
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Time Clock</Text>
        </View>
      )}

      {/* Status card */}
      <View style={[styles.statusCard, isClockedIn && styles.statusCardActive, isOnBreak && styles.statusCardBreak]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isClockedIn && styles.dotGreen, isOnBreak && styles.dotYellow, isClockedOut && styles.dotGray]} />
          <Text style={styles.statusLabel}>
            {isClockedIn ? 'Clocked In' : isOnBreak ? 'On Break' : 'Clocked Out'}
          </Text>
        </View>

        {(isClockedIn || isOnBreak) && status?.currentEntry && (
          <>
            <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
            <Text style={styles.clockInTime}>
              Since {new Date(status.currentEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {(status.currentEntry.breakMinutes ?? 0) > 0 ? `  ·  ${status.currentEntry.breakMinutes}m break` : ''}
            </Text>
            {status.currentEntry.task ? (
              <View style={styles.taskRow}>
                <Ionicons name="briefcase-outline" size={13} color={colors.textMuted} />
                <Text style={styles.taskText}>{status.currentEntry.task}</Text>
              </View>
            ) : null}
          </>
        )}

        {isClockedOut && status?.lastClockIn && (
          <Text style={styles.lastClockIn}>
            Last in: {new Date(status.lastClockIn).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(status.lastClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>

      {/* Clock in form */}
      {isClockedOut && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clock In</Text>

          <Text style={styles.fieldLabel}>Project (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
            <TouchableOpacity
              style={[styles.projectChip, !selectedProject && styles.projectChipActive]}
              onPress={() => setSelectedProject(null)}
            >
              <Text style={[styles.projectChipText, !selectedProject && styles.projectChipTextActive]}>None</Text>
            </TouchableOpacity>
            {projects.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.projectChip, selectedProject === p.id && styles.projectChipActive]}
                onPress={() => setSelectedProject(p.id)}
              >
                <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                <Text style={[styles.projectChipText, selectedProject === p.id && styles.projectChipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Task (optional)</Text>
          <TextInput
            value={task}
            onChangeText={setTask}
            placeholder="What are you working on?"
            placeholderTextColor={colors.textMuted}
            style={styles.taskInput}
          />

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnGreen, acting && styles.btnDisabled]}
            onPress={() => act('clock-in')}
            disabled={acting}
          >
            {acting ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Clock In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Break / clock out controls */}
      {(isClockedIn || isOnBreak) && (
        <View style={styles.section}>
          <View style={styles.controlRow}>
            {isClockedIn && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnYellow, styles.btnFlex, acting && styles.btnDisabled]}
                onPress={() => act('start-break')}
                disabled={acting}
              >
                <Ionicons name="pause" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Start Break</Text>
              </TouchableOpacity>
            )}
            {isOnBreak && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnGreen, styles.btnFlex, acting && styles.btnDisabled]}
                onPress={() => act('end-break')}
                disabled={acting}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>End Break</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnRed, styles.btnFlex, acting && styles.btnDisabled]}
              onPress={() => {
                Alert.alert('Clock Out', 'Clock out now?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clock Out', style: 'destructive', onPress: () => act('clock-out') },
                ])
              }}
              disabled={acting}
            >
              <Ionicons name="stop" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Clock Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { marginBottom: spacing.lg },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCardActive: { borderColor: '#16a34a40' },
  statusCardBreak: { borderColor: '#ca8a0440' },

  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  dotGreen: { backgroundColor: '#22c55e' },
  dotYellow: { backgroundColor: '#eab308' },
  dotGray: { backgroundColor: colors.border },
  statusLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },

  timerText: { fontSize: 48, fontWeight: fontWeight.bold, color: colors.text, fontVariant: ['tabular-nums'], marginBottom: 4 },
  clockInTime: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskText: { fontSize: fontSize.sm, color: colors.textSecondary },
  lastClockIn: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },

  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },

  projectScroll: { marginBottom: spacing.sm },
  projectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm,
  },
  projectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  projectChipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  projectChipTextActive: { color: '#fff', fontWeight: fontWeight.semibold },
  projectDot: { width: 8, height: 8, borderRadius: 4 },

  taskInput: {
    backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: fontSize.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },

  controlRow: { flexDirection: 'row', gap: spacing.sm },
  btnFlex: { flex: 1 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.md,
  },
  btnGreen: { backgroundColor: '#16a34a' },
  btnYellow: { backgroundColor: '#ca8a04' },
  btnRed: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.md },
})
