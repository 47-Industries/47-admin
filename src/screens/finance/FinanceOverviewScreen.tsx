import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface DashboardData {
  revenue?: { collectedThisMonth: number; totalOutstanding: number }
  saasRevenue?: { mrr: number; ytd: number }
  cashFlowThisMonth?: { net: number }
  taxEstimates?: { ytdRevenue: number } | null
  lastPayroll?: { payDate: string; totalGross: number; totalNet: number } | null
  ytdPayroll?: number
  nextTaxDue?: { label: string; dueDate: string } | null
  ownerPay?: { id: string; name: string; accentColor: string; ytdPaid: number }[]
}

interface LLCMember {
  id: string
  name: string
  title: string | null
  accentColor: string | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FinanceOverviewScreen({ navigation }: { navigation: any }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [llcMembers, setLLCMembers] = useState<LLCMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const [dash, members] = await Promise.all([
        api.request<DashboardData>('/admin/finance/dashboard'),
        api.request<{ members: LLCMember[] }>('/admin/finance/payroll/members'),
      ])
      setData(dash)
      setLLCMembers(members.members || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  const kpis = [
    { label: 'Cash In (Month)', value: fmt(data?.revenue?.collectedThisMonth ?? 0), color: colors.success },
    { label: 'MRR', value: fmt(data?.saasRevenue?.mrr ?? 0), color: colors.purple },
    { label: 'Net Profit (Month)', value: fmt(data?.cashFlowThisMonth?.net ?? 0), color: (data?.cashFlowThisMonth?.net ?? 0) >= 0 ? colors.success : colors.error },
    { label: 'YTD Revenue', value: fmt(data?.taxEstimates?.ytdRevenue ?? 0), color: colors.primary },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Finance</Text>
          <Text style={styles.subtitle}>47 Industries LLC</Text>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {kpis.map(k => (
            <View key={k.label} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Payroll Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
            <Text style={styles.cardTitle}>Payroll</Text>
          </View>
          {data?.lastPayroll ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Last Pay Date</Text>
                <Text style={styles.rowValue}>{fmtDate(data.lastPayroll.payDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Last Run Gross</Text>
                <Text style={[styles.rowValue, { color: colors.success }]}>{fmt(data.lastPayroll.totalGross)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>YTD Gross Payroll</Text>
                <Text style={[styles.rowValue, { color: colors.primary, fontWeight: '700' }]}>{fmt(data?.ytdPayroll ?? 0)}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No completed payroll runs yet.</Text>
          )}
        </View>

        {/* LLC Members */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={18} color="#7c3aed" />
            <Text style={styles.cardTitle}>LLC Equity — 47 Industries</Text>
          </View>
          <View style={styles.membersGrid}>
            {llcMembers.map(m => {
              const accent = m.accentColor || colors.primary
              return (
                <View key={m.id} style={[styles.memberCell, { borderLeftColor: accent }]}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberTitle}>{m.title || 'Member'}</Text>
                  <Text style={[styles.memberEquity, { color: accent }]}>25%</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Next Tax Due */}
        {data?.nextTaxDue && (
          <View style={[styles.card, styles.taxDueCard]}>
            <Ionicons name="calendar-outline" size={16} color={colors.warning} style={{ marginBottom: 4 }} />
            <Text style={styles.taxDueLabel}>Next Tax Due</Text>
            <Text style={styles.taxDueTitle}>{data.nextTaxDue.label}</Text>
            <Text style={styles.taxDueDate}>{fmtDate(data.nextTaxDue.dueDate)}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('FinanceLedger')}>
            <Ionicons name="list-outline" size={16} color={colors.text} />
            <Text style={styles.actionBtnText}>View Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => navigation.navigate('FinancePayroll')}>
            <Ionicons name="cash-outline" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>View Payroll</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: {
    width: '48%',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
  },
  kpiLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: '700' },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted },
  membersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberCell: {
    width: '48%',
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 3,
    padding: 12,
  },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  memberTitle: { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  memberEquity: { fontSize: 22, fontWeight: '800' },
  taxDueCard: { backgroundColor: '#1a1208', borderColor: '#78350f40' },
  taxDueLabel: { fontSize: 11, color: colors.warning, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  taxDueTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  taxDueDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#27272a',
    borderRadius: 8,
  },
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
})
