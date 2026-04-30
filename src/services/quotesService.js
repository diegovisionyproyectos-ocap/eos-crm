import { supabase } from './supabase';

const QUOTES = 'crm_quotes';
const ITEMS  = 'crm_quote_items';

export async function fetchQuotes(companyId = null) {
  if (!supabase) return [];
  let q = supabase
    .from(QUOTES)
    .select('*, crm_companies(name, code), crm_quote_items(id)')
    .order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data } = await q;
  return data || [];
}

export async function fetchQuote(quoteId) {
  if (!supabase) return null;
  const { data } = await supabase
    .from(QUOTES)
    .select('*, crm_companies(name, code, address, city), crm_quote_items(*)')
    .eq('id', quoteId)
    .single();
  return data;
}

export async function createQuote(payload, items = []) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: quote, error } = await supabase
    .from(QUOTES)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  if (items.length) {
    const { error: ie } = await supabase.from(ITEMS).insert(
      items.map((item, i) => ({ ...item, quote_id: quote.id, sort_order: i }))
    );
    if (ie) throw ie;
  }
  return quote;
}

export async function updateQuote(quoteId, payload, items = []) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: quote, error } = await supabase
    .from(QUOTES)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', quoteId)
    .select()
    .single();
  if (error) throw error;
  await supabase.from(ITEMS).delete().eq('quote_id', quoteId);
  if (items.length) {
    const { error: ie } = await supabase.from(ITEMS).insert(
      items.map((item, i) => ({ ...item, quote_id: quoteId, sort_order: i }))
    );
    if (ie) throw ie;
  }
  return quote;
}

export async function deleteQuote(quoteId) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from(QUOTES).delete().eq('id', quoteId);
  if (error) throw error;
}
