import { supabase } from './supabase';
import { triggerERPSync } from './erpIntegration';

const TABLE = 'crm_opportunities';

export async function fetchOpportunities() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      crm_companies (id, name, city, status, lat, lng),
      crm_contacts (id, name, role, email, phone)
    `)
    .order('updated_at', { ascending: false });
  return { data: data || [], error };
}

export async function createOpportunity(payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunity(id, payload) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`*, crm_companies(id, name, city)`)
    .single();
  if (error) throw error;

  // Auto-sync to ERP when deal is won
  if (data.stage === 'ganado' && !data.erp_synced) {
    await triggerERPSync(data);
    await supabase
      .from(TABLE)
      .update({ erp_synced: true, erp_synced_at: new Date().toISOString() })
      .eq('id', id);
  }

  return data;
}

/**
 * Move an opportunity to a different pipeline stage
 * Automatically updates probability based on stage defaults
 */
export async function moveOpportunityStage(id, newStage, stageProbability) {
  return updateOpportunity(id, {
    stage: newStage,
    probability: stageProbability,
  });
}

export async function deleteOpportunity(id) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
