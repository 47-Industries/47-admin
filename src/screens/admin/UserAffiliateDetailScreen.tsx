import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface UserAffiliateDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

interface UserAffiliate {
  id: string
  affiliateCode: string
  motorevUserId: string | null
  motorevEmail: string | null
  connectedAt: string | null
  shopCommissionRate: number
  motorevProBonus: number
  retentionBonus: number
  isPartner: boolean
  totalReferrals: number
  totalEarnings: number
  pendingEarnings: number
  proTimeEarnedDays: number
  rewardPreference: string
  totalPoints: number
  availablePoints: number
  pointsRedeemed: number
  user: {
    id: string
    name: string | null
    email: string | null
  }
  partner: {
    id: string
    name: string
  } | null
  createdAt: string
  referrals?: Referral[]
  commissions?: Commission[]
}

interface Referral {
  id: string
  platform: string
  eventType: string
  motorevEmail: string | null
  status: string
  convertedAt: string | null
  createdAt: string
  pointsAwarded: number
}

interface Commission {
  id: string
  type: string
  baseAmount: number
  rate: number | null
  amount: number
  rewardType: string
  proTimeDays: number | null
  status: string
  createdAt: string
}

interface PointTransaction {
  id: string
  type: string
  points: number
  description: string | null
  motorevEmail: string | null
  createdAt: string
}

const tierColors: Record<string, string> = {
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
  PLATINUM: '#e5e4e2',
}

type Tab = 'overview' | 'referrals' | 'commissions' | 'points'

export function UserAffiliateDetailScreen({ navigation, route }: UserAffiliateDetailScreenProps) {
  const { id } = route.params
  const [affiliate, setAffiliate] = useState<UserAffiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Modals
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [pointsModalVisible, setPointsModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    affiliateCode: '',
    isPartner: false,
    rewardPreference: 'PRO_TIME',
  })

  // Points adjustment form
  const [pointsForm, setPointsForm] = useState({
    points: '',
    reason: '',
    isAddition: true,
  })

  const fetchAffiliate = useCallback(async () => {
    try {
      const data = await api.getAdminUserAffiliate(id)
      setAffiliate(data.affiliate)
      setReferrals(data.referrals || [])
      setCommissions(data.commissions || [])
    } catch (error) {
      console.error('Failed to fetch user affiliate:', error)
      Alert.alert('Error', 'Failed to load affiliate details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  const fetchPointTransactions = useCallback(async () => {
    try {
      const data = await api.getAdminUserAffiliatePoints(id)
      setPointTransactions(data.transactions || [])
    } catch (error) {
      console.error('Failed to fetch point transactions:', error)
    }
  }, [id])

  useEffect(() => {
    fetchAffiliate()
  }, [fetchAffiliate])

  useEffect(() => {
    if (activeTab === 'points') {
      fetchPointTransactions()
    }
  }, [activeTab, fetchPointTransactions])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAffiliate()
    if (activeTab === 'points') {
      fetchPointTransactions()
    }
  }

  const getTier = (points: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' => {
    if (points >= 10000) return 'PLATINUM'
    if (points >= 5000) return 'GOLD'
    if (points >= 1000) return 'SILVER'
    return 'BRONZE'
  }

  const getNextTierProgress = (points: number): { nextTier: string; progress: number; pointsNeeded: number } => {
    if (points >= 10000) {
      return { nextTier: 'PLATINUM', progress: 100, pointsNeeded: 0 }
    }
    if (points >= 5000) {
      return { nextTier: 'PLATINUM', progress: ((points - 5000) / 5000) * 100, pointsNeeded: 10000 - points }
    }
    if (points >= 1000) {
      return { nextTier: 'GOLD', progress: ((points - 1000) / 4000) * 100, pointsNeeded: 5000 - points }
    }
    return { nextTier: 'SILVER', progress: (points / 1000) * 100, pointsNeeded: 1000 - points }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return '$' + amount.toFixed(2)
  }

  const formatProTime = (days: number) => {
    if (days < 30) return `${days} days`
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months} months`
  }

  const openEditModal = () => {
    if (affiliate) {
      setEditForm({
        affiliateCode: affiliate.affiliateCode,
        isPartner: affiliate.isPartner,
        rewardPreference: affiliate.rewardPreference,
      })
      setEditModalVisible(true)
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await api.updateAdminUserAffiliate(id, {
        affiliateCode: editForm.affiliateCode,
        isPartner: editForm.isPartner,
        rewardPreference: editForm.rewardPreference,
      })
      setEditModalVisible(false)
      fetchAffiliate()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update affiliate')
    } finally {
      setSaving(false)
    }
  }

  const openPointsModal = (isAddition: boolean) => {
    setPointsForm({
      points: '',
      reason: '',
      isAddition,
    })
    setPointsModalVisible(true)
  }

  const handleAdjustPoints = async () => {
    const pointsValue = parseInt(pointsForm.points)
    if (isNaN(pointsValue) || pointsValue <= 0) {
      Alert.alert('Error', 'Please enter a valid number of points')
      return
    }
    if (!pointsForm.reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the adjustment')
      return
    }

    setSaving(true)
    try {
      const adjustedPoints = pointsForm.isAddition ? pointsValue : -pointsValue
      await api.adjustAdminUserAffiliatePoints(id, adjustedPoints, pointsForm.reason)
      setPointsModalVisible(false)
      fetchAffiliate()
      if (activeTab === 'points') {
        fetchPointTransactions()
      }
      Alert.alert('Success', `${Math.abs(adjustedPoints)} points ${pointsForm.isAddition ? 'added' : 'subtracted'}`)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to adjust points')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAffiliate = () => {
    if (!affiliate) return

    Alert.alert(
      'Delete User Affiliate',
      `Are you sure you want to delete this affiliate account for ${affiliate.user?.name || affiliate.user?.email}? This will delete all referrals, commissions, and point history. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteAdminUserAffiliate(id)
              Alert.alert('Success', 'User affiliate deleted successfully')
              navigation.goBack()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete user affiliate')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleToggleStatus = async () => {
    if (!affiliate) return

    Alert.alert(
      affiliate.connectedAt ? 'Deactivate Affiliate' : 'Activate Affiliate',
      affiliate.connectedAt
        ? 'This will disconnect the affiliate from MotoRev. They will need to reconnect.'
        : 'This will mark the affiliate as active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.updateAdminUserAffiliate(id, {
                // Toggle connection status
                connectedAt: affiliate.connectedAt ? null : new Date().toISOString(),
              })
              fetchAffiliate()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update status')
            }
          },
        },
      ]
    )
  }

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      SIGNUP: 'Signup',
      PRO_CONVERSION: 'Pro Conversion',
      RETENTION: 'Retention',
      ORDER: 'Shop Order',
      VERIFIED_SIGNUP: 'Verified Signup',
    }
    return labels[event] || event
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: colors.warning,
      APPROVED: colors.primary,
      PAID: colors.success,
      APPLIED: colors.purpleAlt,
      COMPLETED: colors.success,
    }
    return colors[status] || '#6b7280'
  }

  const renderOverviewTab = () => {
    if (!affiliate) return null

    const tier = getTier(affiliate.totalPoints || 0)
    const tierProgress = getNextTierProgress(affiliate.totalPoints || 0)

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Card */}
        <Card style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {(affiliate.user?.name || affiliate.user?.email || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {affiliate.user?.name || affiliate.user?.email || 'Unknown'}
              </Text>
              <Text style={styles.profileEmail}>{affiliate.user?.email}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.affiliateCode}>{affiliate.affiliateCode}</Text>
                <TouchableOpacity onPress={openEditModal}>
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Badge
              text={tier}
              variant="default"
              style={{ backgroundColor: tierColors[tier] + '30' }}
            />
            {affiliate.connectedAt && (
              <Badge text="MotoRev Connected" variant="success" />
            )}
            {affiliate.isPartner && (
              <Badge text="Partner" variant="primary" />
            )}
            <Badge
              text={affiliate.rewardPreference === 'PRO_TIME' ? 'Pro Time' : 'Cash'}
              variant="default"
            />
          </View>
        </Card>

        {/* Tier Progress Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Tier Progress</Text>
          <View style={styles.tierProgressContainer}>
            <View style={styles.tierLabels}>
              <Text style={styles.currentTierLabel}>{tier}</Text>
              {tierProgress.nextTier !== tier && (
                <Text style={styles.nextTierLabel}>{tierProgress.nextTier}</Text>
              )}
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${Math.min(tierProgress.progress, 100)}%` }]}
              />
            </View>
            {tierProgress.pointsNeeded > 0 && (
              <Text style={styles.pointsNeeded}>
                {tierProgress.pointsNeeded.toLocaleString()} points to {tierProgress.nextTier.toLowerCase()}
              </Text>
            )}
          </View>
        </Card>

        {/* Points Card */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Points</Text>
            <View style={styles.pointsActions}>
              <TouchableOpacity
                style={styles.pointsActionBtn}
                onPress={() => openPointsModal(true)}
              >
                <Ionicons name="add" size={18} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pointsActionBtn}
                onPress={() => openPointsModal(false)}
              >
                <Ionicons name="remove" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.pointsGrid}>
            <View style={styles.pointsItem}>
              <Text style={styles.pointsValue}>{(affiliate.totalPoints || 0).toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>Lifetime</Text>
            </View>
            <View style={styles.pointsItem}>
              <Text style={[styles.pointsValue, { color: colors.success }]}>
                {(affiliate.availablePoints || 0).toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>Available</Text>
            </View>
            <View style={styles.pointsItem}>
              <Text style={[styles.pointsValue, { color: colors.textMuted }]}>
                {(affiliate.pointsRedeemed || 0).toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>Redeemed</Text>
            </View>
          </View>
        </Card>

        {/* Stats Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.totalReferrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatCurrency(affiliate.totalEarnings || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {formatCurrency(affiliate.pendingEarnings || 0)}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.purple }]}>
                {formatProTime(affiliate.proTimeEarnedDays || 0)}
              </Text>
              <Text style={styles.statLabel}>Pro Time Earned</Text>
            </View>
          </View>
        </Card>

        {/* MotoRev Connection */}
        {affiliate.motorevEmail && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>MotoRev Connection</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MotoRev Email</Text>
              <Text style={styles.infoValue}>{affiliate.motorevEmail}</Text>
            </View>
            {affiliate.motorevUserId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MotoRev User ID</Text>
                <Text style={styles.infoValue}>{affiliate.motorevUserId}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Connected On</Text>
              <Text style={styles.infoValue}>
                {affiliate.connectedAt ? formatDate(affiliate.connectedAt) : 'Not connected'}
              </Text>
            </View>
          </Card>
        )}

        {/* Commission Rates */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Commission Rates</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shop Commission</Text>
            <Text style={styles.infoValue}>{(affiliate.shopCommissionRate * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MotoRev Pro Bonus</Text>
            <Text style={styles.infoValue}>{formatCurrency(affiliate.motorevProBonus)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Retention Bonus</Text>
            <Text style={styles.infoValue}>{formatCurrency(affiliate.retentionBonus)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{formatDate(affiliate.createdAt)}</Text>
          </View>
        </Card>

        {/* Actions */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleStatus}>
            <Ionicons
              name={affiliate.connectedAt ? 'close-circle-outline' : 'checkmark-circle-outline'}
              size={20}
              color={affiliate.connectedAt ? colors.warning : colors.success}
            />
            <Text style={[styles.actionButtonText, { color: affiliate.connectedAt ? colors.warning : colors.success }]}>
              {affiliate.connectedAt ? 'Disconnect from MotoRev' : 'Mark as Active'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit Affiliate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAction]}
            onPress={handleDeleteAffiliate}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              {deleting ? 'Deleting...' : 'Delete Affiliate'}
            </Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    )
  }

  const renderReferralsTab = () => (
    <FlatList
      data={referrals}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.emptyTab}>
          <Ionicons name="share-social-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTabText}>No referrals yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.listCard}>
          <View style={styles.listCardHeader}>
            <View>
              <Text style={styles.listCardTitle}>
                {item.motorevEmail || 'Anonymous User'}
              </Text>
              <Text style={styles.listCardSubtitle}>{formatDate(item.createdAt)}</Text>
            </View>
            <Badge
              text={item.convertedAt ? 'Completed' : 'Pending'}
              variant={item.convertedAt ? 'success' : 'warning'}
            />
          </View>
          <View style={styles.listCardDetails}>
            <View style={styles.listCardDetail}>
              <Text style={styles.detailLabel}>Platform</Text>
              <Text style={styles.detailValue}>{item.platform}</Text>
            </View>
            <View style={styles.listCardDetail}>
              <Text style={styles.detailLabel}>Event</Text>
              <Text style={styles.detailValue}>{getEventLabel(item.eventType)}</Text>
            </View>
            <View style={styles.listCardDetail}>
              <Text style={styles.detailLabel}>Points</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>
                +{item.pointsAwarded || 0}
              </Text>
            </View>
          </View>
        </Card>
      )}
    />
  )

  const renderCommissionsTab = () => (
    <FlatList
      data={commissions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.emptyTab}>
          <Ionicons name="cash-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTabText}>No commissions yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.listCard}>
          <View style={styles.listCardHeader}>
            <View>
              <Text style={styles.listCardTitle}>{getEventLabel(item.type)}</Text>
              <Text style={styles.listCardSubtitle}>{formatDate(item.createdAt)}</Text>
            </View>
            <Badge
              text={item.status}
              variant={item.status === 'PAID' || item.status === 'APPLIED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'primary'}
            />
          </View>
          <View style={styles.listCardDetails}>
            <View style={styles.listCardDetail}>
              <Text style={styles.detailLabel}>Reward Type</Text>
              <Text style={styles.detailValue}>
                {item.rewardType === 'PRO_TIME' ? 'Pro Time' : 'Cash'}
              </Text>
            </View>
            <View style={styles.listCardDetail}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, { color: item.rewardType === 'CASH' ? colors.success : colors.purple }]}>
                {item.rewardType === 'CASH' ? formatCurrency(item.amount) : `${item.proTimeDays || 0}d Pro`}
              </Text>
            </View>
          </View>
        </Card>
      )}
    />
  )

  const renderPointsTab = () => (
    <FlatList
      data={pointTransactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        affiliate && (
          <View style={styles.pointsHeader}>
            <View style={styles.pointsHeaderItem}>
              <Text style={styles.pointsHeaderValue}>
                {(affiliate.availablePoints || 0).toLocaleString()}
              </Text>
              <Text style={styles.pointsHeaderLabel}>Available Points</Text>
            </View>
            <View style={styles.pointsHeaderActions}>
              <TouchableOpacity
                style={[styles.pointsHeaderBtn, { backgroundColor: colors.successBg }]}
                onPress={() => openPointsModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.success} />
                <Text style={[styles.pointsHeaderBtnText, { color: colors.success }]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pointsHeaderBtn, { backgroundColor: colors.errorBg }]}
                onPress={() => openPointsModal(false)}
              >
                <Ionicons name="remove" size={20} color={colors.error} />
                <Text style={[styles.pointsHeaderBtnText, { color: colors.error }]}>Subtract</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      }
      ListEmptyComponent={
        <View style={styles.emptyTab}>
          <Ionicons name="star-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTabText}>No point transactions yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.listCard}>
          <View style={styles.listCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listCardTitle}>{getEventLabel(item.type)}</Text>
              <Text style={styles.listCardSubtitle}>
                {item.description || item.motorevEmail || formatDate(item.createdAt)}
              </Text>
            </View>
            <Text
              style={[
                styles.pointsAmount,
                { color: item.points >= 0 ? colors.success : colors.error },
              ]}
            >
              {item.points >= 0 ? '+' : ''}{item.points}
            </Text>
          </View>
        </Card>
      )}
    />
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!affiliate) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Affiliate not found</Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Affiliate</Text>
        <TouchableOpacity onPress={openEditModal} style={styles.headerActionBtn}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {(['overview', 'referrals', 'commissions', 'points'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'referrals' && renderReferralsTab()}
      {activeTab === 'commissions' && renderCommissionsTab()}
      {activeTab === 'points' && renderPointsTab()}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Affiliate</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Affiliate Code</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.affiliateCode}
              onChangeText={(text) => setEditForm({ ...editForm, affiliateCode: text.toUpperCase() })}
              placeholder="AFFILIATE123"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Reward Preference</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  editForm.rewardPreference === 'PRO_TIME' && styles.segmentActive,
                ]}
                onPress={() => setEditForm({ ...editForm, rewardPreference: 'PRO_TIME' })}
              >
                <Text
                  style={[
                    styles.segmentText,
                    editForm.rewardPreference === 'PRO_TIME' && styles.segmentTextActive,
                  ]}
                >
                  Pro Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  editForm.rewardPreference === 'CASH' && styles.segmentActive,
                ]}
                onPress={() => setEditForm({ ...editForm, rewardPreference: 'CASH' })}
              >
                <Text
                  style={[
                    styles.segmentText,
                    editForm.rewardPreference === 'CASH' && styles.segmentTextActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setEditForm({ ...editForm, isPartner: !editForm.isPartner })}
            >
              <Text style={styles.toggleLabel}>Partner Status</Text>
              <View style={[styles.toggleSwitch, editForm.isPartner && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, editForm.isPartner && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>

            <View style={styles.modalBottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Points Adjustment Modal */}
      <Modal
        visible={pointsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPointsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPointsModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {pointsForm.isAddition ? 'Add Points' : 'Subtract Points'}
            </Text>
            <TouchableOpacity onPress={handleAdjustPoints} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Points</Text>
            <TextInput
              style={styles.textInput}
              value={pointsForm.points}
              onChangeText={(text) => setPointsForm({ ...pointsForm, points: text.replace(/[^0-9]/g, '') })}
              placeholder="100"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={pointsForm.reason}
              onChangeText={(text) => setPointsForm({ ...pointsForm, reason: text })}
              placeholder="Enter reason for adjustment..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  errorText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  goBackButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  goBackText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  affiliateCode: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tierProgressContainer: {
    gap: spacing.sm,
  },
  tierLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentTierLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  nextTierLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceHover,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  pointsNeeded: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pointsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pointsActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pointsItem: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pointsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  deleteAction: {
    borderBottomWidth: 0,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
  listCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  listCardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  listCardDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  listCardDetail: {},
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginTop: spacing.xs,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTabText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  pointsHeader: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsHeaderItem: {},
  pointsHeaderValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  pointsHeaderLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  pointsHeaderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pointsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  pointsHeaderBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  pointsAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  saveText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  modalBody: {
    flex: 1,
    padding: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: colors.text,
    alignSelf: 'flex-end',
  },
  modalBottomSpacer: {
    height: 100,
  },
})
