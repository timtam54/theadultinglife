"use client";

import { useEffect, useState } from "react";

interface GeolocationData {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
  timezone?: string;
  org?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
}

interface IPGeolocationPopupProps {
  ip: string;
  onClose: () => void;
}

export default function IPGeolocationPopup({ ip, onClose }: IPGeolocationPopupProps) {
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          throw new Error(data.reason ?? data.error ?? "Failed to fetch geolocation data");
        }
        setGeoData(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ip]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const locationLine = geoData
    ? [geoData.city, geoData.region, geoData.country_name].filter(Boolean).join(", ")
    : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-tal-plum text-white px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">IP Geolocation</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tal-plum" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-2 text-red-600">
                Note: private/local IPs (::1, 10.x, 192.168.x) can&apos;t be geolocated.
              </p>
            </div>
          )}

          {geoData && !loading && !error && (
            <div className="space-y-4">
              <div className="bg-tal-cream-soft p-4 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                  IP Address
                </div>
                <p className="text-tal-plum font-mono">{geoData.ip}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {locationLine && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                        Location
                      </p>
                      <p className="text-sm text-tal-plum">{locationLine}</p>
                      {geoData.postal && (
                        <p className="text-xs text-tal-plum-soft">Postal: {geoData.postal}</p>
                      )}
                    </div>
                  )}

                  {geoData.timezone && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                        Timezone
                      </p>
                      <p className="text-sm text-tal-plum">{geoData.timezone}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {geoData.org && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                        Organisation
                      </p>
                      <p className="text-sm text-tal-plum">{geoData.org}</p>
                    </div>
                  )}

                  {geoData.country_code && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                        Country Code
                      </p>
                      <p className="text-sm text-tal-plum">{geoData.country_code}</p>
                    </div>
                  )}
                </div>
              </div>

              {geoData.latitude && geoData.longitude && (
                <div className="mt-4 pt-4 border-t border-tal-line">
                  <p className="text-sm text-tal-plum-soft mb-2">
                    Coordinates: {geoData.latitude.toFixed(4)}, {geoData.longitude.toFixed(4)}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${geoData.latitude},${geoData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-tal-plum hover:underline"
                  >
                    View on Google Maps
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
