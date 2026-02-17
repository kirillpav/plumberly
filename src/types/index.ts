export type UserRole = 'customer' | 'plumber';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  push_token: string | null;
  created_at: string;
}

export interface PlumberProfile extends UserProfile {
  role: 'plumber';
  plumber_details: PlumberDetails;
}

export interface PlumberDetails {
  id: string;
  user_id: string;
  regions: string[];
  hourly_rate: number;
  bio: string | null;
  verified: boolean;
  rating: number;
  jobs_completed: number;
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
  created_at: string;
  updated_at: string;
  customer?: UserProfile;
}

export type JobStatus = 'pending' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  enquiry_id: string;
  customer_id: string;
  plumber_id: string;
  status: JobStatus;
  quote_amount: number | null;
  scheduled_date: string | null;
  notes: string | null;
  customer_confirmed: boolean;
  plumber_confirmed: boolean;
  created_at: string;
  updated_at: string;
  enquiry?: Enquiry;
  customer?: UserProfile;
  plumber?: UserProfile;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  images?: string[];
}

export interface Region {
  name: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  color: string;
}
