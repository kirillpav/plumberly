export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          role: 'customer' | 'plumber';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          role: 'customer' | 'plumber';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      plumber_details: {
        Row: {
          id: string;
          user_id: string;
          regions: string[];
          hourly_rate: number;
          bio: string | null;
          verified: boolean;
          rating: number;
          jobs_completed: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          regions: string[];
          hourly_rate: number;
          bio?: string | null;
          verified?: boolean;
          rating?: number;
          jobs_completed?: number;
        };
        Update: Partial<Database['public']['Tables']['plumber_details']['Insert']>;
      };
      enquiries: {
        Row: {
          id: string;
          customer_id: string;
          title: string;
          description: string;
          status: 'new' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          preferred_date: string | null;
          preferred_time: string | null;
          images: string[];
          chatbot_transcript: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          title: string;
          description: string;
          status?: 'new' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          preferred_date?: string | null;
          preferred_time?: string | null;
          images?: string[];
          chatbot_transcript?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['enquiries']['Insert']>;
      };
      jobs: {
        Row: {
          id: string;
          enquiry_id: string;
          customer_id: string;
          plumber_id: string;
          status: 'pending' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          quote_amount: number | null;
          scheduled_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enquiry_id: string;
          customer_id: string;
          plumber_id: string;
          status?: 'pending' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          quote_amount?: number | null;
          scheduled_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
