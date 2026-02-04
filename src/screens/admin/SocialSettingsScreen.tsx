import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface SocialSettings {
  socialTwitter: string
  socialFacebook: string
  socialInstagram: string
  socialLinkedin: string
  socialDiscord: string
  socialTiktok: string
  socialReddit: string
}

const EMPTY_SETTINGS: SocialSettings = {
  socialTwitter: '',
  socialFacebook: '',
  socialInstagram: '',
  socialLinkedin: '',
  socialDiscord: '',
  socialTiktok: '',
  socialReddit: '',
}

const SOCIAL_FIELDS: { key: keyof SocialSettings; label: string; icon: string; placeholder: string }[] = [
  { key: 'socialTwitter', label: 'Twitter / X', icon: 'logo-twitter', placeholder: 'https://twitter.com/47industries' },
  { key: 'socialFacebook', label: 'Facebook', icon: 'logo-facebook', placeholder: 'https://facebook.com/47industries' },
  { key: 'socialInstagram', label: 'Instagram', icon: 'logo-instagram', placeholder: 'https://instagram.com/47industries' },
  { key: 'socialLinkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'https://linkedin.com/company/47industries' },
  { key: 'socialDiscord', label: 'Discord', icon: 'logo-discord', placeholder: 'https://discord.gg/47industries' },
  { key: 'socialTiktok', label: 'TikTok', icon: 'logo-tiktok', placeholder: 'https://tiktok.com/@47industries' },
  { key: 'socialReddit', label: 'Reddit', icon: 'logo-reddit', placeholder: 'https://reddit.com/user/47industries' },
]

export function SocialSettingsScreen({ navigation }: { navigation: any }) {
  const [settings, setSettings] = useState<SocialSettings>(EMPTY_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.getSettings()
      const s = data.settings || data
      const mapped: SocialSettings = { ...EMPTY_SETTINGS }
      for (const key of Object.keys(EMPTY_SETTINGS) as (keyof SocialSettings)[]) {
        if (s[key] !== undefined && s[key] !== null) {
          mapped[key] = String(s[key])
        }
      }
      setSettings(mapped)
    } catch (e) {
      console.error('Failed to load settings:', e)
      Alert.alert('Error', 'Failed to load social settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.updateSettings(settings)
      Alert.alert('Saved', 'Social media links updated')
    } catch (e) {
      console.error('Failed to save settings:', e)
      Alert.alert('Error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Social Media</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Social Media</Text>
        <TouchableOpacity onPress={saveSettings} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Add your social media profile URLs. These appear in the website footer and contact page.
        </Text>

        <Card style={styles.card}>
          {SOCIAL_FIELDS.map((field, index) => (
            <View key={field.key}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <Ionicons name={field.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={settings[field.key]}
                    onChangeText={(text) => setSettings({ ...settings, [field.key]: text })}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
                {settings[field.key] ? (
                  <TouchableOpacity
                    onPress={() => setSettings({ ...settings, [field.key]: '' })}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
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
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: fontSize.md,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
})
