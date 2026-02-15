import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export async function uploadEnquiryImage(
  uri: string,
  userId: string
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const ext = uri.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage
      .from('enquiry-images')
      .upload(fileName, decode(base64), { contentType });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage
      .from('enquiry-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
}
