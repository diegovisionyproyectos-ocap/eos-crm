import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getProfile } from '../services/authService';

const useAppStore = create(
  devtools(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────
      user: null,
      profile: null,       // crm_profiles row (full_name, role, last_lat…)
      isAuthenticated: false,
      authLoading: true,   // true until initial session check completes

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      logout: async () => {
        if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
        set({ user: null, profile: null, isAuthenticated: false });
      },

      /** Returns true when the logged-in user has the 'admin' role */
      isAdmin: () => get().profile?.role === 'admin',

      /**
       * Initialize Supabase auth listener + restore session.
       * Call once from App on mount.
       */
      initAuth: () => {
        if (!isSupabaseConfigured || !supabase) {
          // Offline / demo mode — treat as admin so all features are visible
          set({
            user: { id: 'demo', email: 'admin@eos.com.sv' },
            profile: { id: 'demo', full_name: 'Admin Demo', role: 'admin', email: 'admin@eos.com.sv' },
            isAuthenticated: true,
            authLoading: false,
          });
          return;
        }

        // Restore existing session (e.g. page refresh)
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            const profile = await getProfile(session.user.id);
            set({
              user: session.user,
              profile: profile || { id: session.user.id, role: 'seller', full_name: session.user.email },
              isAuthenticated: true,
              authLoading: false,
            });
          } else {
            set({ authLoading: false });
          }
        });

        // Live auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const profile = await getProfile(session.user.id);
              set({
                user: session.user,
                profile: profile || { id: session.user.id, role: 'seller', full_name: session.user.email },
                isAuthenticated: true,
                authLoading: false,
              });
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, profile: null, isAuthenticated: false, authLoading: false });
            }
          }
        );

        // Cleanup on hot-reload / dev
        if (import.meta.hot) {
          import.meta.hot.dispose(() => subscription.unsubscribe());
        }
      },

      // ── Navigation ────────────────────────────────────────
      currentPage: 'dashboard',
      setCurrentPage: (page) => set({ currentPage: page }),

      // ── Sidebar ───────────────────────────────────────────
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // ── Global UI ─────────────────────────────────────────
      activeModal: null,
      modalData: null,
      openModal: (modal, data = null) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      detailPanel: null,
      openDetailPanel: (type, id) => set({ detailPanel: { type, id } }),
      closeDetailPanel: () => set({ detailPanel: null }),

      // ── Toast notifications ───────────────────────────────
      toasts: [],
      addToast: (message, type = 'success') => {
        const id = Date.now();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 4000);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // ── Map mode ──────────────────────────────────────────
      mapMode: 'markers',
      setMapMode: (mode) => set({ mapMode: mode }),

      selectedMapCompanyId: null,
      setSelectedMapCompanyId: (id) => set({ selectedMapCompanyId: id }),

      locationPickMode: false,
      pickedLocation: null,
      startLocationPick: () => set({ locationPickMode: true, pickedLocation: null }),
      setPickedLocation: (loc) => set({ pickedLocation: loc, locationPickMode: false }),
      cancelLocationPick: () => set({ locationPickMode: false, pickedLocation: null }),

      // ── Team map ──────────────────────────────────────────
      /** Show vendor location pins on the main map (admin only) */
      showTeamOnMap: false,
      setShowTeamOnMap: (v) => set({ showTeamOnMap: v }),
    }),
    { name: 'eos-app-store' }
  )
);

export default useAppStore;
