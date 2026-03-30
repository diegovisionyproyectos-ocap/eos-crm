import { supabase } from './supabase';

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getProfile(userId) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('crm_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function getAllProfiles() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('crm_profiles')
    .select('*')
    .order('created_at');
  if (error) return [];
  return data;
}

export async function updateLocation(userId, lat, lng) {
  if (!supabase) return;
  await supabase
    .from('crm_profiles')
    .update({ last_lat: lat, last_lng: lng, last_seen: new Date().toISOString() })
    .eq('id', userId);
}

export async function updateProfileRole(profileId, role) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('crm_profiles')
    .update({ role })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfileInfo(profileId, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('crm_profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function registerUser(email, password, fullName) {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}
