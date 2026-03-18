export type BusinessType = 'sole_trader' | 'limited_company';
export type YearsTrading = '<6m' | '6-24m' | '2-5y' | '5+y';
export type GasHolder = 'company' | 'engineer';

export interface FileSelection {
  uri: string;
  fileName: string;
}

export interface VettingFormState {
  // Step 1: Business Type & Account
  businessType: BusinessType | null;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;

  // Step 2: Business Details — Sole Trader
  firstName: string;
  lastName: string;
  tradingName: string;
  homeAddressLine1: string;
  homeAddressLine2: string;
  homeCity: string;
  homePostcode: string;
  proofOfAddress: FileSelection | null;
  basePostcode: string;
  yearsTrading: YearsTrading | null;
  invoiceProof: FileSelection | null;

  // Step 2: Business Details — Limited Company
  companyNumber: string;
  companyVerified: boolean;
  companyName: string;
  companyStatus: string;
  incorporationDate: string;
  sicCodes: string;
  directors: string;
  registeredOffice: string;
  yourRole: string;
  officerConfirmation: boolean | null;
  officerFirstName: string;
  officerLastName: string;
  directorContactEmail: string;
  directorContactPhone: string;
  letterOfAuthority: FileSelection | null;
  tradingPostcode: string;
  serviceRadiusMiles: string;
  vatNumber: string;
  companyWebsite: string;
  tradingAddressLine1: string;
  tradingAddressLine2: string;
  tradingCity: string;
  previousTradingBackground: boolean | null;
  previousCompanyNumber: string;
  previousTradingProof: FileSelection | null;

  // Step 3: Trade & Compliance
  bio: string;
  selectedRegions: string[];
  servicesType: 'gas' | 'no_gas' | null;
  gasSafeNumber: string;
  gasHolder: GasHolder | null;
  companyGasSafeNumber: string;
  engineerGasSafeNumber: string;
  engineerGasSafeCards: FileSelection | null;
  doesUnventedCylinders: boolean | null;
  unventedCertificate: FileSelection | null;
  hasPublicLiabilityInsurance: boolean | null;
  insurerName: string;
  policyNumber: string;
  policyExpiryDate: string;
  coverAmount: string;
  insuranceProof: FileSelection | null;

  // Step 4: Acknowledgements
  legalEntitlementConfirmed: boolean;
  independentContractorConfirmed: boolean;
  termsPrivacyConfirmed: boolean;
}

export const initialVettingFormState: VettingFormState = {
  businessType: null,
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',

  firstName: '',
  lastName: '',
  tradingName: '',
  homeAddressLine1: '',
  homeAddressLine2: '',
  homeCity: '',
  homePostcode: '',
  proofOfAddress: null,
  basePostcode: '',
  yearsTrading: null,
  invoiceProof: null,

  companyNumber: '',
  companyVerified: false,
  companyName: '',
  companyStatus: '',
  incorporationDate: '',
  sicCodes: '',
  directors: '',
  registeredOffice: '',
  yourRole: '',
  officerConfirmation: null,
  officerFirstName: '',
  officerLastName: '',
  directorContactEmail: '',
  directorContactPhone: '',
  letterOfAuthority: null,
  tradingPostcode: '',
  serviceRadiusMiles: '',
  vatNumber: '',
  companyWebsite: '',
  tradingAddressLine1: '',
  tradingAddressLine2: '',
  tradingCity: '',
  previousTradingBackground: null,
  previousCompanyNumber: '',
  previousTradingProof: null,

  bio: '',
  selectedRegions: [],
  servicesType: null,
  gasSafeNumber: '',
  gasHolder: null,
  companyGasSafeNumber: '',
  engineerGasSafeNumber: '',
  engineerGasSafeCards: null,
  doesUnventedCylinders: null,
  unventedCertificate: null,
  hasPublicLiabilityInsurance: null,
  insurerName: '',
  policyNumber: '',
  policyExpiryDate: '',
  coverAmount: '',
  insuranceProof: null,

  legalEntitlementConfirmed: false,
  independentContractorConfirmed: false,
  termsPrivacyConfirmed: false,
};

export type VettingFormAction =
  | { type: 'SET_FIELD'; field: keyof VettingFormState; value: any }
  | { type: 'SET_COMPANY_DATA'; data: Partial<VettingFormState> }
  | { type: 'TOGGLE_REGION'; region: string }
  | { type: 'RESET' };

export function vettingFormReducer(
  state: VettingFormState,
  action: VettingFormAction,
): VettingFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_COMPANY_DATA':
      return { ...state, ...action.data };
    case 'TOGGLE_REGION':
      return {
        ...state,
        selectedRegions: state.selectedRegions.includes(action.region)
          ? state.selectedRegions.filter((r) => r !== action.region)
          : [...state.selectedRegions, action.region],
      };
    case 'RESET':
      return initialVettingFormState;
    default:
      return state;
  }
}

/** All possible file field keys */
const ALL_FILE_FIELDS = [
  'proofOfAddress',
  'invoiceProof',
  'letterOfAuthority',
  'previousTradingProof',
  'engineerGasSafeCards',
  'unventedCertificate',
  'insuranceProof',
] as const;

/** Sole-trader-only file fields */
const SOLE_TRADER_FILE_FIELDS: ReadonlySet<string> = new Set([
  'proofOfAddress',
  'invoiceProof',
]);

/** Limited-company-only file fields */
const LIMITED_COMPANY_FILE_FIELDS: ReadonlySet<string> = new Set([
  'letterOfAuthority',
  'previousTradingProof',
]);

export type FileFieldKey = (typeof ALL_FILE_FIELDS)[number];

/**
 * Returns only the file fields relevant to the current business type and form selections.
 * Prevents uploading files from the opposite business type branch.
 */
export function getFileFields(state: VettingFormState): { key: FileFieldKey; file: FileSelection }[] {
  const result: { key: FileFieldKey; file: FileSelection }[] = [];
  for (const key of ALL_FILE_FIELDS) {
    // Skip files that belong to the other business type branch
    if (state.businessType === 'sole_trader' && LIMITED_COMPANY_FILE_FIELDS.has(key)) continue;
    if (state.businessType === 'limited_company' && SOLE_TRADER_FILE_FIELDS.has(key)) continue;

    // Skip gas-related files if not applicable
    if (key === 'engineerGasSafeCards' && (state.servicesType !== 'gas' || state.gasHolder !== 'engineer')) continue;

    // Skip conditional files if not needed
    if (key === 'unventedCertificate' && state.doesUnventedCylinders !== true) continue;
    if (key === 'insuranceProof' && state.hasPublicLiabilityInsurance !== true) continue;

    const file = state[key];
    if (file) {
      result.push({ key, file });
    }
  }
  return result;
}

/** Is incorporation date less than 6 months old? */
export function isNewCompany(incorporationDate: string): boolean {
  if (!incorporationDate) return false;
  const inc = new Date(incorporationDate);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return inc > sixMonthsAgo;
}

/** Build the vetting metadata JSONB payload matching spec section 10 */
export function buildVettingMetadata(
  state: VettingFormState,
  uploadedPaths: Record<string, string | null>,
): Record<string, unknown> {
  const isSoleTrader = state.businessType === 'sole_trader';
  const isLimited = state.businessType === 'limited_company';

  const metadata: Record<string, unknown> = {
    business_type: state.businessType,
  };

  if (isSoleTrader) {
    Object.assign(metadata, {
      sole_trader: true,
      first_name: state.firstName || null,
      last_name: state.lastName || null,
      trading_name: state.tradingName || null,
      home_address_line_1: state.homeAddressLine1 || null,
      home_address_line_2: state.homeAddressLine2 || null,
      home_city: state.homeCity || null,
      home_postcode: state.homePostcode || null,
      proof_of_address_path: uploadedPaths.proofOfAddress ?? null,
      base_postcode: state.basePostcode || null,
      years_trading: state.yearsTrading ?? null,
      invoice_proof_path: uploadedPaths.invoiceProof ?? null,
    });
  }

  if (isLimited) {
    Object.assign(metadata, {
      limited_company: true,
      company_name: state.companyName || null,
      company_number: state.companyNumber || null,
      vat_number: state.vatNumber || null,
      company_website: state.companyWebsite || null,
      company_registered_office_address: state.registeredOffice || null,
      company_status: state.companyStatus || null,
      company_incorporation_date: state.incorporationDate || null,
      company_sic_codes: state.sicCodes || null,
      company_directors: state.directors || null,
      signup_role: state.yourRole || null,
      officer_confirmation: state.officerConfirmation === true ? 'yes' : state.officerConfirmation === false ? 'no' : null,
      officer_first_name: state.officerFirstName || null,
      officer_last_name: state.officerLastName || null,
      director_contact_email: state.directorContactEmail || null,
      director_contact_phone: state.directorContactPhone || null,
      letter_of_authority_path: uploadedPaths.letterOfAuthority ?? null,
      trading_postcode: state.tradingPostcode || null,
      service_radius_miles: state.serviceRadiusMiles || null,
      trading_address_line_1: state.tradingAddressLine1 || null,
      trading_address_line_2: state.tradingAddressLine2 || null,
      trading_address_city: state.tradingCity || null,
      previous_trading_background: state.previousTradingBackground === true ? 'yes' : state.previousTradingBackground === false ? 'no' : null,
      previous_company_number: state.previousCompanyNumber || null,
      previous_trading_proof_path: uploadedPaths.previousTradingProof ?? null,
    });
  }

  // Shared compliance
  Object.assign(metadata, {
    does_unvented_cylinders: state.doesUnventedCylinders ?? false,
    unvented_certificate_path: uploadedPaths.unventedCertificate ?? null,
    has_public_liability_insurance: state.hasPublicLiabilityInsurance ?? false,
    insurer_name: state.insurerName || null,
    policy_number: state.policyNumber || null,
    policy_expiry_date: state.policyExpiryDate || null,
    cover_amount: state.coverAmount || null,
    insurance_proof_path: uploadedPaths.insuranceProof ?? null,
    independent_contractor_confirmed: state.independentContractorConfirmed,
    terms_privacy_confirmed: state.termsPrivacyConfirmed,
  });

  // Gas fields
  if (state.servicesType === 'gas') {
    if (isSoleTrader) {
      metadata.gas_safe_number = state.gasSafeNumber || null;
    }
    if (isLimited) {
      metadata.gas_registration_holder = state.gasHolder ?? null;
      metadata.company_gas_safe_number = state.companyGasSafeNumber || null;
      metadata.engineer_gas_safe_number = state.engineerGasSafeNumber || null;
      metadata.engineer_gas_safe_cards_path = uploadedPaths.engineerGasSafeCards ?? null;
    }
  }

  return metadata;
}
