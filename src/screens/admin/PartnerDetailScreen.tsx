import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface PartnerDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  INACTIVE: 'default',
}

const typeLabels: Record<string, string> = {
  SERVICE_REFERRAL: 'Service Referral',
  PRODUCT_AFFILIATE: 'Product Affiliate',
  BOTH: 'Full Partner',
  FULL_PARTNER: 'Full Partner',
}

export function PartnerDetailScreen({ navigation, route }: PartnerDetailScreenProps) {
  const { id } = route.params
  const [partner, setPartner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPartner = async () => {
    try {
      const data = await api.getAdminPartner(id)
      setPartner(data.partner)
    } catch (error) {
      console.error('Failed to fetch partner:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPartner()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchPartner()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!partner) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Partner not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Partner Details</Text>
      </View>

      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(partner.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{partner.name}</Text>
            <Text style={styles.profileNumber}>#{partner.partnerNumber}</Text>
            <Text style={styles.profileEmail}>{partner.email}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge text={partner.status} variant={statusColors[partner.status] || 'default'} />
          <Badge text={typeLabels[partner.partnerType] || partner.partnerType} variant="primary" />
        </View>
      </Card>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Earned</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(Number(partner.totalEarned))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {formatCurrency(Number(partner.pendingAmount))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Text style={styles.statValue}>
            {formatCurrency(Number(partner.totalPaid))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Leads</Text>
          <Text style={styles.statValue}>{partner.leads?.length || 0}</Text>
        </View>
      </View>

      {/* Commission Rates */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Commission Rates</Text>
        <View style={styles.ratesRow}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>First Sale</Text>
            <Text style={styles.rateValue}>{partner.firstSaleRate || 0}%</Text>
          </View>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Recurring</Text>
            <Text style={styles.rateValue}>{partner.recurringRate || 0}%</Text>
          </View>
          {partner.shopCommissionRate && (
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Shop</Text>
              <Text style={styles.rateValue}>{partner.shopCommissionRate}%</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Recent Leads */}
      {partner.leads && partner.leads.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Leads</Text>
          {partner.leads.slice(0, 5).map((lead: any) => (
            <View key={lead.id} style={styles.leadItem}>
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{lead.businessName}</Text>
                <Text style={styles.leadDate}>{formatDate(lead.createdAt)}</Text>
              </View>
              <Badge text={lead.status} variant={lead.status === 'WON' ? 'success' : 'default'} />
            </View>
          ))}
        </Card>
      )}

      {/* Contact Info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <Text style={styles.contactText}>{partner.email}</Text>
        </View>
        {partner.phone && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>{partner.phone}</Text>
          </View>
        )}
        <View style={styles.contactRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <Text style={styles.contactText}>Partner since {formatDate(partner.createdAt)}</Text>
        </View>
      </Card>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backIcon: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  rateItem: {},
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  leadItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  leadDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
})
