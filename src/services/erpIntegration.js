/**
 * ERP Integration Service
 * When an opportunity moves to "ganado", this service
 * creates the school as an active client in the EOS ERP.
 *
 * In production: replace the fetch call with your ERP API endpoint.
 */

const ERP_API_URL = import.meta.env.VITE_ERP_API_URL || '';
const ERP_API_KEY = import.meta.env.VITE_ERP_API_KEY || '';

/**
 * Trigger ERP sync when a deal is won
 * @param {Object} opportunity - The won opportunity with company data
 */
export async function triggerERPSync(opportunity) {
  // Log always (useful for debugging)
  console.info('[EOS ERP] Deal won — syncing client:', {
    company: opportunity.crm_companies?.name,
    value: opportunity.value,
    billing_cycle: opportunity.billing_cycle,
  });

  if (!ERP_API_URL) {
    // In development without ERP configured, just simulate success
    console.warn('[EOS ERP] ERP_API_URL not configured — sync simulated');
    return { ok: true, simulated: true };
  }

  try {
    const payload = {
      source: 'eos_crm',
      event: 'deal_won',
      opportunity_id: opportunity.id,
      company: {
        id: opportunity.crm_companies?.id,
        name: opportunity.crm_companies?.name,
        city: opportunity.crm_companies?.city,
        lat: opportunity.crm_companies?.lat,
        lng: opportunity.crm_companies?.lng,
      },
      contract: {
        value: opportunity.value,
        billing_cycle: opportunity.billing_cycle,
        close_date: opportunity.expected_close_date,
      },
      synced_at: new Date().toISOString(),
    };

    const res = await fetch(`${ERP_API_URL}/api/crm/deal-won`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ERP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ERP responded ${res.status}: ${body}`);
    }

    console.info('[EOS ERP] Sync successful');
    return { ok: true };
  } catch (err) {
    console.error('[EOS ERP] Sync failed:', err.message);
    // Don't throw — ERP sync failure should NOT block CRM operations
    return { ok: false, error: err.message };
  }
}
