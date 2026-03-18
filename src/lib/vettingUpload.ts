import { supabase } from './supabase';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

/** Extract clean file extension from a URI, stripping query params and fragments */
function getExtension(uri: string): string {
  // Strip query params and fragments
  const clean = uri.split('?')[0].split('#')[0];
  const lastDot = clean.lastIndexOf('.');
  if (lastDot === -1) return 'jpg';
  const ext = clean.substring(lastDot + 1).toLowerCase();
  // Sanity check: extension should be short and alphanumeric
  if (ext.length > 5 || !/^[a-z0-9]+$/.test(ext)) return 'jpg';
  return ext;
}

export async function uploadVettingDocument(
  uri: string,
  userId: string,
  docType: string,
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const ext = getExtension(uri);
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
    const fileName = `${userId}/${docType}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('vetting-documents')
      .upload(fileName, arrayBuffer, { contentType });

    if (error) {
      console.error(`Vetting upload error (${docType}):`, error.message);
      return null;
    }

    return fileName;
  } catch (err) {
    console.error(`Vetting upload failed (${docType}):`, err);
    return null;
  }
}

/** Move files from one folder to another within the vetting-documents bucket */
export async function moveVettingDocuments(
  paths: string[],
  newUserId: string,
): Promise<Record<string, string>> {
  const movedPaths: Record<string, string> = {};
  for (const oldPath of paths) {
    const fileName = oldPath.split('/').slice(1).join('/');
    const newPath = `${newUserId}/${fileName}`;
    const { error } = await supabase.storage
      .from('vetting-documents')
      .move(oldPath, newPath);
    if (!error) {
      movedPaths[oldPath] = newPath;
    } else {
      console.error(`Failed to move ${oldPath} -> ${newPath}:`, error.message);
      movedPaths[oldPath] = oldPath; // keep original path as fallback
    }
  }
  return movedPaths;
}

export async function getVettingDocumentUrl(
  path: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('vetting-documents')
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Signed URL failed:', err);
    return null;
  }
}
