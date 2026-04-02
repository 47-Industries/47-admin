import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { CachedImage } from '../../components/CachedImage'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface MemberStatus {
  id: string
  name: string
  title: string | null
  profileImageUrl: string | null
  clockStatus: string | null
  lastClockIn: string | null
  activeEntry: {
    id: string
    clockIn: string
    task: string | null
    project: { name: string; color: string } | null
  } | null
}

function elapsed(clockIn: string): string {
  const mins = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function statusColor(status: string | null): string {
  if (status === 'CLOCKED_IN') return '#22c55e'
  if (status === 'ON_BREAK') return '#eab308'
  return colors.border
}

function statusLabel(status: string | null): string {
  if (status === 'CLOCKED_IN') return 'Clocked In'
  if (status === 'ON_BREAK') return 'On Break'
  return 'Clocked Out'
}

export default function TimeclockTeamScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [members, setMembers] = useState<MemberStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const data = await api.request<{ members: MemberStatus[] }>('/admin/timeclock/team')
      setMembers(data.members || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  const active = members.filter(m => m.clockStatus === 'CLOCKED_IN' || m.clockStatus === 'ON_BREAK')
  const inactive = members.filter(m => !m.clockStatus || m.clockStatus === 'CLOCKED_OUT')

  const renderMember = ({ item: m }: { item: MemberStatus }) => {
    const isActive = m.clockStatus === 'CLOCKED_IN' || m.clockStatus === 'ON_BREAK'
    return (
      <View style={[styles.memberCard, isActive && styles.memberCardActive]}>
        <View style={styles.memberLeft}>
          <View style={styles.avatarContainer}>
            {m.profileImageUrl ? (
              <CachedImage source={{ uri: m.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{m.name[0]}</Text>
              </View>
            )}
            <View style={[styles.statusIndicator, { backgroundColor: statusColor(m.clockStatus) }]} />
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{m.name}</Text>
            {m.title && <Text style={styles.memberTitle}>{m.title}</Text>}
            {m.activeEntry?.project && (
              <View style={styles.projectRow}>
                <View style={[styles.projectDot, { backgroundColor: m.activeEntry.project.color }]} />
                <Text style={styles.projectName}>{m.activeEntry.project.name}</Text>
              </View>
            )}
            {m.activeEntry?.task && <Text style={styles.taskText}>{m.activeEntry.task}</Text>}
          </View>
        </View>
        <View style={styles.memberRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(m.clockStatus) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor(m.clockStatus) }]}>
              {statusLabel(m.clockStatus)}
            </Text>
          </View>
          {m.activeEntry && (
            <Text style={styles.elapsedText}>{elapsed(m.activeEntry.clockIn)}</Text>
          )}
          {!isActive && m.lastClockIn && (
            <Text style={styles.lastSeenText}>
              {new Date(m.lastClockIn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
      </View>
    )
  }

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, backgroundColor: colors.background }} />
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Team Status</Text>
        </View>
      )}

      <FlatList
        data={[...active, ...inactive]}
        keyExtractor={m => m.id}
        renderItem={renderMember}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          active.length > 0 ? (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>{active.length} currently working</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No team members found</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, paddingBottom: 0 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl * 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  sectionLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },

  memberCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  memberCardActive: { borderColor: '#16a34a30' },

  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  avatarContainer: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  statusIndicator: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: colors.surface,
  },

  memberInfo: { flex: 1 },
  memberName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  memberTitle: { fontSize: fontSize.sm, color: colors.textMuted },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectName: { fontSize: fontSize.sm, color: colors.textSecondary },
  taskText: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },

  memberRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  elapsedText: { fontSize: fontSize.sm, color: colors.textMuted },
  lastSeenText: { fontSize: fontSize.xs, color: colors.textMuted },

  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl * 2 },
})
