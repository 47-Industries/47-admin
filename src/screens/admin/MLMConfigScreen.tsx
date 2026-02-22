import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

const PURPLE = colors.purple

interface MLMConfigScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
}

interface MLMLevel {
  id: string
  level: number
  label: string
  rate: number
  isActive: boolean
}

export function MLMConfigScreen({ navigation }: MLMConfigScreenProps) {
  const [levels, setLevels] = useState<MLMLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingLevel, setEditingLevel] = useState<number | null>(null)
  const [draftRates, setDraftRates] = useState<Record<number, string>>({})

  const fetchConfig = async () => {
    try {
      const data = await api.getAdminMLMConfig()
      setLevels(data.levels || [])
      const rates: Record<number, string> = {}
      for (const l of data.levels || []) {
        rates[l.level] = String(l.rate)
      }
      setDraftRates(rates)
    } catch (error) {
      console.error('Failed to fetch MLM config:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchConfig()
  }

  const handleSaveLevel = async (level: MLMLevel) => {
    const newRate = parseFloat(draftRates[level.level] || String(level.rate))
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      Alert.alert('Invalid Rate', 'Rate must be between 0 and 100.')
      return
    }

    setSaving(true)
    try {
      await api.updateAdminMLMConfig(level.level, { rate: newRate })
      setEditingLevel(null)
      fetchConfig()
      Alert.alert('Saved', `Level ${level.level} rate updated to ${newRate}%.`)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (level: MLMLevel) => {
    setSaving(true)
    try {
      await api.updateAdminMLMConfig(level.level, { isActive: !level.isActive })
      fetchConfig()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>MLM Override Config</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        {/* Explainer */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={PURPLE} />
          <Text style={styles.infoText}>
            Override commissions are calculated on the downline partner's earned commission —
            not the deal value. Changes take effect on new commissions only.
          </Text>
        </View>

        {/* Level cards */}
        {levels.map((level) => (
          <View key={level.id} style={[styles.levelCard, !level.isActive && styles.levelCardInactive]}>
            <View style={styles.levelHeader}>
              <View style={[styles.levelBadge, { backgroundColor: level.level === 1 ? `${colors.success}20` : `${PURPLE}20` }]}>
                <Text style={[styles.levelBadgeText, { color: level.level === 1 ? colors.success : PURPLE }]}>
                  Level {level.level}
                </Text>
              </View>
              <Text style={styles.levelLabel}>{level.label}</Text>
              <Switch
                value={level.isActive}
                onValueChange={() => handleToggleActive(level)}
                trackColor={{ false: colors.border, true: `${PURPLE}80` }}
                thumbColor={level.isActive ? PURPLE : colors.textMuted}
                disabled={saving}
              />
            </View>

            <View style={styles.levelBody}>
              <View style={styles.rateSection}>
                <Text style={styles.rateLabel}>Override Rate</Text>
                {editingLevel === level.level ? (
                  <View style={styles.rateEditRow}>
                    <TextInput
                      style={styles.rateInput}
                      value={draftRates[level.level]}
                      onChangeText={(text) => setDraftRates({ ...draftRates, [level.level]: text })}
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                    />
                    <Text style={styles.ratePercent}>%</Text>
                    <TouchableOpacity
                      style={styles.saveRateButton}
                      onPress={() => handleSaveLevel(level)}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color={colors.text} />
                      ) : (
                        <Text style={styles.saveRateText}>Save</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelRateButton}
                      onPress={() => {
                        setEditingLevel(null)
                        setDraftRates({ ...draftRates, [level.level]: String(level.rate) })
                      }}
                    >
                      <Text style={styles.cancelRateText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.rateDisplayRow}>
                    <Text style={[styles.rateValue, { color: level.level === 1 ? colors.success : PURPLE }]}>
                      {level.rate}%
                    </Text>
                    <TouchableOpacity
                      style={styles.editRateButton}
                      onPress={() => setEditingLevel(level.level)}
                    >
                      <Ionicons name="pencil" size={14} color={colors.textMuted} />
                      <Text style={styles.editRateText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.rateDesc}>
                <Ionicons name="git-network-outline" size={14} color={colors.textMuted} />
                <Text style={styles.rateDescText}>
                  {level.level === 1
                    ? 'Earned when a partner you directly recruited makes a sale'
                    : `Earned when a Level ${level.level - 1} recruit's recruit makes a sale`}
                </Text>
              </View>
            </View>

            {!level.isActive && (
              <View style={styles.inactiveBanner}>
                <Text style={styles.inactiveBannerText}>Inactive — no new overrides will be created at this level</Text>
              </View>
            )}
          </View>
        ))}

        {levels.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="git-network-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No levels configured</Text>
            <Text style={styles.emptyDesc}>
              Add MLM levels via the database or API seed script.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${PURPLE}10`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${PURPLE}30`,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  levelCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  levelCardInactive: {
    opacity: 0.6,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  levelBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  levelLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  levelBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  rateSection: {
    gap: spacing.xs,
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rateValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  editRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.sm,
  },
  editRateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rateInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 70,
    textAlign: 'center',
  },
  ratePercent: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  saveRateButton: {
    backgroundColor: PURPLE,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  saveRateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cancelRateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cancelRateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rateDesc: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rateDescText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  inactiveBanner: {
    backgroundColor: colors.warningBg,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inactiveBannerText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
