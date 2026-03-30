import { supabase } from './supabase';

const TABLE = 'crm_activities';

export async function fetchActivities(filters = {}) {
  if (!supabase) return { data: [], error: null };
  let query = supabase
    .from(TABLE)
    .select(`
      *,
      crm_companies (id, name, city),
      crm_opportunities (id, title, stage)
    `)
    .order('created_at', { ascending: false });

  if (filters.company_id) query = query.eq('company_id', filters.company_id);
  if (filters.opportunity_id) query = query.eq('opportunity_id', filters.opportunity_id);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function createActivity(payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function completeActivity(id) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from(TABLE)
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(id) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
