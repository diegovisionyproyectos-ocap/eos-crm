import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchCompanies, createCompany, updateCompany, deleteCompany } from '../services/companiesService';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, moveOpportunityStage } from '../services/opportunitiesService';
import { fetchActivities, createActivity, completeActivity, deleteActivity } from '../services/activitiesService';
import { SEED_COMPANIES, SEED_OPPORTUNITIES } from '../utils/constants';

const useCRMStore = create(
  devtools(
    (set, get) => ({
      // ── Data ─────────────────────────────────────────────
      companies: [],
      contacts: [],
      opportunities: [],
      activities: [],
      loading: { companies: false, opportunities: false, activities: false },
      initialized: false,

      // ── Filters ───────────────────────────────────────────
      companySearch: '',
      opportunitySearch: '',
      stageFilter: '',
      sellerFilter: '',
      setCompanySearch: (v) => set({ companySearch: v }),
      setOpportunitySearch: (v) => set({ opportunitySearch: v }),
      setStageFilter: (v) => set({ stageFilter: v }),

      // ── Bootstrap ─────────────────────────────────────────
      /**
       * Load all data from Supabase.
       * Falls back to seed data when Supabase is not configured.
       */
      async initialize() {
        if (get().initialized) return;
        set((s) => ({ loading: { ...s.loading, companies: true, opportunities: true, activities: true } }));

        const [companiesRes, opportunitiesRes, activitiesRes] = await Promise.all([
          fetchCompanies(),
          fetchOpportunities(),
          fetchActivities({ limit: 50 }),
        ]);

        const companies = companiesRes.data?.length ? companiesRes.data : SEED_COMPANIES;
        const opportunities = opportunitiesRes.data?.length ? opportunitiesRes.data : SEED_OPPORTUNITIES;

        set({
          companies,
          opportunities,
          activities: activitiesRes.data || [],
          loading: { companies: false, opportunities: false, activities: false },
          initialized: true,
        });
      },

      loadSeedData() {
        set({ companies: SEED_COMPANIES, opportunities: SEED_OPPORTUNITIES, activities: [], initialized: true });
      },

      // ── Companies ─────────────────────────────────────────
      async addCompany(payload) {
        const company = await createCompany(payload);
        // If Supabase not configured, create local record
        const newCompany = company || { ...payload, id: `c${Date.now()}`, created_at: new Date().toISOString() };
        set((s) => ({ companies: [newCompany, ...s.companies] }));
        return newCompany;
      },

      async editCompany(id, payload) {
        const updated = await updateCompany(id, payload);
        set((s) => ({
          companies: s.companies.map((c) => (c.id === id ? { ...c, ...(updated || payload) } : c)),
        }));
      },

      async removeCompany(id) {
        await deleteCompany(id);
        set((s) => ({ companies: s.companies.filter((c) => c.id !== id) }));
      },

      // ── Opportunities ─────────────────────────────────────
      async addOpportunity(payload) {
        const opp = await createOpportunity(payload);
        const newOpp = opp || { ...payload, id: `o${Date.now()}`, created_at: new Date().toISOString() };
        set((s) => ({ opportunities: [newOpp, ...s.opportunities] }));
        return newOpp;
      },

      async editOpportunity(id, payload) {
        const updated = await updateOpportunity(id, payload);
        set((s) => ({
          opportunities: s.opportunities.map((o) => (o.id === id ? { ...o, ...(updated || payload) } : o)),
        }));
      },

      async moveStage(id, newStage, probability) {
        // Optimistic update
        set((s) => ({
          opportunities: s.opportunities.map((o) =>
            o.id === id ? { ...o, stage: newStage, probability } : o
          ),
        }));
        try {
          await moveOpportunityStage(id, newStage, probability);
          // If stage is ganado, update the related company status
          const opp = get().opportunities.find((o) => o.id === id);
          if (newStage === 'ganado' && opp?.company_id) {
            set((s) => ({
              companies: s.companies.map((c) =>
                c.id === opp.company_id ? { ...c, status: 'active' } : c
              ),
            }));
          }
        } catch (err) {
          // Rollback on error
          console.error('Stage move failed:', err);
        }
      },

      async removeOpportunity(id) {
        await deleteOpportunity(id);
        set((s) => ({ opportunities: s.opportunities.filter((o) => o.id !== id) }));
      },

      // ── Activities ────────────────────────────────────────
      async addActivity(payload) {
        const activity = await createActivity(payload);
        const newActivity = activity || { ...payload, id: `a${Date.now()}`, created_at: new Date().toISOString() };
        set((s) => ({ activities: [newActivity, ...s.activities] }));
        return newActivity;
      },

      async finishActivity(id) {
        await completeActivity(id);
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === id ? { ...a, completed_at: new Date().toISOString() } : a
          ),
        }));
      },

      async removeActivity(id) {
        await deleteActivity(id);
        set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
      },

      // ── Derived getters ───────────────────────────────────
      getCompanyById: (id) => get().companies.find((c) => c.id === id),
      getOpportunitiesByCompany: (companyId) =>
        get().opportunities.filter((o) => o.company_id === companyId),
      getActivitiesByCompany: (companyId) =>
        get().activities.filter((a) => a.company_id === companyId),

      /**
       * Get pipeline stats for dashboard
       */
      getPipelineStats() {
        const { opportunities } = get();
        const total = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
        const weighted = opportunities
          .filter((o) => o.stage !== 'perdido')
          .reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 0) / 100), 0);
        const won = opportunities
          .filter((o) => o.stage === 'ganado')
          .reduce((sum, o) => sum + (o.value || 0), 0);
        const lost = opportunities.filter((o) => o.stage === 'perdido').length;
        const active = opportunities.filter((o) => !['ganado', 'perdido'].includes(o.stage)).length;

        return { total, weighted, won, lost, active };
      },
    }),
    { name: 'eos-crm-store' }
  )
);

export default useCRMStore;
