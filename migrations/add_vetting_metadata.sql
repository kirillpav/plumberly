-- Migration: Add vetting metadata columns and storage bucket
-- Run this in the Supabase SQL Editor

-- 1. Add columns to plumber_details
ALTER TABLE public.plumber_details
  ADD COLUMN IF NOT EXISTS business_type text CHECK (business_type IN ('sole_trader', 'limited_company')),
  ADD COLUMN IF NOT EXISTS vetting_metadata jsonb DEFAULT '{}';

-- 2. Create private vetting-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vetting-documents', 'vetting-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for vetting-documents bucket
CREATE POLICY "Authenticated users can upload vetting documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vetting-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own vetting documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vetting-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own vetting documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vetting-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own vetting documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vetting-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Update handle_new_user() trigger to include new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );

  -- If plumber, also create plumber_details
  IF coalesce(new.raw_user_meta_data->>'role', 'customer') = 'plumber' THEN
    INSERT INTO public.plumber_details (
      user_id, regions, hourly_rate, business_name, services_type,
      gas_safe_number, consent_to_checks, right_to_work,
      business_type, vetting_metadata
    )
    VALUES (
      new.id,
      CASE
        WHEN new.raw_user_meta_data->'regions' IS NOT NULL
             AND jsonb_typeof(new.raw_user_meta_data->'regions') = 'array'
        THEN array(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'regions'))
        ELSE '{}'::text[]
      END,
      coalesce((new.raw_user_meta_data->>'hourly_rate')::numeric, 0),
      coalesce(new.raw_user_meta_data->>'business_name', ''),
      coalesce(new.raw_user_meta_data->>'services_type', 'no_gas'),
      new.raw_user_meta_data->>'gas_safe_number',
      coalesce((new.raw_user_meta_data->>'consent_to_checks')::boolean, false),
      new.raw_user_meta_data->>'right_to_work',
      new.raw_user_meta_data->>'business_type',
      CASE
        WHEN new.raw_user_meta_data->'vetting_metadata' IS NOT NULL
        THEN new.raw_user_meta_data->'vetting_metadata'
        ELSE '{}'::jsonb
      END
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
