import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors } from '../../theme'

interface MemberShare {
  memberId: string
  memberName: string
  equityPct: number
  k1Amount: number
}

interface QuarterData {
  id: string
  year: number
  quarter: number
  totalRevenue: number
  totalOpEx: number
  netIncome: number
  memberShares: MemberShare[]
}

interface QuarterlyResponse {
  quarters: QuarterData[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4']
const YEAR_RANGE = [new Date().getFullYear() - 1, new Date().getFullYear()]

export default function FinanceQuarterlyScreen({ navigation }: { navigation: any }) {
  const currentYear = new Date().getFullYear()
  const currentQ = Math.floor(new Date().getMonth() / 3)

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedQ, setSelectedQ] = useState(currentQ)
  const [allData, setAllData] = useState<QuarterData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.request<QuarterlyResponse>(`/admin/finance/quarterly?year=${selectedYear}`)
      setAllData(data.quarters || [])
    } catch (e) {
      console.error(e)
    }
  }, [selectedYear])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const qData = allData.find(q => q.quarter === selectedQ + 1) || null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Quarterly</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Year Tabs */}
      <View style={styles.yearRow}>
        {YEAR_RANGE.map(y => (
          <TouchableOpacity
            key={y}
            style={[styles.yearTab, selectedYear === y && styles.yearTabActive]}
            onPress={() => setSelectedYear(y)}
          >
            <Text style={[styles.yearTabText, selectedYear === y && styles.yearTabTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quarter Tabs */}
      <View style={styles.quarterRow}>
        {QUARTER_LABELS.map((q, i) => (
          <TouchableOpacity
            key={q}
            style={[styles.quarterBtn, selectedQ === i && styles.quarterBtnActive]}
            onPress={() => setSelectedQ(i)}
          >
            <Text style={[styles.quarterBtnText, selectedQ === i && styles.quarterBtnTextActive]}>{q}</Text>
          </TouchableOpacity>
        ))}
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
          {!qData ? (
            <Text style={styles.emptyText}>No data for {QUARTER_LABELS[selectedQ]} {selectedYear}.</Text>
          ) : (
            <>
              {/* P&L Summary */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{QUARTER_LABELS[selectedQ]} {selectedYear} — P&L</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Total Revenue</Text>
                  <Text style={[styles.rowValue, { color: colors.success }]}>{fmt(qData.totalRevenue)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Total OpEx</Text>
                  <Text style={[styles.rowValue, { color: colors.error }]}>{fmt(qData.totalOpEx)}</Text>
                </View>
                <View style={[styles.row, styles.rowFinal]}>
                  <Text style={styles.rowLabelBold}>Net Income</Text>
                  <Text style={[styles.rowValueLarge, { color: qData.netIncome >= 0 ? colors.success : colors.error }]}>
                    {fmt(qData.netIncome)}
                  </Text>
                </View>
              </View>

              {/* K-1 Per Member */}
              {(qData.memberShares || []).length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>K-1 Allocation</Text>
                  {qData.memberShares.map(m => (
                    <View key={m.memberId} style={styles.memberRow}>
                      <View>
                        <Text style={styles.memberName}>{m.memberName}</Text>
                        <Text style={styles.memberPct}>{m.equityPct}% equity</Text>
                      </View>
                      <Text style={[styles.k1Amount, { color: m.k1Amount >= 0 ? colors.success : colors.error }]}>
                        {fmt(m.k1Amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
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
  yearRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  yearTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46' },
  yearTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearTabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  yearTabTextActive: { color: '#fff' },
  quarterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  quarterBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center' },
  quarterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quarterBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  quarterBtnTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  rowFinal: { borderBottomWidth: 0, paddingTop: 12 },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600' },
  rowLabelBold: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowValueLarge: { fontSize: 18, fontWeight: '800' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
  memberPct: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  k1Amount: { fontSize: 16, fontWeight: '700' },
})
