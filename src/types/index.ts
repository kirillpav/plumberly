export type UserRole = 'customer' | 'plumber';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  push_token: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface PlumberProfile extends UserProfile {
  role: 'plumber';
  plumber_details: PlumberDetails;
}

export type PlumberStatus = 'provisional' | 'active' | 'frozen' | 'suspended';
export type ServicesType = 'gas' | 'no_gas';

export interface PlumberDetails {
  id: string;
  user_id: string;
  regions: string[];
  hourly_rate: number;
  bio: string | null;
  verified: boolean;
  rating: number;
  jobs_completed: number;
  business_name: string;
  services_type: ServicesType;
  gas_safe_number: string | null;
  gas_safe_verified: boolean;
  consent_to_checks: boolean;
  right_to_work: string | null;
  status: PlumberStatus;
  provisional_jobs_remaining: number;
  payouts_enabled: boolean;
  frozen_reason: string | null;
  business_type: 'sole_trader' | 'limited_company' | null;
  vetting_metadata: Record<string, unknown> | null;
}

export type EnquiryStatus = 'new' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface Enquiry {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  status: EnquiryStatus;
  region: string | null;
  preferred_date: string | null;
  preferred_time: string[];
  images: string[];
  chatbot_transcript: ChatMessage[] | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  created_at: string;
  updated_at: string;
  customer?: UserProfile;
}

export type JobStatus = 'pending' | 'quoted' | 'declined' | 'accepted' | 'deposit_paid' | 'in_progress' | 'completed' | 'cancelled';

/** Jobs that have been accepted/paid and are actively in progress or done. */
export const ACTIVE_JOB_STATUSES: JobStatus[] = ['accepted', 'deposit_paid', 'in_progress', 'completed'];

/** Jobs that occupy a schedule slot (quoted through in_progress). */
export const SCHEDULED_JOB_STATUSES: JobStatus[] = ['quoted', 'accepted', 'deposit_paid', 'in_progress'];

export interface Job {
  id: string;
  enquiry_id: string;
  customer_id: string;
  plumber_id: string;
  status: JobStatus;
  quote_amount: number | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  notes: string | null;
  quote_description: string | null;
  customer_confirmed: boolean;
  plumber_confirmed: boolean;
  pin_verified: boolean;
  created_at: string;
  updated_at: string;
  enquiry?: Enquiry;
  customer?: UserProfile;
  plumber?: UserProfile;
}

export type IntakeIssueType =
  | 'leak'
  | 'clog'
  | 'toilet'
  | 'faucet'
  | 'low_pressure'
  | 'no_hot_water'
  | 'smell'
  | 'other';

export interface IntakeFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
}

export interface IntakeData {
  issueType: IntakeIssueType;
  whenStarted: string;
  fields: Record<string, any>;
  photos: string[];
}

export interface TriageMetadata {
  isEmergency: boolean;
  category: 1 | 2 | 3;
  confidence: number;
  modelUsed: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  images?: string[];
  metadata?: TriageMetadata;
}

export interface JobMessage {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  job_id: string;
  customer_id: string;
  plumber_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer?: { full_name: string; avatar_url: string | null };
  job?: { enquiry_id: string; enquiry?: { title: string } };
}

export type PayoutTransferStatus = 'pending' | 'scheduled' | 'created' | 'reversed' | 'failed' | 'cancelled';

export interface PayoutTransfer {
  id: string;
  job_id: string;
  plumber_id: string;
  amount_minor: number;
  currency: string;
  status: PayoutTransferStatus;
  scheduled_transfer_at: string | null;
  delay_reason: string | null;
  platform_fee_minor: number;
  created_at: string;
}

export interface Region {
  name: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  color: string;
}
