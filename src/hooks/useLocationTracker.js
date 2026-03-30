import { useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { updateLocation } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabase';

const INTERVAL_MS = 30_000; // update every 30 seconds

/**
 * Tracks the current user's GPS location and syncs it to Supabase.
 * Should be mounted once in Layout so it runs on every page.
 */
export function useLocationTracker() {
  const { user, isAuthenticated } = useAppStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user || !isSupabaseConfigured) return;
    if (!('geolocation' in navigator)) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation(user.id, pos.coords.latitude, pos.coords.longitude);
        },
        () => {}, // silent fail — user may have denied location
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 20_000 }
      );
    };

    sendLocation(); // immediate first call
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, user?.id]);
}
