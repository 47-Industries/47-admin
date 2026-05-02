import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Stats {
  subscribers: { total: number; confirmed: number; pendingLast30: number }
  pulseWaitlist: { total: number; confirmed: number; invited: number }
  buildMyPulse: { total: number; new: number; qualified: number; closedWon: number }
  prompts: { total: number; published: number }
  contentSubscriptions: { active: number }
  leadMagnets: { active: number }
}

export function LearnDashboardScreen({ navigation }: { navigation: any }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getLearnStats()
      setStats(data)
    } catch (e) {
      console.error('Failed to load Learn stats', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Learn / Resource Hub</Text>
        <Text style={styles.subtitle}>
          Newsletter, Pulse waitlist, Build My Pulse leads, prompt library, and content subscriptions.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !stats ? (
        <Card><Text style={styles.empty}>Could not load stats.</Text></Card>
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Newsletter — confirmed" value={stats.subscribers.confirmed} sub={`${stats.subscribers.total} total`} accent="#3b82f6" />
            <StatCard label="Newsletter — pending 30d" value={stats.subscribers.pendingLast30} sub="Need follow-up" accent="#f59e0b" />
            <StatCard label="Pulse waitlist" value={stats.pulseWaitlist.confirmed} sub={`${stats.pulseWaitlist.invited} invited`} accent="#3b82f6" />
            <StatCard label="Build My Pulse — new" value={stats.buildMyPulse.new} sub={`${stats.buildMyPulse.total} total · ${stats.buildMyPulse.closedWon} won`} accent="#10b981" />
            <StatCard label="Prompts published" value={stats.prompts.published} sub={`${stats.prompts.total} total`} accent="#7c3aed" />
            <StatCard label="Active subscriptions" value={stats.contentSubscriptions.active} sub="Playbook + Inner Circle" accent="#10b981" />
            <StatCard label="Lead magnets active" value={stats.leadMagnets.active} sub="" accent="#a1a1aa" />
          </View>

          <Text style={styles.sectionLabel}>Manage</Text>

          <NavRow
            icon="mail-outline"
            label="Newsletter Subscribers"
            count={stats.subscribers.total}
            onPress={() => navigation.navigate('LearnSubscribers')}
          />
          <NavRow
            icon="rocket-outline"
            label="Pulse Waitlist"
            count={stats.pulseWaitlist.total}
            onPress={() => navigation.navigate('LearnWaitlist')}
          />
          <NavRow
            icon="construct-outline"
            label="Build My Pulse Leads"
            count={stats.buildMyPulse.total}
            onPress={() => navigation.navigate('LearnBmpLeads')}
          />
          <NavRow
            icon="library-outline"
            label="Prompts (web admin only)"
            count={stats.prompts.total}
            sub="Open admin.47industries.com to edit"
            disabled
          />
        </>
      )}
    </ScrollView>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: accent }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

function NavRow({
  icon, label, count, sub, onPress, disabled,
}: {
  icon: any
  label: string
  count?: number
  sub?: string
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
      style={[styles.navRow, disabled && { opacity: 0.5 }]}
    >
      <View style={styles.navIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <View style={styles.navText}>
        <Text style={styles.navLabel}>{label}</Text>
        {sub ? <Text style={styles.navSub}>{sub}</Text> : null}
      </View>
      {typeof count === 'number' && (
        <Text style={styles.navCount}>{count}</Text>
      )}
      {!disabled && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  header: { marginBottom: spacing.xl },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold as any, color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: spacing.sm },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, fontWeight: fontWeight.semibold as any },
  statValue: { fontSize: 28, fontWeight: fontWeight.bold as any, color: colors.text, lineHeight: 32 },
  statSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sectionLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, fontWeight: fontWeight.semibold as any },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  navIcon: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: 'rgba(59,130,246,0.1)', alignItems: 'center', justifyContent: 'center' },
  navText: { flex: 1 },
  navLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium as any, color: colors.text },
  navSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  navCount: { fontSize: fontSize.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
})
