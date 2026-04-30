import { supabase } from './supabase';

const TABLE = 'crm_documents';
const BUCKET = 'crm-documents';

export async function fetchDocuments(companyId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from(TABLE)
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function uploadDocument(companyId, file, category = 'otro', notes = '') {
  if (!supabase) throw new Error('Supabase no configurado');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${companyId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      company_id: companyId,
      name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      category,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function getDocumentUrl(filePath) {
  if (!supabase) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export async function deleteDocument(id, filePath) {
  if (!supabase) throw new Error('Supabase no configurado');
  await supabase.storage.from(BUCKET).remove([filePath]);
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
