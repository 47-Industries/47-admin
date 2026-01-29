import React, { useEffect, useState } from 'react'
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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface AffiliateDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}


interface Affiliate {
  id: string
  affiliateCode: string
  totalPoints: number
  availablePoints: number
  pointsRedeemed: number
  totalReferrals: number
  successfulReferrals: number
  proConversions: number
  proTimeEarnedDays: number
  totalEarnings: number
  pendingEarnings: number
  motorevProBonus: number
  retentionBonus: number
  isPartner: boolean
  rewardPreference: string
  createdAt: string
  user: {
    id: string
    name?: string
    email: string
    image?: string
  }
  referrals?: any[]
}

export function AffiliateDetailScreen({ navigation, route }: AffiliateDetailScreenProps) {
  const { id } = route.params
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    totalPoints: '',
    availablePoints: '',
    pointsRedeemed: '',
    totalReferrals: '',
    proTimeEarnedDays: '',
    totalEarnings: '',
    pendingEarnings: '',
    motorevProBonus: '',
    retentionBonus: '',
    isPartner: false,
  })

  const fetchAffiliate = async () => {
    try {
      const data = await api.getAdminAffiliate(id)
      setAffiliate(data.affiliate)
    } catch (error) {
      console.error('Failed to fetch affiliate:', error)
      Alert.alert('Error', 'Failed to load affiliate details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAffiliate()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAffiliate()
  }

  const openEditModal = () => {
    if (affiliate) {
      setEditForm({
        totalPoints: String(affiliate.totalPoints || 0),
        availablePoints: String(affiliate.availablePoints || 0),
        pointsRedeemed: String(affiliate.pointsRedeemed || 0),
        totalReferrals: String(affiliate.totalReferrals || 0),
        proTimeEarnedDays: String(affiliate.proTimeEarnedDays || 0),
        totalEarnings: String(affiliate.totalEarnings || 0),
        pendingEarnings: String(affiliate.pendingEarnings || 0),
        motorevProBonus: String(affiliate.motorevProBonus || 1),
        retentionBonus: String(affiliate.retentionBonus || 0.25),
        isPartner: affiliate.isPartner || false,
      })
      setEditModalVisible(true)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateAdminAffiliate(id, {
        totalPoints: parseInt(editForm.totalPoints) || 0,
        availablePoints: parseInt(editForm.availablePoints) || 0,
        pointsRedeemed: parseInt(editForm.pointsRedeemed) || 0,
        totalReferrals: parseInt(editForm.totalReferrals) || 0,
        proTimeEarnedDays: parseInt(editForm.proTimeEarnedDays) || 0,
        totalEarnings: parseFloat(editForm.totalEarnings) || 0,
        pendingEarnings: parseFloat(editForm.pendingEarnings) || 0,
        motorevProBonus: parseFloat(editForm.motorevProBonus) || 0,
        retentionBonus: parseFloat(editForm.retentionBonus) || 0,
        isPartner: editForm.isPartner,
      })
      setEditModalVisible(false)
      fetchAffiliate()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update affiliate')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Affiliate',
      'Are you sure you want to delete this affiliate? This will remove all their referral data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAdminAffiliate(id)
              navigation.goBack()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete affiliate')
            }
          },
        },
      ]
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

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
        <Text style={styles.headerTitle}>Affiliate Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openEditModal} style={styles.headerActionBtn}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerActionBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {(affiliate.user?.name || affiliate.user?.email || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {affiliate.user?.name || affiliate.user?.email}
              </Text>
              <Text style={styles.profileEmail}>{affiliate.user?.email}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.affiliateCode}>
                  {affiliate.affiliateCode}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.badgeRow}>
            {affiliate.isPartner && (
              <Badge text="Partner" variant="success" />
            )}
            <Badge
              text={affiliate.rewardPreference || 'PRO_TIME'}
              variant="default"
            />
          </View>
        </Card>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.totalPoints}</Text>
              <Text style={styles.statLabel}>Total Points</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.availablePoints}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.pointsRedeemed}</Text>
              <Text style={styles.statLabel}>Redeemed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.totalReferrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.successfulReferrals}</Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{affiliate.proConversions}</Text>
              <Text style={styles.statLabel}>Pro Conversions</Text>
            </View>
          </View>
        </Card>

        {/* Earnings Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Rewards & Earnings</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pro Days Earned</Text>
            <Text style={styles.infoValue}>{affiliate.proTimeEarnedDays || 0} days</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Earnings</Text>
            <Text style={styles.infoValue}>${(affiliate.totalEarnings || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Earnings</Text>
            <Text style={styles.infoValue}>${(affiliate.pendingEarnings || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MotoRev Pro Bonus</Text>
            <Text style={styles.infoValue}>${(affiliate.motorevProBonus || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Retention Bonus</Text>
            <Text style={styles.infoValue}>${(affiliate.retentionBonus || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{formatDate(affiliate.createdAt)}</Text>
          </View>
        </Card>

        {/* Referrals */}
        {affiliate.referrals && affiliate.referrals.length > 0 && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Recent Referrals</Text>
            {affiliate.referrals.slice(0, 5).map((referral: any) => (
              <View key={referral.id} style={styles.referralRow}>
                <View>
                  <Text style={styles.referralName}>
                    {referral.eventType || 'Referral'}
                  </Text>
                  <Text style={styles.referralDate}>{formatDate(referral.createdAt)}</Text>
                </View>
                <Badge
                  text={referral.convertedAt ? 'Converted' : 'Pending'}
                  variant={referral.convertedAt ? 'success' : 'default'}
                />
              </View>
            ))}
          </Card>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Points Section */}
            <Text style={styles.sectionLabel}>Points</Text>

            <Text style={styles.fieldLabel}>Total Points</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.totalPoints}
              onChangeText={(text) => setEditForm({ ...editForm, totalPoints: text })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Available Points</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.availablePoints}
              onChangeText={(text) => setEditForm({ ...editForm, availablePoints: text })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Points Redeemed</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.pointsRedeemed}
              onChangeText={(text) => setEditForm({ ...editForm, pointsRedeemed: text })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            {/* Stats Section */}
            <Text style={styles.sectionLabel}>Statistics</Text>

            <Text style={styles.fieldLabel}>Total Referrals</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.totalReferrals}
              onChangeText={(text) => setEditForm({ ...editForm, totalReferrals: text })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Pro Days Earned</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.proTimeEarnedDays}
              onChangeText={(text) => setEditForm({ ...editForm, proTimeEarnedDays: text })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            {/* Earnings Section */}
            <Text style={styles.sectionLabel}>Earnings</Text>

            <Text style={styles.fieldLabel}>Total Earnings ($)</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.totalEarnings}
              onChangeText={(text) => setEditForm({ ...editForm, totalEarnings: text })}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Pending Earnings ($)</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.pendingEarnings}
              onChangeText={(text) => setEditForm({ ...editForm, pendingEarnings: text })}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            {/* Commission Rates Section */}
            <Text style={styles.sectionLabel}>Commission Rates</Text>

            <Text style={styles.fieldLabel}>MotoRev Pro Bonus ($)</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.motorevProBonus}
              onChangeText={(text) => setEditForm({ ...editForm, motorevProBonus: text })}
              placeholder="1.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Retention Bonus ($)</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.retentionBonus}
              onChangeText={(text) => setEditForm({ ...editForm, retentionBonus: text })}
              placeholder="0.25"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            {/* Partner Status Section */}
            <Text style={styles.sectionLabel}>Status</Text>

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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  profileCard: {
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
    marginTop: 2,
  },
  codeRow: {
    marginTop: spacing.xs,
  },
  affiliateCode: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  infoCard: {
    marginBottom: spacing.md,
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
  referralRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  referralName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  referralDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomSpacer: {
    height: spacing.xxxl,
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
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
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
