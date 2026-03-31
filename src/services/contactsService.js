import { supabase } from './supabase';

const TABLE = 'crm_contacts';

export async function createContact(payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id, payload) {
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

export async function deleteContact(id) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
