import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { AffiliateReferral } from '../../types'

interface ReferralsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function ReferralsScreen({ navigation, hideHeader }: ReferralsScreenProps) {
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReferrals = async () => {
    try {
      const data = await api.getAffiliateReferrals()
      setReferrals(data.referrals)
    } catch (error) {
      console.error('Failed to fetch referrals:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReferrals()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchReferrals()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return 'checkmark-circle'
      case 'SIGNED_UP':
        return 'person-add'
      case 'PENDING':
        return 'time'
      case 'EXPIRED':
        return 'close-circle'
      default:
        return 'help-circle'
    }
  }

  const renderReferral = ({ item }: { item: AffiliateReferral }) => (
    <View style={styles.referralCard}>
      <View style={styles.referralIcon}>
        <Ionicons
          name={getStatusIcon(item.status)}
          size={24}
          color={
            item.status === 'CONVERTED'
              ? colors.success
              : item.status === 'EXPIRED'
              ? colors.error
              : portalColors.affiliate
          }
        />
      </View>
      <View style={styles.referralInfo}>
        <View style={styles.referralHeader}>
          <Text style={styles.referralCode}>#{item.referralCode}</Text>
          <StatusBadge status={getStatusType(item.status)} label={item.status} size="sm" />
        </View>
        {item.referredName && (
          <Text style={styles.referredName}>{item.referredName}</Text>
        )}
        <View style={styles.referralFooter}>
          <Text style={styles.referralDate}>{formatDate(item.createdAt)}</Text>
          {item.pointsEarned > 0 && (
            <Text style={styles.pointsEarned}>+{item.pointsEarned} pts</Text>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Referrals</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      <FlatList
        data={referrals}
        renderItem={renderReferral}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.affiliate} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="people-outline"
              title="No referrals yet"
              description="Share your link to start earning points"
              actionLabel="Share Link"
              onAction={() => navigation.navigate('Share')}
            />
          ) : null
        }
      />
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
  placeholder: {
    width: 40,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  referralCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  referralIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  referralInfo: {
    flex: 1,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  referralCode: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  referredName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  referralFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pointsEarned: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
})
