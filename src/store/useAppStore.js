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

        // Safety net — if getSession() hangs (expired/corrupt token in localStorage),
        // force the spinner off after 8 s so the user isn't stuck forever.
        const safetyTimer = setTimeout(() => {
          if (get().authLoading) set({ authLoading: false });
        }, 8000);

        // Restore existing session (e.g. page refresh)
        supabase.auth.getSession()
          .then(({ data: { session } }) => {
            clearTimeout(safetyTimer);
            if (session?.user) {
              // Set auth state immediately, load profile in background
              set({
                user: session.user,
                profile: { id: session.user.id, role: 'seller', full_name: session.user.email },
                isAuthenticated: true,
                authLoading: false,
              });
              getProfile(session.user.id).then((profile) => {
                if (profile) set({ profile });
              }).catch(() => {});
            } else {
              set({ authLoading: false });
            }
          })
          .catch(() => {
            clearTimeout(safetyTimer);
            set({ authLoading: false });
          });

        // Live auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            // TOKEN_REFRESHED fires when an expired access token is silently renewed
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
              // Set authenticated IMMEDIATELY — do NOT await getProfile here.
              // Supabase SDK waits for this callback to return before resolving
              // signInWithPassword(), so any async DB call here blocks the login.
              set({
                user: session.user,
                profile: { id: session.user.id, role: 'seller', full_name: session.user.email },
                isAuthenticated: true,
                authLoading: false,
              });
              // Load full profile in background without blocking auth
              getProfile(session.user.id).then((profile) => {
                if (profile) set({ profile });
              }).catch(() => {});
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
