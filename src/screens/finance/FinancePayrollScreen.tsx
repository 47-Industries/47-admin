import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors } from '../../theme'

interface PayStub {
  id: string
  memberId: string
  memberName: string
  gross: number
  net: number
  payType: string
}

interface PayrollRun {
  id: string
  periodStart: string
  periodEnd: string
  payDate: string
  status: string
  totalGross: number
  totalNet: number
  stubs?: PayStub[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: colors.success,
  DRAFT: colors.textMuted,
  PROCESSING: colors.warning,
  VOIDED: colors.error,
}

export default function FinancePayrollScreen({ navigation }: { navigation: any }) {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.request<{ runs: PayrollRun[] }>('/admin/finance/payroll?limit=20')
      setRuns(data.runs || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => (prev === id ? null : id))
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payroll</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {runs.length === 0 ? (
            <Text style={styles.emptyText}>No payroll runs yet.</Text>
          ) : (
            runs.map(run => {
              const isOpen = expanded === run.id
              const statusColor = STATUS_COLORS[run.status] || colors.textMuted
              return (
                <View key={run.id} style={styles.card}>
                  <TouchableOpacity onPress={() => toggleExpand(run.id)} activeOpacity={0.7}>
                    <View style={styles.runHeader}>
                      <View style={styles.runInfo}>
                        <Text style={styles.runPeriod}>
                          {fmtDate(run.periodStart)} – {fmtDate(run.periodEnd)}
                        </Text>
                        <Text style={styles.runPayDate}>Pay date: {fmtDate(run.payDate)}</Text>
                      </View>
                      <View style={styles.runRight}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>{run.status}</Text>
                        </View>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textMuted}
                          style={{ marginTop: 8 }}
                        />
                      </View>
                    </View>
                    <View style={styles.runTotals}>
                      <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>Gross</Text>
                        <Text style={[styles.totalValue, { color: colors.success }]}>{fmt(run.totalGross)}</Text>
                      </View>
                      <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>Net</Text>
                        <Text style={styles.totalValue}>{fmt(run.totalNet)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isOpen && run.stubs && run.stubs.length > 0 && (
                    <View style={styles.stubsContainer}>
                      <Text style={styles.stubsHeader}>Member Breakdown</Text>
                      {run.stubs.map(stub => (
                        <View key={stub.id} style={styles.stubRow}>
                          <Text style={styles.stubName}>{stub.memberName}</Text>
                          <View style={styles.stubAmounts}>
                            <Text style={styles.stubGross}>{fmt(stub.gross)}</Text>
                            <Text style={styles.stubNet}>{fmt(stub.net)} net</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  runInfo: { flex: 1 },
  runPeriod: { fontSize: 14, fontWeight: '600', color: colors.text },
  runPayDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  runRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  runTotals: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 24 },
  totalItem: {},
  totalLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  stubsContainer: { borderTopWidth: 1, borderTopColor: '#27272a', padding: 16, backgroundColor: '#0f0f0f' },
  stubsHeader: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  stubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  stubName: { fontSize: 14, fontWeight: '500', color: colors.text },
  stubAmounts: { alignItems: 'flex-end' },
  stubGross: { fontSize: 14, fontWeight: '700', color: colors.success },
  stubNet: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
})
