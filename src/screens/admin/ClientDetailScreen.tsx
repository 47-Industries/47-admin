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

interface ClientDetailScreenProps {
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
  INACTIVE: 'default',
  SUSPENDED: 'error',
  LEAD: 'warning',
}

const typeLabels: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
}

export function ClientDetailScreen({ navigation, route }: ClientDetailScreenProps) {
  const { id } = route.params
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchClient = async () => {
    try {
      const data = await api.getAdminClient(id)
      setClient(data.client)
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchClient()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchClient()
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

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Client not found</Text>
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
        <Text style={styles.title}>Client Details</Text>
      </View>

      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, client.status === 'SUSPENDED' && styles.avatarSuspended]}>
            <Text style={styles.avatarText}>{getInitials(client.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{client.name}</Text>
            <Text style={styles.profileNumber}>#{client.clientNumber}</Text>
            {client.company && (
              <Text style={styles.profileCompany}>{client.company}</Text>
            )}
            <Text style={styles.profileEmail}>{client.email}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge text={client.status} variant={statusColors[client.status] || 'default'} />
          <Badge text={typeLabels[client.type] || client.type} variant="primary" />
          {client.autopayEnabled && <Badge text="Autopay" variant="success" />}
        </View>
      </Card>

      {/* Financial Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Revenue</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(Number(client.totalRevenue || client.totalInvoiced || 0))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Outstanding</Text>
          <Text style={[styles.statValue, { color: Number(client.totalOutstanding) > 0 ? colors.warning : colors.text }]}>
            {formatCurrency(Number(client.totalOutstanding || 0))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Projects</Text>
          <Text style={styles.statValue}>{client.projects?.length || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Invoices</Text>
          <Text style={styles.statValue}>{client.invoices?.length || 0}</Text>
        </View>
      </View>

      {/* Recent Invoices */}
      {client.invoices && client.invoices.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          {client.invoices.slice(0, 5).map((invoice: any) => (
            <View key={invoice.id} style={styles.invoiceItem}>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{formatDate(invoice.createdAt)}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>{formatCurrency(Number(invoice.total))}</Text>
                <Badge
                  text={invoice.status}
                  variant={invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'error' : 'warning'}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Active Projects */}
      {client.projects && client.projects.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {client.projects.slice(0, 5).map((project: any) => (
            <View key={project.id} style={styles.projectItem}>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectDate}>Started {formatDate(project.startDate)}</Text>
              </View>
              <Badge
                text={project.status}
                variant={project.status === 'COMPLETED' ? 'success' : project.status === 'ACTIVE' ? 'primary' : 'default'}
              />
            </View>
          ))}
        </Card>
      )}

      {/* Contact Info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <Text style={styles.contactText}>{client.email}</Text>
        </View>
        {client.phone && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>{client.phone}</Text>
          </View>
        )}
        {client.address && (
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>{client.address}</Text>
          </View>
        )}
        <View style={styles.contactRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <Text style={styles.contactText}>Client since {formatDate(client.createdAt)}</Text>
        </View>
      </Card>

      {/* Notes */}
      {client.notes && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{client.notes}</Text>
        </Card>
      )}

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
  avatarSuspended: {
    backgroundColor: colors.error,
    opacity: 0.7,
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
  profileCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
    flexWrap: 'wrap',
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
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  invoiceDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  invoiceAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  projectDate: {
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
    flex: 1,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
})
