import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface NewLeadScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
}

const interestOptions = [
  'Web Development',
  'App Development',
  'AI Solutions',
  '3D Printing',
  'Custom PC',
  'Repair Services',
  'Other',
]

export function NewLeadScreen({ navigation }: NewLeadScreenProps) {
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required')
      return
    }
    if (!contactName.trim()) {
      Alert.alert('Error', 'Contact name is required')
      return
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required')
      return
    }
    if (interests.length === 0) {
      Alert.alert('Error', 'Please select at least one interest')
      return
    }

    setLoading(true)
    try {
      await api.createPartnerLead({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        interests,
        notes: notes.trim() || undefined,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      })
      Alert.alert('Success', 'Lead submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Lead</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Enter business name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Name *</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Enter contact person's name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interests *</Text>
          <View style={styles.interestsGrid}>
            {interestOptions.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  interests.includes(interest) && styles.interestChipActive,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestChipText,
                    interests.includes(interest) && styles.interestChipTextActive,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estimated Value</Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.currencyTextInput}
              value={estimatedValue}
              onChangeText={setEstimatedValue}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes about this lead..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Lead'}
          </Text>
        </TouchableOpacity>

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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestChipActive: {
    backgroundColor: `${portalColors.partner}20`,
    borderColor: portalColors.partner,
  },
  interestChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  interestChipTextActive: {
    color: portalColors.partner,
    fontWeight: fontWeight.medium,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  currencySymbol: {
    paddingLeft: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  currencyTextInput: {
    flex: 1,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  submitButton: {
    backgroundColor: portalColors.partner,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
})
