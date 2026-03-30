import { supabase } from './supabase';

const TABLE = 'crm_companies';

export async function fetchCompanies() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, crm_contacts(id, name, role, email, phone, is_primary)')
    .order('name');
  return { data: data || [], error };
}

export async function createCompany(payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateCompany(id, payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
