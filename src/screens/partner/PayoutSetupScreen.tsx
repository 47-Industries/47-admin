import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth'
import { api } from '../../services/api'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface PayoutSetupScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
}

export function PayoutSetupScreen({ navigation }: PayoutSetupScreenProps) {
  const partner = useAuthStore((state) => state.partner)
  const [loading, setLoading] = useState(false)

  const stripeStatus = partner?.stripeConnectStatus || 'NOT_CONNECTED'
  const isConnected = stripeStatus === 'CONNECTED'
  const isPending = stripeStatus === 'PENDING_VERIFICATION'

  const handleConnectStripe = async () => {
    setLoading(true)
    try {
      const response = await api.createStripeConnectLink()
      if (response.url) {
        await Linking.openURL(response.url)
      } else {
        Alert.alert('Error', 'Could not generate Stripe Connect link. Please try again or contact support.')
      }
    } catch (error: any) {
      console.error('Stripe Connect error:', error)
      Alert.alert(
        'Setup Unavailable',
        'Unable to start the payout setup process right now. Please try again later or set up payouts through the web portal at admin.47industries.com.',
        [
          { text: 'OK' },
          { text: 'Open Web Portal', onPress: () => Linking.openURL('https://admin.47industries.com/partner') },
        ]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDashboard = async () => {
    setLoading(true)
    try {
      const response = await api.getStripeConnectDashboard()
      if (response.url) {
        await Linking.openURL(response.url)
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open Stripe dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const accentColor = portalColors.partner

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIcon,
              isConnected ? styles.statusIconConnected : isPending ? styles.statusIconPending : styles.statusIconNotConnected
            ]}>
              <Ionicons
                name={isConnected ? 'checkmark-circle' : isPending ? 'time' : 'alert-circle'}
                size={32}
                color={isConnected ? colors.success : isPending ? colors.warning : colors.error}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isConnected ? 'Payouts Active' : isPending ? 'Verification Pending' : 'Setup Required'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isConnected
                  ? 'Your bank account is connected and ready to receive payouts'
                  : isPending
                    ? 'Stripe is verifying your account information'
                    : 'Connect your bank account to receive commission payouts'}
              </Text>
            </View>
          </View>
        </Card>

        {/* How It Works */}
        <Text style={styles.sectionTitle}>How Payouts Work</Text>
        <Card style={styles.infoCard}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.stepNumberText, { color: accentColor }]}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Connect via Stripe</Text>
              <Text style={styles.stepDesc}>
                We use Stripe for secure, instant payouts. Connect your bank account or debit card.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.stepNumberText, { color: accentColor }]}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Earn Commissions</Text>
              <Text style={styles.stepDesc}>
                Submit leads and referrals. Earn commissions when your referrals convert.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.stepNumberText, { color: accentColor }]}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Get Paid</Text>
              <Text style={styles.stepDesc}>
                Once approved, commissions are paid out directly to your connected account.
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Button */}
        {!isConnected && (
          <Button
            title={isPending ? 'Continue Verification' : 'Connect Bank Account'}
            onPress={handleConnectStripe}
            loading={loading}
            style={styles.connectButton}
          />
        )}

        {isConnected && (
          <Button
            title="Open Stripe Dashboard"
            variant="outline"
            onPress={handleOpenDashboard}
            loading={loading}
            style={styles.connectButton}
          />
        )}

        {/* Alternative Options */}
        <Card style={styles.alternativeCard}>
          <Text style={styles.alternativeTitle}>Having trouble?</Text>
          <Text style={styles.alternativeDesc}>
            You can also set up payouts through the web portal or contact our support team for assistance.
          </Text>
          <View style={styles.alternativeButtons}>
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => Linking.openURL('https://admin.47industries.com/partner')}
            >
              <Ionicons name="globe-outline" size={18} color={accentColor} />
              <Text style={[styles.alternativeButtonText, { color: accentColor }]}>Web Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => Linking.openURL('mailto:support@47industries.com?subject=Partner%20Payout%20Setup%20Help')}
            >
              <Ionicons name="mail-outline" size={18} color={accentColor} />
              <Text style={[styles.alternativeButtonText, { color: accentColor }]}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Your Rates */}
        {partner && (
          <>
            <Text style={styles.sectionTitle}>Your Commission Rates</Text>
            <Card style={styles.ratesCard}>
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>First Sale Commission</Text>
                <Text style={[styles.rateValue, { color: accentColor }]}>{partner.firstSaleRate || 0}%</Text>
              </View>
              <View style={styles.rateDivider} />
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Recurring Commission</Text>
                <Text style={[styles.rateValue, { color: accentColor }]}>{partner.recurringRate || 0}%</Text>
              </View>
              <View style={styles.rateDivider} />
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Shop Sales Commission</Text>
                <Text style={[styles.rateValue, { color: accentColor }]}>{partner.shopCommissionRate || 0}%</Text>
              </View>
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconConnected: {
    backgroundColor: `${colors.success}20`,
  },
  statusIconPending: {
    backgroundColor: `${colors.warning}20`,
  },
  statusIconNotConnected: {
    backgroundColor: `${colors.error}20`,
  },
  statusInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  connectButton: {
    marginBottom: spacing.lg,
  },
  alternativeCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  alternativeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alternativeDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  alternativeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
  },
  alternativeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  ratesCard: {
    padding: spacing.lg,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  rateDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
})
