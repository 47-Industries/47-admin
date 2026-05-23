import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const { width } = Dimensions.get('window')

type TimeRange = '24h' | '7d' | '30d' | '90d'

export default function AnalyticsScreen({ navigation, asTab, hideHeader }: { navigation: any; asTab?: boolean; hideHeader?: boolean }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [liveStats, setLiveStats] = useState<any>(null)

  const fetchAnalytics = async () => {
    try {
      const analyticsData = await api.getAnalytics(timeRange)
      setAnalytics(analyticsData)
      setLiveStats({ activeUsers: analyticsData.activeUsers ?? 0 })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatPercentChange = (current: number, previous: number) => {
    if (!previous) return { value: 0, positive: true }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change).toFixed(1), positive: change >= 0 }
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
          <Ionicons
            name={change.positive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={change.positive ? colors.success : colors.error}
          />
          <Text style={[styles.changeText, { color: change.positive ? colors.success : colors.error }]}>
            {change.value}%
          </Text>
        </View>
      )}
    </Card>
  )

  // Use SafeAreaView when used as standalone tab (asTab), otherwise regular View
  const Wrapper = asTab ? SafeAreaView : View
  const wrapperProps = asTab ? { edges: ['top'] as const, style: styles.container } : { style: styles.container }

  // Show header when not embedded as tab and not hideHeader
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
        {/* Live Stats */}
        {liveStats && (
          <Card style={styles.liveCard}>
            <View style={styles.liveHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTitle}>Live</Text>
            </View>
            <View style={styles.liveStats}>
              <View style={styles.liveStat}>
                <Text style={styles.liveValue}>{liveStats.activeUsers || 0}</Text>
                <Text style={styles.liveLabel}>Active Users</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Time Range Selector */}
        <View style={styles.timeSelector}>
          <TimeRangeButton range="24h" label="24H" />
          <TimeRangeButton range="7d" label="7D" />
          <TimeRangeButton range="30d" label="30D" />
          <TimeRangeButton range="90d" label="90D" />
        </View>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
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
            title="Visitors"
            value={formatNumber(analytics?.visitors?.current || 0)}
            icon="people-outline"
            color={colors.purple}
            change={analytics?.visitors ? formatPercentChange(analytics.visitors.current, analytics.visitors.previous) : null}
          />
          <StatCard
            title="Conversion"
            value={`${analytics?.conversionRate?.current?.toFixed(1) || 0}%`}
            icon="trending-up-outline"
            color={colors.warning}
            change={analytics?.conversionRate ? formatPercentChange(analytics.conversionRate.current, analytics.conversionRate.previous) : null}
          />
        </View>

        {/* Sales Summary */}
        <Text style={styles.sectionTitle}>Sales Summary</Text>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(analytics?.revenue?.current || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Orders</Text>
            <Text style={styles.summaryValue}>{analytics?.orders?.current || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Avg Order Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(analytics?.avgOrderValue || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Refunds</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {formatCurrency(analytics?.refunds || 0)}
            </Text>
          </View>
        </Card>

        {/* Traffic Sources */}
        {analytics?.trafficSources && (
          <>
            <Text style={styles.sectionTitle}>Traffic Sources</Text>
            <Card style={styles.trafficCard}>
              {analytics.trafficSources.map((source: any, index: number) => (
                <View key={index} style={styles.trafficRow}>
                  <View style={styles.trafficInfo}>
                    <Text style={styles.trafficSource}>{source.name}</Text>
                    <Text style={styles.trafficCount}>{formatNumber(source.visitors)} visitors</Text>
                  </View>
                  <View style={styles.trafficBarContainer}>
                    <View
                      style={[
                        styles.trafficBar,
                        { width: `${source.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.trafficPercent}>{source.percentage}%</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Top Products */}
        {analytics?.topProducts && (
          <>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <Card style={styles.productsCard}>
              {analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
                <View key={index} style={[styles.productRow, index > 0 && styles.productBorder]}>
                  <Text style={styles.productRank}>#{index + 1}</Text>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productSales}>{product.sales} sold</Text>
                  </View>
                  <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Device Breakdown */}
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
                    <Text style={styles.deviceLabel}>{item.device?.charAt(0).toUpperCase() + item.device?.slice(1) || 'Unknown'}</Text>
                  </Card>
                )
              })}
            </View>
          </>
        )}

        {/* Browser Breakdown */}
        {analytics?.browserBreakdown && analytics.browserBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Browsers</Text>
            <Card style={styles.trafficCard}>
              {analytics.browserBreakdown.map((item: any, index: number) => (
                <View key={index} style={styles.trafficRow}>
                  <View style={styles.trafficInfo}>
                    <Text style={styles.trafficSource}>{item.browser || 'Unknown'}</Text>
                    <Text style={styles.trafficCount}>{formatNumber(item.count)} views</Text>
                  </View>
                  <View style={styles.trafficBarContainer}>
                    <View style={[styles.trafficBar, { width: `${item.percentage}%`, backgroundColor: '#f59e0b' }]} />
                  </View>
                  <Text style={styles.trafficPercent}>{item.percentage}%</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* OS Breakdown */}
        {analytics?.osBreakdown && analytics.osBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Operating Systems</Text>
            <Card style={styles.trafficCard}>
              {analytics.osBreakdown.map((item: any, index: number) => (
                <View key={index} style={styles.trafficRow}>
                  <View style={styles.trafficInfo}>
                    <Text style={styles.trafficSource}>{item.os || 'Unknown'}</Text>
                    <Text style={styles.trafficCount}>{formatNumber(item.count)} views</Text>
                  </View>
                  <View style={styles.trafficBarContainer}>
                    <View style={[styles.trafficBar, { width: `${item.percentage}%`, backgroundColor: '#ec4899' }]} />
                  </View>
                  <Text style={styles.trafficPercent}>{item.percentage}%</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Countries */}
        {analytics?.countryBreakdown && analytics.countryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Countries</Text>
            <Card style={styles.trafficCard}>
              {analytics.countryBreakdown.slice(0, 8).map((item: any, index: number) => (
                <View key={index} style={styles.trafficRow}>
                  <View style={styles.trafficInfo}>
                    <Text style={styles.trafficSource}>{item.country || 'Unknown'}</Text>
                    <Text style={styles.trafficCount}>{formatNumber(item.count)} visitors</Text>
                  </View>
                  <View style={styles.trafficBarContainer}>
                    <View style={[styles.trafficBar, { width: `${item.percentage}%`, backgroundColor: '#8b5cf6' }]} />
                  </View>
                  <Text style={styles.trafficPercent}>{item.percentage}%</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  liveCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
    gap: spacing.xl,
  },
  liveStat: {},
  liveValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  liveLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  timeButtonTextActive: {
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
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
  summaryCard: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  trafficCard: {
    padding: spacing.lg,
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trafficInfo: {
    width: 100,
  },
  trafficSource: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  trafficCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  trafficBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceHover,
    borderRadius: 4,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  trafficBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  trafficPercent: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  productsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  productBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  productRank: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    width: 30,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  productName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  productSales: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  productRevenue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
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
