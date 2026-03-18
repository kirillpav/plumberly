import React, { useReducer, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { DocumentPickerButton } from '@/components/shared/DocumentPickerButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import {
  isValidEmail,
  isValidPhone,
  isValidCompanyNumber,
  isValidUrl,
  isPositiveNumber,
  isValidPostcode,
} from '@/utils/validation';
import { uploadVettingDocument } from '@/lib/vettingUpload';
import { supabase } from '@/lib/supabase';
import {
  vettingFormReducer,
  initialVettingFormState,
  getFileFields,
  buildVettingMetadata,
  isNewCompany,
} from '@/types/vettingForm';
import type { VettingFormState, BusinessType, YearsTrading, GasHolder, FileSelection } from '@/types/vettingForm';
import type { ServicesType } from '@/types/index';

const REGIONS = ['North', 'East', 'South', 'West', 'Central'];
const YEARS_TRADING_OPTIONS: { value: YearsTrading; label: string }[] = [
  { value: '<6m', label: '< 6 months' },
  { value: '6-24m', label: '6-24 months' },
  { value: '2-5y', label: '2-5 years' },
  { value: '5+y', label: '5+ years' },
];
const TOTAL_STEPS = 4;

export function PlumberRegistrationScreen() {
  const nav = useNavigation();
  const signUp = useAuthStore((s) => s.signUp);
  const scrollRef = useRef<ScrollView>(null);
  const [state, dispatch] = useReducer(vettingFormReducer, initialVettingFormState);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = (field: keyof VettingFormState, value: any) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const setFile = (field: keyof VettingFormState, file: FileSelection | null) =>
    dispatch({ type: 'SET_FIELD', field, value: file });

  // ───── Validation per step ─────

  function validateStep1(): boolean {
    const e: Record<string, string | undefined> = {};
    if (!state.businessType) e.businessType = 'Select a business type';
    if (!state.email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(state.email)) e.email = 'Invalid email address';
    if (!state.password) e.password = 'Password is required';
    else if (state.password.length < 6) e.password = 'Must be at least 6 characters';
    if (!state.confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (state.password !== state.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!state.phone.trim()) e.phone = 'Phone is required';
    else if (!isValidPhone(state.phone)) e.phone = 'Invalid phone number';
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  function validateStep2(): boolean {
    const e: Record<string, string | undefined> = {};
    if (state.businessType === 'sole_trader') {
      if (!state.firstName.trim()) e.firstName = 'First name is required';
      if (!state.lastName.trim()) e.lastName = 'Last name is required';
      if (!state.tradingName.trim()) e.tradingName = 'Trading name is required';
      if (!state.homeAddressLine1.trim()) e.homeAddressLine1 = 'Address is required';
      if (!state.homeCity.trim()) e.homeCity = 'City is required';
      if (!state.homePostcode.trim()) e.homePostcode = 'Postcode is required';
      else if (!isValidPostcode(state.homePostcode)) e.homePostcode = 'Invalid postcode';
      if (!state.proofOfAddress) e.proofOfAddress = 'Proof of address is required';
      if (!state.basePostcode.trim()) e.basePostcode = 'Base postcode is required';
      if (!state.yearsTrading) e.yearsTrading = 'Select years trading';
      if (!state.invoiceProof) e.invoiceProof = 'Invoice proof is required';
    }
    if (state.businessType === 'limited_company') {
      if (!state.companyNumber.trim()) e.companyNumber = 'Company number is required';
      else if (!isValidCompanyNumber(state.companyNumber)) e.companyNumber = 'Invalid company number (8 digits or 2 letters + 6 digits)';
      if (!state.companyVerified) e.companyVerified = 'Please verify your company';
      if (state.companyVerified && state.companyStatus && state.companyStatus.toLowerCase() !== 'active')
        e.companyStatus = 'Company must be active';
      if (!state.yourRole.trim()) e.yourRole = 'Your role is required';
      if (state.officerConfirmation === null) e.officerConfirmation = 'Please confirm officer status';
      if (state.officerConfirmation === true) {
        if (!state.officerFirstName.trim()) e.officerFirstName = 'Officer first name is required';
        if (!state.officerLastName.trim()) e.officerLastName = 'Officer last name is required';
      }
      if (state.officerConfirmation === false) {
        if (!state.directorContactEmail.trim()) e.directorContactEmail = 'Director email is required';
        else if (!isValidEmail(state.directorContactEmail)) e.directorContactEmail = 'Invalid email';
        if (!state.directorContactPhone.trim()) e.directorContactPhone = 'Director phone is required';
        else if (!isValidPhone(state.directorContactPhone)) e.directorContactPhone = 'Invalid phone';
      }
      if (!state.tradingPostcode.trim()) e.tradingPostcode = 'Trading postcode is required';
      if (!state.serviceRadiusMiles.trim()) e.serviceRadiusMiles = 'Service radius is required';
      else if (!isPositiveNumber(state.serviceRadiusMiles)) e.serviceRadiusMiles = 'Must be greater than 0';
      if (state.companyWebsite.trim() && !isValidUrl(state.companyWebsite)) e.companyWebsite = 'Must be a valid URL (https://...)';
      if (isNewCompany(state.incorporationDate) && state.previousTradingBackground === null)
        e.previousTradingBackground = 'Please answer this question';
      if (
        isNewCompany(state.incorporationDate) &&
        state.previousTradingBackground === true &&
        !state.previousCompanyNumber.trim() &&
        !state.previousTradingProof
      )
        e.previousTradingProof = 'Provide previous company number or upload proof';
    }
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  function validateStep3(): boolean {
    const e: Record<string, string | undefined> = {};
    if (state.selectedRegions.length === 0) e.regions = 'Select at least one region';
    if (!state.servicesType) e.servicesType = 'Select services type';
    if (state.servicesType === 'gas') {
      if (state.businessType === 'sole_trader' && !state.gasSafeNumber.trim())
        e.gasSafeNumber = 'Gas Safe number is required';
      if (state.businessType === 'limited_company') {
        if (!state.gasHolder) e.gasHolder = 'Select Gas Safe holder';
        if (state.gasHolder === 'company' && !state.companyGasSafeNumber.trim())
          e.companyGasSafeNumber = 'Company Gas Safe number is required';
        if (state.gasHolder === 'engineer') {
          if (!state.engineerGasSafeNumber.trim()) e.engineerGasSafeNumber = 'Engineer Gas Safe number is required';
          if (!state.engineerGasSafeCards) e.engineerGasSafeCards = 'Gas Safe cards upload is required';
        }
      }
    }
    if (state.doesUnventedCylinders === null) e.doesUnventedCylinders = 'Please answer this question';
    if (state.doesUnventedCylinders === true && !state.unventedCertificate)
      e.unventedCertificate = 'Unvented certificate is required';
    if (state.hasPublicLiabilityInsurance === null) e.hasPublicLiabilityInsurance = 'Please answer this question';
    if (state.hasPublicLiabilityInsurance === true) {
      if (!state.insurerName.trim()) e.insurerName = 'Insurer name is required';
      if (!state.policyNumber.trim()) e.policyNumber = 'Policy number is required';
      if (!state.policyExpiryDate.trim()) e.policyExpiryDate = 'Expiry date is required';
      if (!state.coverAmount.trim()) e.coverAmount = 'Cover amount is required';
      if (!state.insuranceProof) e.insuranceProof = 'Insurance proof is required';
    }
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  function validateStep4(): boolean {
    const e: Record<string, string | undefined> = {};
    if (!state.legalEntitlementConfirmed) e.legalEntitlementConfirmed = 'You must confirm this';
    if (!state.independentContractorConfirmed) e.independentContractorConfirmed = 'You must confirm this';
    if (!state.termsPrivacyConfirmed) e.termsPrivacyConfirmed = 'You must accept terms';
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  const validators = [validateStep1, validateStep2, validateStep3, validateStep4];

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const handleNext = () => {
    if (loading) return;
    if (validators[step - 1]()) {
      setStep(step + 1);
      setErrors({});
      scrollToTop();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
      scrollToTop();
    } else {
      nav.goBack();
    }
  };

  // ───── Companies House Lookup ─────

  const verifyCompany = async () => {
    if (!state.companyNumber.trim()) {
      setErrors((prev) => ({ ...prev, companyNumber: 'Enter a company number first' }));
      return;
    }
    if (!isValidCompanyNumber(state.companyNumber)) {
      setErrors((prev) => ({ ...prev, companyNumber: 'Invalid company number format' }));
      return;
    }
    setCompanyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('companies-house-lookup', {
        body: { companyNumber: state.companyNumber.trim() },
      });
      if (error) throw error;
      if (!data) throw new Error('No data returned');
      dispatch({
        type: 'SET_COMPANY_DATA',
        data: {
          companyVerified: true,
          companyName: data.company_name ?? '',
          companyStatus: data.company_status ?? '',
          incorporationDate: data.date_of_creation ?? '',
          sicCodes: Array.isArray(data.sic_codes) ? data.sic_codes.join(', ') : (data.sic_codes ?? ''),
          directors: Array.isArray(data.directors) ? data.directors.join(', ') : (data.directors ?? ''),
          registeredOffice: typeof data.registered_office_address === 'object'
            ? Object.values(data.registered_office_address).filter(Boolean).join(', ')
            : (data.registered_office_address ?? ''),
        },
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.companyVerified;
        delete next.companyNumber;
        return next;
      });
    } catch (err: any) {
      Alert.alert('Lookup Failed', err.message ?? 'Could not verify company');
    } finally {
      setCompanyLoading(false);
    }
  };

  // ───── Submit ─────

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    setLoading(true);
    try {
      // 1. Determine business name / gas safe number for top-level fields
      const businessName =
        state.businessType === 'sole_trader'
          ? state.tradingName.trim()
          : state.companyName.trim();
      const gasSafeNumber =
        state.servicesType === 'gas'
          ? state.businessType === 'sole_trader'
            ? state.gasSafeNumber.trim()
            : state.gasHolder === 'company'
              ? state.companyGasSafeNumber.trim()
              : state.engineerGasSafeNumber.trim()
          : undefined;
      const fullName =
        state.businessType === 'sole_trader'
          ? `${state.firstName.trim()} ${state.lastName.trim()}`
          : state.officerConfirmation
            ? `${state.officerFirstName.trim()} ${state.officerLastName.trim()}`
            : state.companyName.trim();

      // 2. Build vetting metadata upfront (without file paths yet)
      const preliminaryMetadata = buildVettingMetadata(state, {});

      // 3. Sign up (user must be authenticated before uploading to private bucket)
      const { userId, hasSession } = await signUp({
        email: state.email.trim(),
        password: state.password,
        fullName,
        role: 'plumber',
        phone: state.phone.trim(),
        regions: state.selectedRegions,
        bio: state.bio.trim() || undefined,
        businessName,
        servicesType: state.servicesType!,
        gasSafeNumber,
        consentToChecks: true,
        businessType: state.businessType!,
        vettingMetadata: preliminaryMetadata,
      });

      if (!hasSession || !userId) {
        // Email confirmation is required — no session yet.
        // Vetting metadata was stored in user metadata and will be applied
        // by the DB trigger when the user confirms their email.
        Alert.alert(
          'Check Your Email',
          'We\'ve sent a confirmation link to your email. Please verify your email to complete registration.',
        );
        return;
      }

      // 4. Authenticated — upload files under the real user ID
      const fileFields = getFileFields(state);
      const uploadedPaths: Record<string, string | null> = {};

      if (fileFields.length > 0) {
        const uploadResults = await Promise.all(
          fileFields.map(({ key, file }) =>
            uploadVettingDocument(file.uri, userId, key).then((path) => ({
              key,
              path,
            })),
          ),
        );

        const failedUploads = uploadResults.filter((r) => r.path === null);
        if (failedUploads.length > 0) {
          Alert.alert(
            'Partial Upload',
            `Account created, but some files failed to upload: ${failedUploads.map((f) => f.key).join(', ')}. You can re-upload these from your profile.`,
          );
        }

        for (const r of uploadResults) {
          uploadedPaths[r.key] = r.path;
        }
      }

      // 5. Build final vetting metadata with real storage paths and update plumber_details
      const vettingMetadata = buildVettingMetadata(state, uploadedPaths);
      await supabase
        .from('plumber_details')
        .update({ vetting_metadata: vettingMetadata })
        .eq('user_id', userId);

      await supabase.auth.updateUser({
        data: { vetting_metadata: vettingMetadata },
      });

      Alert.alert('Success', 'Registration complete! Your application is under review.');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ───── Chip Selector Helper ─────

  const renderChips = <T extends string | boolean>(
    options: { value: T; label: string }[],
    selected: T | null,
    onSelect: (v: T) => void,
    errorKey?: string,
  ) => (
    <View>
      {errorKey && errors[errorKey] && <Text style={styles.errorText}>{errors[errorKey]}</Text>}
      <View style={styles.chips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.chip, selected === opt.value && styles.chipActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.chipText, selected === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCheckbox = (
    label: string,
    checked: boolean,
    onToggle: () => void,
    errorKey?: string,
  ) => (
    <View style={styles.checkboxRow}>
      <TouchableOpacity
        style={[styles.checkbox, checked && styles.checkboxChecked]}
        onPress={onToggle}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text style={styles.checkboxLabel}>{label}</Text>
      {errorKey && errors[errorKey] && (
        <Text style={[styles.errorText, { marginLeft: Spacing.sm }]}>{errors[errorKey]}</Text>
      )}
    </View>
  );

  // ───── Step Renderers ─────

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Business Type & Account</Text>

      <Text style={styles.label}>Business Type</Text>
      {renderChips(
        [
          { value: 'sole_trader' as BusinessType, label: 'Sole Trader' },
          { value: 'limited_company' as BusinessType, label: 'Limited Company' },
        ],
        state.businessType,
        (v) => set('businessType', v),
        'businessType',
      )}

      <InputField
        label="Email"
        value={state.email}
        onChangeText={(v) => set('email', v)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
      />

      <InputField
        label="Password"
        value={state.password}
        onChangeText={(v) => set('password', v)}
        error={errors.password}
        secureTextEntry
        placeholder="Min 6 characters"
      />
      <InputField
        label="Confirm Password"
        value={state.confirmPassword}
        onChangeText={(v) => set('confirmPassword', v)}
        error={errors.confirmPassword}
        secureTextEntry
        placeholder="Re-enter password"
      />
      <InputField
        label="Phone"
        value={state.phone}
        onChangeText={(v) => set('phone', v)}
        error={errors.phone}
        keyboardType="phone-pad"
        placeholder="+44 7700 000000"
      />
    </>
  );

  const renderStep2SoleTrader = () => (
    <>
      <InputField
        label="First Name"
        value={state.firstName}
        onChangeText={(v) => set('firstName', v)}
        error={errors.firstName}
        placeholder="John"
      />
      <InputField
        label="Last Name"
        value={state.lastName}
        onChangeText={(v) => set('lastName', v)}
        error={errors.lastName}
        placeholder="Smith"
      />
      <InputField
        label="Trading Name"
        value={state.tradingName}
        onChangeText={(v) => set('tradingName', v)}
        error={errors.tradingName}
        placeholder="Smith Plumbing"
      />

      <Text style={styles.sectionLabel}>Home Address</Text>
      <InputField
        label="Address Line 1"
        value={state.homeAddressLine1}
        onChangeText={(v) => set('homeAddressLine1', v)}
        error={errors.homeAddressLine1}
        placeholder="123 High Street"
      />
      <InputField
        label="Address Line 2 (optional)"
        value={state.homeAddressLine2}
        onChangeText={(v) => set('homeAddressLine2', v)}
        placeholder="Flat 2"
      />
      <InputField
        label="City"
        value={state.homeCity}
        onChangeText={(v) => set('homeCity', v)}
        error={errors.homeCity}
        placeholder="London"
      />
      <InputField
        label="Postcode"
        value={state.homePostcode}
        onChangeText={(v) => set('homePostcode', v)}
        error={errors.homePostcode}
        placeholder="SW1A 1AA"
      />

      <DocumentPickerButton
        label="Proof of Address"
        fileName={state.proofOfAddress?.fileName ?? null}
        onPick={(uri, name) => setFile('proofOfAddress', { uri, fileName: name })}
        onClear={() => setFile('proofOfAddress', null)}
        error={errors.proofOfAddress}
        hint="Upload a recent utility bill or bank statement"
      />

      <InputField
        label="Base Postcode"
        value={state.basePostcode}
        onChangeText={(v) => set('basePostcode', v)}
        error={errors.basePostcode}
        placeholder="SW1A"
      />

      <Text style={styles.label}>Years Trading</Text>
      {renderChips(
        YEARS_TRADING_OPTIONS,
        state.yearsTrading,
        (v) => set('yearsTrading', v),
        'yearsTrading',
      )}

      <DocumentPickerButton
        label="Invoice Proof"
        fileName={state.invoiceProof?.fileName ?? null}
        onPick={(uri, name) => setFile('invoiceProof', { uri, fileName: name })}
        onClear={() => setFile('invoiceProof', null)}
        error={errors.invoiceProof}
        hint={
          state.yearsTrading === '<6m'
            ? 'Upload your most recent invoice'
            : 'Upload an invoice over 6 months old'
        }
      />
    </>
  );

  const renderStep2LimitedCompany = () => (
    <>
      <View style={styles.fieldWithButton}>
        <View style={{ flex: 1 }}>
          <InputField
            label="Company Number"
            value={state.companyNumber}
            onChangeText={(v) => {
              set('companyNumber', v);
              if (state.companyVerified) {
                dispatch({
                  type: 'SET_COMPANY_DATA',
                  data: {
                    companyVerified: false,
                    companyName: '',
                    companyStatus: '',
                    incorporationDate: '',
                    sicCodes: '',
                    directors: '',
                    registeredOffice: '',
                  },
                });
              }
            }}
            error={errors.companyNumber || errors.companyVerified}
            placeholder="12345678"
          />
        </View>
        <TouchableOpacity
          style={[styles.verifyBtn, state.companyVerified && styles.verifyBtnDone]}
          onPress={verifyCompany}
          disabled={companyLoading}
        >
          {companyLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={[styles.verifyBtnText, state.companyVerified && styles.verifyBtnTextDone]}>
              {state.companyVerified ? 'Verified' : 'Verify'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {state.companyVerified && (
        <>
          <View style={styles.readOnlyCard}>
            <Text style={styles.readOnlyLabel}>Company Name</Text>
            <Text style={styles.readOnlyValue}>{state.companyName}</Text>
            <Text style={styles.readOnlyLabel}>Status</Text>
            <Text style={styles.readOnlyValue}>{state.companyStatus}</Text>
            <Text style={styles.readOnlyLabel}>Incorporation Date</Text>
            <Text style={styles.readOnlyValue}>{state.incorporationDate}</Text>
            {state.sicCodes ? (
              <>
                <Text style={styles.readOnlyLabel}>SIC Codes</Text>
                <Text style={styles.readOnlyValue}>{state.sicCodes}</Text>
              </>
            ) : null}
            {state.directors ? (
              <>
                <Text style={styles.readOnlyLabel}>Directors</Text>
                <Text style={styles.readOnlyValue}>{state.directors}</Text>
              </>
            ) : null}
            {state.registeredOffice ? (
              <>
                <Text style={styles.readOnlyLabel}>Registered Office</Text>
                <Text style={styles.readOnlyValue}>{state.registeredOffice}</Text>
              </>
            ) : null}
          </View>
          {errors.companyStatus && <Text style={styles.errorText}>{errors.companyStatus}</Text>}
        </>
      )}

      <InputField
        label="Your Role"
        value={state.yourRole}
        onChangeText={(v) => set('yourRole', v)}
        error={errors.yourRole}
        placeholder="e.g. Director, Admin"
      />

      <Text style={styles.label}>Are you an officer of this company?</Text>
      {renderChips(
        [
          { value: true as const, label: 'Yes' },
          { value: false as const, label: 'No' },
        ],
        state.officerConfirmation,
        (v) => set('officerConfirmation', v),
        'officerConfirmation',
      )}

      {state.officerConfirmation === true && (
        <>
          <InputField
            label="Officer First Name"
            value={state.officerFirstName}
            onChangeText={(v) => set('officerFirstName', v)}
            error={errors.officerFirstName}
            placeholder="John"
          />
          <InputField
            label="Officer Last Name"
            value={state.officerLastName}
            onChangeText={(v) => set('officerLastName', v)}
            error={errors.officerLastName}
            placeholder="Smith"
          />
        </>
      )}

      {state.officerConfirmation === false && (
        <>
          <InputField
            label="Director Contact Email"
            value={state.directorContactEmail}
            onChangeText={(v) => set('directorContactEmail', v)}
            error={errors.directorContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="director@company.com"
          />
          <InputField
            label="Director Contact Phone"
            value={state.directorContactPhone}
            onChangeText={(v) => set('directorContactPhone', v)}
            error={errors.directorContactPhone}
            keyboardType="phone-pad"
            placeholder="+44 7700 000000"
          />
          <DocumentPickerButton
            label="Letter of Authority (optional)"
            fileName={state.letterOfAuthority?.fileName ?? null}
            onPick={(uri, name) => setFile('letterOfAuthority', { uri, fileName: name })}
            onClear={() => setFile('letterOfAuthority', null)}
          />
        </>
      )}

      <InputField
        label="Trading Postcode"
        value={state.tradingPostcode}
        onChangeText={(v) => set('tradingPostcode', v)}
        error={errors.tradingPostcode}
        placeholder="EC1A 1BB"
      />
      <InputField
        label="Service Radius (miles)"
        value={state.serviceRadiusMiles}
        onChangeText={(v) => set('serviceRadiusMiles', v)}
        error={errors.serviceRadiusMiles}
        keyboardType="numeric"
        placeholder="25"
      />

      <InputField
        label="VAT Number (optional)"
        value={state.vatNumber}
        onChangeText={(v) => set('vatNumber', v)}
        placeholder="GB123456789"
      />
      <InputField
        label="Company Website (optional)"
        value={state.companyWebsite}
        onChangeText={(v) => set('companyWebsite', v)}
        error={errors.companyWebsite}
        keyboardType="url"
        autoCapitalize="none"
        placeholder="https://example.com"
      />

      <Text style={styles.sectionLabel}>Trading Address (optional)</Text>
      <InputField
        label="Address Line 1"
        value={state.tradingAddressLine1}
        onChangeText={(v) => set('tradingAddressLine1', v)}
        placeholder="Unit 5, Industrial Estate"
      />
      <InputField
        label="Address Line 2"
        value={state.tradingAddressLine2}
        onChangeText={(v) => set('tradingAddressLine2', v)}
        placeholder=""
      />
      <InputField
        label="City"
        value={state.tradingCity}
        onChangeText={(v) => set('tradingCity', v)}
        placeholder="London"
      />

      {isNewCompany(state.incorporationDate) && (
        <>
          <Text style={styles.sectionLabel}>New Company — Additional Evidence</Text>
          <Text style={styles.label}>Have you traded previously as a sole trader or different company?</Text>
          {renderChips(
            [
              { value: true as const, label: 'Yes' },
              { value: false as const, label: 'No' },
            ],
            state.previousTradingBackground,
            (v) => set('previousTradingBackground', v),
            'previousTradingBackground',
          )}

          {state.previousTradingBackground === true && (
            <>
              <InputField
                label="Previous Company Number (optional)"
                value={state.previousCompanyNumber}
                onChangeText={(v) => set('previousCompanyNumber', v)}
                placeholder="12345678"
              />
              <DocumentPickerButton
                label="Previous Trading Proof"
                fileName={state.previousTradingProof?.fileName ?? null}
                onPick={(uri, name) => setFile('previousTradingProof', { uri, fileName: name })}
                onClear={() => setFile('previousTradingProof', null)}
                error={errors.previousTradingProof}
                hint="Required if no previous company number provided"
              />
            </>
          )}
        </>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>
        {state.businessType === 'sole_trader' ? 'Sole Trader Details' : 'Company Details'}
      </Text>
      {state.businessType === 'sole_trader' ? renderStep2SoleTrader() : renderStep2LimitedCompany()}
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Trade & Compliance</Text>

      <InputField
        label="Bio (optional)"
        value={state.bio}
        onChangeText={(v) => set('bio', v)}
        placeholder="Tell us about your experience..."
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Text style={styles.label}>Service Regions</Text>
      {errors.regions && <Text style={styles.errorText}>{errors.regions}</Text>}
      <View style={styles.chips}>
        {REGIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, state.selectedRegions.includes(r) && styles.chipActive]}
            onPress={() => dispatch({ type: 'TOGGLE_REGION', region: r })}
          >
            <Text style={[styles.chipText, state.selectedRegions.includes(r) && styles.chipTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Services Offered</Text>
      {renderChips(
        [
          { value: 'gas' as ServicesType, label: 'Gas' },
          { value: 'no_gas' as ServicesType, label: 'No Gas' },
        ],
        state.servicesType,
        (v) => set('servicesType', v),
        'servicesType',
      )}

      {state.servicesType === 'gas' && state.businessType === 'sole_trader' && (
        <InputField
          label="Gas Safe Registration Number"
          value={state.gasSafeNumber}
          onChangeText={(v) => set('gasSafeNumber', v)}
          error={errors.gasSafeNumber}
          placeholder="e.g. 1234567"
        />
      )}

      {state.servicesType === 'gas' && state.businessType === 'limited_company' && (
        <>
          <Text style={styles.label}>Gas Safe registration held by</Text>
          {renderChips(
            [
              { value: 'company' as GasHolder, label: 'Company' },
              { value: 'engineer' as GasHolder, label: 'Engineer' },
            ],
            state.gasHolder,
            (v) => set('gasHolder', v),
            'gasHolder',
          )}

          {state.gasHolder === 'company' && (
            <InputField
              label="Company Gas Safe Number"
              value={state.companyGasSafeNumber}
              onChangeText={(v) => set('companyGasSafeNumber', v)}
              error={errors.companyGasSafeNumber}
              placeholder="e.g. 1234567"
            />
          )}
          {state.gasHolder === 'engineer' && (
            <>
              <InputField
                label="Engineer Gas Safe Number"
                value={state.engineerGasSafeNumber}
                onChangeText={(v) => set('engineerGasSafeNumber', v)}
                error={errors.engineerGasSafeNumber}
                placeholder="e.g. 1234567"
              />
              <DocumentPickerButton
                label="Engineer Gas Safe Cards"
                fileName={state.engineerGasSafeCards?.fileName ?? null}
                onPick={(uri, name) => setFile('engineerGasSafeCards', { uri, fileName: name })}
                onClear={() => setFile('engineerGasSafeCards', null)}
                error={errors.engineerGasSafeCards}
              />
            </>
          )}
        </>
      )}

      <Text style={styles.label}>Do you work with unvented cylinders?</Text>
      {renderChips(
        [
          { value: true as const, label: 'Yes' },
          { value: false as const, label: 'No' },
        ],
        state.doesUnventedCylinders,
        (v) => set('doesUnventedCylinders', v),
        'doesUnventedCylinders',
      )}

      {state.doesUnventedCylinders === true && (
        <DocumentPickerButton
          label="Unvented Cylinder Certificate"
          fileName={state.unventedCertificate?.fileName ?? null}
          onPick={(uri, name) => setFile('unventedCertificate', { uri, fileName: name })}
          onClear={() => setFile('unventedCertificate', null)}
          error={errors.unventedCertificate}
        />
      )}

      <Text style={styles.label}>Do you have public liability insurance?</Text>
      {renderChips(
        [
          { value: true as const, label: 'Yes' },
          { value: false as const, label: 'No' },
        ],
        state.hasPublicLiabilityInsurance,
        (v) => set('hasPublicLiabilityInsurance', v),
        'hasPublicLiabilityInsurance',
      )}

      {state.hasPublicLiabilityInsurance === true && (
        <>
          <InputField
            label="Insurer Name"
            value={state.insurerName}
            onChangeText={(v) => set('insurerName', v)}
            error={errors.insurerName}
            placeholder="e.g. Aviva"
          />
          <InputField
            label="Policy Number"
            value={state.policyNumber}
            onChangeText={(v) => set('policyNumber', v)}
            error={errors.policyNumber}
            placeholder="POL-12345"
          />
          <InputField
            label="Expiry Date"
            value={state.policyExpiryDate}
            onChangeText={(v) => set('policyExpiryDate', v)}
            error={errors.policyExpiryDate}
            placeholder="YYYY-MM-DD"
          />
          <InputField
            label="Cover Amount"
            value={state.coverAmount}
            onChangeText={(v) => set('coverAmount', v)}
            error={errors.coverAmount}
            placeholder="e.g. £2,000,000"
          />
          <DocumentPickerButton
            label="Insurance Proof"
            fileName={state.insuranceProof?.fileName ?? null}
            onPick={(uri, name) => setFile('insuranceProof', { uri, fileName: name })}
            onClear={() => setFile('insuranceProof', null)}
            error={errors.insuranceProof}
          />
        </>
      )}
    </>
  );

  const renderStep4 = () => (
    <>
      <Text style={styles.stepTitle}>Acknowledgements</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          FluxService is a platform that connects customers with independent plumbers. Registration
          does not create an employment relationship. Your application will be reviewed before
          approval. Additional identity, payout, and bank verification may happen later through Stripe
          Connect. This form asks only for information needed for application review, profile
          management, payouts, and compliance.
        </Text>
      </View>

      {renderCheckbox(
        'I confirm that the information provided is accurate and that I am legally entitled to provide plumbing services in the UK.',
        state.legalEntitlementConfirmed,
        () => set('legalEntitlementConfirmed', !state.legalEntitlementConfirmed),
        'legalEntitlementConfirmed',
      )}

      {renderCheckbox(
        'I confirm that I am using FluxService as an independent service provider, not as an employee, worker, or agent of FluxService.',
        state.independentContractorConfirmed,
        () => set('independentContractorConfirmed', !state.independentContractorConfirmed),
        'independentContractorConfirmed',
      )}

      {renderCheckbox(
        'I accept the Terms of Service and Privacy Policy.',
        state.termsPrivacyConfirmed,
        () => set('termsPrivacyConfirmed', !state.termsPrivacyConfirmed),
        'termsPrivacyConfirmed',
      )}
    </>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4];

  // ───── Render ─────

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={handleBack} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Apply as a Plumber</Text>
          <Text style={styles.subtitle}>
            Create your FluxService plumber account. We use this form to review your business
            details, service coverage, insurance, and payout readiness.
          </Text>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  i + 1 === step && styles.stepDotActive,
                  i + 1 < step && styles.stepDotCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    (i + 1 === step || i + 1 < step) && styles.stepDotTextActive,
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
            ))}
          </View>

          {stepRenderers[step - 1]()}

          <View style={styles.navRow}>
            {step < TOTAL_STEPS ? (
              <PrimaryButton title="Continue" onPress={handleNext} />
            ) : (
              <PrimaryButton title="Submit Application" onPress={handleSubmit} loading={loading} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingVertical: Spacing.xxl },
  back: { marginBottom: Spacing.base },
  backText: { ...Typography.body, color: Colors.primary },
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xs },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginBottom: Spacing.xl,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.grey300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  stepDotCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  stepDotText: {
    ...Typography.label,
    color: Colors.grey500,
  },
  stepDotTextActive: {
    color: Colors.white,
  },
  stepTitle: {
    ...Typography.h2,
    color: Colors.black,
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.grey700,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.h3,
    color: Colors.black,
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { ...Typography.label, color: Colors.grey700 },
  chipTextActive: { color: Colors.white },
  fieldWithButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  verifyBtn: {
    marginTop: 28,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  verifyBtnDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  verifyBtnText: {
    ...Typography.label,
    color: Colors.primary,
  },
  verifyBtnTextDone: {
    color: Colors.white,
  },
  readOnlyCard: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.grey100,
  },
  readOnlyLabel: {
    ...Typography.caption,
    color: Colors.grey500,
    marginBottom: 2,
    marginTop: Spacing.sm,
  },
  readOnlyValue: {
    ...Typography.body,
    color: Colors.black,
  },
  summaryCard: {
    backgroundColor: Colors.lightBlue,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  summaryText: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.grey300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    flex: 1,
  },
  navRow: {
    marginTop: Spacing.xl,
  },
});
