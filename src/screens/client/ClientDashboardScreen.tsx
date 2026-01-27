import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth'
import { api } from '../../services/api'
import { StatCard } from '../../components/StatCard'
import { SectionHeader } from '../../components/SectionHeader'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface ClientDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function ClientDashboardScreen({ navigation, hideHeader }: ClientDashboardScreenProps) {
  const client = useAuthStore((state) => state.client)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)

  const fetchDashboard = async () => {
    try {
      const data = await api.getClientDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to fetch client dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDashboard()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const accentColor = portalColors.client

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{client?.name || 'Client'}</Text>
          </View>
          {client?.clientNumber && (
            <View style={[styles.clientBadge, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.clientBadgeText, { color: accentColor }]}>
                #{client.clientNumber}
              </Text>
            </View>
          )}
        </View>

        {/* Balance Card */}
        {dashboardData?.stats?.outstandingBalance > 0 && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Outstanding Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(dashboardData.stats.outstandingBalance)}
              </Text>
              {dashboardData.stats.nextPaymentDue && (
                <Text style={styles.balanceDue}>
                  Due: {formatDate(dashboardData.stats.nextPaymentDue)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => navigation.navigate('Invoices')}
            >
              <Ionicons name="card-outline" size={20} color={colors.text} />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Active Projects"
                value={dashboardData?.stats?.activeProjects || 0}
                icon="folder-open-outline"
                iconColor={accentColor}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Total Projects"
                value={dashboardData?.stats?.totalProjects || 0}
                icon="folder-outline"
                iconColor={colors.textMuted}
                compact
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Outstanding"
                value={formatCurrency(dashboardData?.stats?.outstandingBalance || client?.totalOutstanding || 0)}
                icon="alert-circle-outline"
                iconColor={colors.warning}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Total Spent"
                value={formatCurrency(dashboardData?.stats?.totalSpent || client?.totalRevenue || 0)}
                icon="wallet-outline"
                iconColor={colors.success}
                compact
              />
            </View>
          </View>
        </View>

        {/* Active Projects */}
        {dashboardData?.activeProjects?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Active Projects"
              actionLabel="View All"
              onAction={() => navigation.navigate('Projects')}
              count={dashboardData.activeProjects.length}
            />
            {dashboardData.activeProjects.slice(0, 3).map((project: any) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => navigation.navigate('ProjectDetail', { id: project.id })}
              >
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View style={styles.projectProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${project.progress || 0}%`, backgroundColor: accentColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{project.progress || 0}%</Text>
                  </View>
                </View>
                <StatusBadge
                  status={getStatusType(project.status)}
                  label={project.status.replace(/_/g, ' ')}
                  size="sm"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Invoices */}
        {dashboardData?.recentInvoices?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recent Invoices"
              actionLabel="View All"
              onAction={() => navigation.navigate('Invoices')}
            />
            {dashboardData.recentInvoices.slice(0, 3).map((invoice: any) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceCard}
                onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
              >
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
                  <Text style={styles.invoiceDue}>Due: {formatDate(invoice.dueDate)}</Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total)}</Text>
                  <StatusBadge
                    status={getStatusType(invoice.status)}
                    label={invoice.status}
                    size="sm"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pending Contracts */}
        {dashboardData?.pendingContracts?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Contracts Awaiting Signature"
              count={dashboardData.pendingContracts.length}
            />
            {dashboardData.pendingContracts.map((contract: any) => (
              <TouchableOpacity
                key={contract.id}
                style={styles.contractCard}
                onPress={() => navigation.navigate('ContractDetail', { id: contract.id })}
              >
                <Ionicons name="document-text-outline" size={24} color={colors.warning} />
                <View style={styles.contractInfo}>
                  <Text style={styles.contractTitle}>{contract.title}</Text>
                  <Text style={styles.contractValue}>
                    Value: {formatCurrency(contract.totalValue)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.signButton}>
                  <Text style={styles.signButtonText}>Sign</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  clientBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  clientBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  balanceDue: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  payButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statsGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  projectInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  projectName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  projectProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    width: 32,
  },
  invoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  invoiceDue: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  invoiceAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  contractCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  contractInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contractTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  contractValue: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  signButton: {
    backgroundColor: portalColors.client,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  signButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
})
