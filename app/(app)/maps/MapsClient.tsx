"use client";

import { useEffect, useRef, useState } from "react";
import type { MapLocation } from "@/lib/services/map-locations";

interface MapsLibrary {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  LatLngBounds: new () => GLatLngBounds;
  InfoWindow: new (opts: { content: string }) => GInfoWindow;
}
interface MarkerLibrary {
  Marker: new (opts: {
    position: { lat: number; lng: number };
    map: GMap;
    title?: string;
  }) => GMarker;
}
interface GMap {
  fitBounds(b: GLatLngBounds): void;
  setCenter(pos: { lat: number; lng: number }): void;
  setZoom(z: number): void;
}
interface GLatLngBounds {
  extend(pos: { lat: number; lng: number }): void;
  isEmpty(): boolean;
}
interface GMarker {
  addListener(evt: "click", cb: () => void): void;
  getPosition(): { lat(): number; lng(): number } | undefined;
}
interface GInfoWindow {
  open(opts: { anchor: GMarker; map: GMap }): void;
  close(): void;
  setContent(content: string): void;
}
interface GoogleMapsWindow {
  google?: {
    maps: {
      importLibrary: (
        name: "maps" | "marker"
      ) => Promise<MapsLibrary | MarkerLibrary>;
    };
  };
  __talGmapsReady?: () => void;
}

let loader: Promise<void> | null = null;
function ensureGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Not in browser"));
  }
  if (loader) return loader;
  const w = window as GoogleMapsWindow;
  if (w.google?.maps?.importLibrary) {
    loader = Promise.resolve();
    return loader;
  }
  loader = new Promise<void>((resolve, reject) => {
    const cbName = "__talGmapsReady";
    w[cbName] = () => resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]'
    );
    if (existing) {
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&v=weekly&callback=${cbName}`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = "true";
    s.addEventListener("error", () =>
      reject(new Error("Failed to load Google Maps"))
    );
    document.head.appendChild(s);
  });
  return loader;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function MapsClient({
  locations,
  apiKey,
}: {
  locations: MapLocation[];
  apiKey: string | null;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setErr("Google Maps API key is not configured.");
      return;
    }
    if (!mapRef.current) return;
    if (locations.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureGoogleMaps(apiKey);
        const g = (window as GoogleMapsWindow).google;
        if (!g?.maps?.importLibrary) throw new Error("Google Maps loader missing");
        const [mapsLib, markerLib] = (await Promise.all([
          g.maps.importLibrary("maps"),
          g.maps.importLibrary("marker"),
        ])) as [MapsLibrary, MarkerLibrary];
        if (cancelled || !mapRef.current) return;

        const map = new mapsLib.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 },
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const bounds = new mapsLib.LatLngBounds();
        const info = new mapsLib.InfoWindow({ content: "" });

        for (const loc of locations) {
          const pos = { lat: loc.lat, lng: loc.lon };
          const marker = new markerLib.Marker({
            position: pos,
            map,
            title: loc.address,
          });
          bounds.extend(pos);
          marker.addListener("click", () => {
            info.setContent(
              `<div style="font-family: system-ui, sans-serif; max-width: 260px;">
                 <div style="font-weight: 600; color: #4a2660; margin-bottom: 2px;">${escapeHtml(loc.subcategoryName)}</div>
                 <div style="font-size: 12px; color: #7b6689; margin-bottom: 6px;">${escapeHtml(loc.questionLabel)} · ${escapeHtml(loc.userName)}</div>
                 <div style="font-size: 13px; color: #333;">${escapeHtml(loc.address)}</div>
               </div>`
            );
            info.open({ anchor: marker, map });
          });
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
          if (locations.length === 1) {
            map.setZoom(15);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Failed to load map");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, locations]);

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
        Google Maps API key is not configured.
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
        No addresses saved yet. As you fill in addresses across your Organiser
        folders — property, rental, employer, insurance and more — they'll
        appear here as pins on a map.
      </div>
    );
  }

  return (
    <div>
      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm mb-3">
          {err}
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full rounded-2xl border border-tal-line overflow-hidden bg-white"
        style={{ height: "70vh", minHeight: "500px" }}
      />
      <details className="mt-3 rounded-2xl border border-tal-line bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-tal-plum">
          List all {locations.length} location
          {locations.length === 1 ? "" : "s"}
        </summary>
        <ul className="mt-3 space-y-2">
          {locations.map((loc, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-tal-plum text-white text-[10px] shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-tal-plum">
                  {loc.subcategoryName}
                </div>
                <div className="text-xs text-tal-plum-soft">
                  {loc.questionLabel} · {loc.userName}
                </div>
                <div className="text-sm text-tal-plum-soft mt-0.5">
                  {loc.address}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
