import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const { width } = Dimensions.get('window')

type TimeRange = '24h' | '7d' | '30d' | '90d'

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function AnalyticsScreen({ navigation, asTab, hideHeader }: { navigation: any; asTab?: boolean; hideHeader?: boolean }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)

  const fetchAnalytics = async () => {
    try {
      const data = await api.getAnalytics(timeRange)
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchAnalytics()
  }, [timeRange])

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return (num || 0).toString()
  }

  const formatPercentChange = (current: number, previous: number) => {
    if (!previous) return null
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change).toFixed(1), positive: change >= 0 }
  }

  const bounceColor = (rate: number) => {
    if (rate < 50) return colors.success
    if (rate < 70) return colors.warning
    return colors.error
  }

  const TimeRangeButton = ({ range, label }: { range: TimeRange; label: string }) => (
    <TouchableOpacity
      style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
      onPress={() => setTimeRange(range)}
    >
      <Text style={[styles.timeButtonText, timeRange === range && styles.timeButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  const StatCard = ({ title, value, icon, change, color = colors.primary }: any) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Ionicons name={change.positive ? 'arrow-up' : 'arrow-down'} size={12} color={change.positive ? colors.success : colors.error} />
          <Text style={[styles.changeText, { color: change.positive ? colors.success : colors.error }]}>{change.value}%</Text>
        </View>
      )}
    </Card>
  )

  const BarRow = ({ label, count, total, color = colors.primary }: { label: string; count: number; total: number; color?: string }) => {
    const pct = total > 0 ? Math.min(100, (count / total) * 100) : 0
    return (
      <View style={styles.barRow}>
        <View style={styles.barInfo}>
          <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.barCount}>{formatNumber(count)}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={styles.barPct}>{Math.round(pct)}%</Text>
      </View>
    )
  }

  const Wrapper = asTab ? SafeAreaView : View
  const wrapperProps = asTab ? { edges: ['top'] as const, style: styles.container } : { style: styles.container }
  const showHeader = !asTab && !hideHeader

  return (
    <Wrapper {...wrapperProps}>
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Analytics</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Live Card */}
        <Card style={styles.liveCard}>
          <View style={styles.liveHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTitle}>Live</Text>
          </View>
          <View style={styles.liveStats}>
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>{analytics?.activeUsers || 0}</Text>
              <Text style={styles.liveLabel}>Active Now</Text>
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>{formatNumber(analytics?.totalPageViews || 0)}</Text>
              <Text style={styles.liveLabel}>Page Views</Text>
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>{formatNumber(analytics?.uniqueVisitors || 0)}</Text>
              <Text style={styles.liveLabel}>Visitors</Text>
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>{formatNumber(analytics?.uniqueSessions || 0)}</Text>
              <Text style={styles.liveLabel}>Sessions</Text>
            </View>
          </View>
        </Card>

        {/* Time Range */}
        <View style={styles.timeSelector}>
          <TimeRangeButton range="24h" label="24H" />
          <TimeRangeButton range="7d" label="7D" />
          <TimeRangeButton range="30d" label="30D" />
          <TimeRangeButton range="90d" label="90D" />
        </View>

        {/* Traffic KPIs */}
        <Text style={styles.sectionTitle}>Traffic</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Unique Visitors"
            value={formatNumber(analytics?.uniqueVisitors || 0)}
            icon="people-outline"
            color={colors.purple}
            change={analytics?.visitors ? formatPercentChange(analytics.visitors.current, analytics.visitors.previous) : null}
          />
          <StatCard
            title="Sessions"
            value={formatNumber(analytics?.uniqueSessions || 0)}
            icon="globe-outline"
            color={colors.warning}
          />
          <StatCard
            title="Bounce Rate"
            value={analytics?.bounceRate != null ? `${analytics.bounceRate.toFixed(1)}%` : '—'}
            icon="arrow-undo-outline"
            color={bounceColor(analytics?.bounceRate || 0)}
          />
          <StatCard
            title="Avg Duration"
            value={formatDuration(analytics?.avgDuration || 0)}
            icon="time-outline"
            color="#ec4899"
          />
          <StatCard
            title="New Visitors"
            value={formatNumber(analytics?.newVisitors || 0)}
            icon="person-add-outline"
            color="#14b8a6"
          />
          <StatCard
            title="Returning"
            value={formatNumber(analytics?.returningVisitors || 0)}
            icon="repeat-outline"
            color="#6366f1"
          />
        </View>

        {/* Revenue */}
        <Text style={styles.sectionTitle}>Revenue</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Revenue"
            value={formatCurrency(analytics?.revenue?.current || 0)}
            icon="cash-outline"
            color={colors.success}
            change={analytics?.revenue ? formatPercentChange(analytics.revenue.current, analytics.revenue.previous) : null}
          />
          <StatCard
            title="Orders"
            value={analytics?.orders?.current || 0}
            icon="receipt-outline"
            color={colors.primary}
            change={analytics?.orders ? formatPercentChange(analytics.orders.current, analytics.orders.previous) : null}
          />
          <StatCard
            title="Avg Order"
            value={formatCurrency(analytics?.avgOrderValue || 0)}
            icon="pricetag-outline"
            color={colors.warning}
          />
          <StatCard
            title="Conversion"
            value={`${analytics?.conversionRate?.current?.toFixed(1) || 0}%`}
            icon="trending-up-outline"
            color="#10b981"
            change={analytics?.conversionRate ? formatPercentChange(analytics.conversionRate.current, analytics.conversionRate.previous) : null}
          />
        </View>

        {/* Top Pages */}
        {analytics?.topPages && analytics.topPages.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Pages</Text>
            <Card style={styles.listCard}>
              {analytics.topPages.slice(0, 10).map((page: any, index: number) => {
                const maxViews = analytics.topPages[0]?.views || 1
                const pct = (page.views / maxViews) * 100
                return (
                  <View key={page.path} style={[styles.pageRow, index > 0 && styles.pageBorder]}>
                    <Text style={styles.pageRank}>{index + 1}</Text>
                    <View style={styles.pageInfo}>
                      <Text style={styles.pagePath} numberOfLines={1}>
                        {page.path === '/' ? '/ (Home)' : page.path}
                      </Text>
                      <View style={styles.pageBarTrack}>
                        <View style={[styles.pageBarFill, { width: `${pct}%` as any }]} />
                      </View>
                    </View>
                    <View style={styles.pageRight}>
                      <Text style={styles.pageViews}>{formatNumber(page.views)}</Text>
                      {page.avgScrollDepth != null && (
                        <Text style={styles.pageScroll}>{Math.round(page.avgScrollDepth)}% scroll</Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </Card>
          </>
        )}

        {/* UTM Attribution */}
        {(analytics?.utmSources?.length > 0 || analytics?.utmCampaigns?.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Campaigns</Text>
            {analytics?.utmSources?.length > 0 && (
              <Card style={styles.listCard}>
                <Text style={styles.subSectionTitle}>Sources</Text>
                {analytics.utmSources.map((s: any, i: number) => (
                  <BarRow key={i} label={s.source} count={s.count} total={analytics.totalPageViews} color="#10b981" />
                ))}
              </Card>
            )}
            {analytics?.utmCampaigns?.length > 0 && (
              <Card style={[styles.listCard, { marginTop: spacing.md }]}>
                <Text style={styles.subSectionTitle}>Campaigns</Text>
                {analytics.utmCampaigns.map((c: any, i: number) => (
                  <BarRow key={i} label={c.campaign} count={c.count} total={analytics.totalPageViews} color="#f59e0b" />
                ))}
              </Card>
            )}
          </>
        )}

        {/* Traffic Sources */}
        {analytics?.trafficSources && analytics.trafficSources.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Traffic Sources</Text>
            <Card style={styles.listCard}>
              {analytics.trafficSources.map((source: any, index: number) => (
                <BarRow key={index} label={source.name} count={source.visitors} total={analytics.totalPageViews} color={colors.primary} />
              ))}
            </Card>
          </>
        )}

        {/* Countries */}
        {analytics?.countryBreakdown && analytics.countryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Countries</Text>
            <Card style={styles.listCard}>
              {analytics.countryBreakdown.slice(0, 8).map((item: any, index: number) => (
                <BarRow key={index} label={item.country || 'Unknown'} count={item.count} total={analytics.uniqueVisitors} color="#8b5cf6" />
              ))}
            </Card>
          </>
        )}

        {/* Devices */}
        {analytics?.deviceBreakdown && analytics.deviceBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Devices</Text>
            <View style={styles.devicesRow}>
              {analytics.deviceBreakdown.map((item: any) => {
                const iconName = item.device === 'mobile' ? 'phone-portrait-outline' : item.device === 'tablet' ? 'tablet-portrait-outline' : 'desktop-outline'
                const color = item.device === 'mobile' ? colors.success : item.device === 'tablet' ? colors.warning : colors.primary
                return (
                  <Card key={item.device} style={styles.deviceCard}>
                    <Ionicons name={iconName} size={24} color={color} />
                    <Text style={styles.deviceValue}>{item.percentage}%</Text>
                    <Text style={styles.deviceLabel}>{(item.device?.charAt(0).toUpperCase() + item.device?.slice(1)) || 'Unknown'}</Text>
                  </Card>
                )
              })}
            </View>
          </>
        )}

        {/* Browsers */}
        {analytics?.browserBreakdown && analytics.browserBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Browsers</Text>
            <Card style={styles.listCard}>
              {analytics.browserBreakdown.map((item: any, index: number) => (
                <BarRow key={index} label={item.browser || 'Unknown'} count={item.count} total={analytics.totalPageViews} color="#f59e0b" />
              ))}
            </Card>
          </>
        )}

        {/* OS */}
        {analytics?.osBreakdown && analytics.osBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Operating Systems</Text>
            <Card style={styles.listCard}>
              {analytics.osBreakdown.map((item: any, index: number) => (
                <BarRow key={index} label={item.os || 'Unknown'} count={item.count} total={analytics.totalPageViews} color="#ec4899" />
              ))}
            </Card>
          </>
        )}

        {/* Top Products */}
        {analytics?.topProducts && analytics.topProducts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <Card style={styles.listCard}>
              {analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
                <View key={index} style={[styles.pageRow, index > 0 && styles.pageBorder]}>
                  <Text style={styles.pageRank}>{index + 1}</Text>
                  <View style={styles.pageInfo}>
                    <Text style={styles.pagePath} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.pageScroll}>{product.sales} sold</Text>
                  </View>
                  <Text style={[styles.pageViews, { color: colors.success }]}>{formatCurrency(product.revenue)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  liveCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: colors.success,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  liveTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  liveStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStat: {
    flex: 1,
    alignItems: 'center',
  },
  liveDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  liveValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  liveLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  timeButtonTextActive: { color: colors.text },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  subSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    padding: spacing.lg,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  changeText: {
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  listCard: {
    padding: spacing.lg,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  barInfo: {
    width: 110,
  },
  barLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  barCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 3,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barPct: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 36,
    textAlign: 'right',
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pageBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageRank: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 24,
    fontWeight: fontWeight.medium,
  },
  pageInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  pagePath: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  pageBarTrack: {
    height: 3,
    backgroundColor: colors.surfaceHover,
    borderRadius: 2,
    overflow: 'hidden',
  },
  pageBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  pageRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  pageViews: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pageScroll: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  devicesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deviceCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  deviceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  deviceLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})
