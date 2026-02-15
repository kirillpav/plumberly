import { supabase } from './supabase';

export async function uploadEnquiryImage(
  uri: string,
  userId: string
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage
      .from('enquiry-images')
      .upload(fileName, arrayBuffer, { contentType });

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
