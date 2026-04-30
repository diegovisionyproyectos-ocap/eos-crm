import { supabase } from './supabase';

const TABLE = 'crm_contracts';

export async function fetchContracts(companyId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from(TABLE)
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createContract(payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContract(id, payload) {
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

export async function deleteContract(id) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
