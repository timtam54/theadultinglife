"use client";

import { useEffect, useRef, useState } from "react";

interface AddressValue {
  address: string;
  lat: number | null;
  lon: number | null;
}

interface PlacesAutocomplete {
  addListener(evt: "place_changed", cb: () => void): void;
  getPlace(): {
    formatted_address?: string;
    geometry?: { location?: { lat(): number; lng(): number } };
  };
}
interface PlacesLibrary {
  Autocomplete: new (
    input: HTMLInputElement,
    opts: {
      componentRestrictions?: { country: string[] };
      fields?: string[];
      types?: string[];
    }
  ) => PlacesAutocomplete;
}
interface GoogleMapsWindow {
  google?: {
    maps: {
      importLibrary: (name: "places") => Promise<PlacesLibrary>;
      places?: PlacesLibrary;
    };
  };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

interface GoogleMapsBootstrapWindow {
  __talGmapsReady?: () => void;
}

let placesLoader: Promise<PlacesLibrary> | null = null;
function loadPlacesLibrary(): Promise<PlacesLibrary> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Not in browser"));
  }
  if (placesLoader) return placesLoader;
  const w = window as unknown as GoogleMapsWindow;

  const importPlaces = () => {
    const g = (window as unknown as GoogleMapsWindow).google;
    if (!g?.maps?.importLibrary) {
      return Promise.reject(new Error("Google Maps loader missing"));
    }
    return g.maps.importLibrary("places");
  };

  if (w.google?.maps?.importLibrary) {
    placesLoader = importPlaces();
    return placesLoader;
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAP_API;
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAP_API is not set"));
  }

  placesLoader = new Promise<PlacesLibrary>((resolve, reject) => {
    const callbackName = "__talGmapsReady";
    (window as unknown as GoogleMapsBootstrapWindow)[callbackName] = () => {
      importPlaces().then(resolve, reject);
    };
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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&v=weekly&callback=${callbackName}`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = "true";
    s.addEventListener("error", () =>
      reject(new Error("Failed to load Google Maps"))
    );
    document.head.appendChild(s);
  });
  return placesLoader;
}

function parse(value: string): AddressValue {
  if (!value) return { address: "", lat: null, lon: null };
  try {
    const parsed = JSON.parse(value) as Partial<AddressValue>;
    if (parsed && typeof parsed === "object" && typeof parsed.address === "string") {
      return {
        address: parsed.address,
        lat: typeof parsed.lat === "number" ? parsed.lat : null,
        lon: typeof parsed.lon === "number" ? parsed.lon : null,
      };
    }
  } catch {
    // Legacy plain-string address.
  }
  return { address: value, lat: null, lon: null };
}

function serialize(v: AddressValue): string {
  if (!v.address && v.lat == null && v.lon == null) return "";
  return JSON.stringify(v);
}

export function AddressInput({ value, onChange, placeholder, ariaLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<PlacesAutocomplete | null>(null);
  const [current, setCurrent] = useState<AddressValue>(() => parse(value));
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep local state in sync when parent value changes (e.g., form reset).
  useEffect(() => {
    setCurrent(parse(value));
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    loadPlacesLibrary().then(
      (places) => {
        if (cancelled || !inputRef.current || autocompleteRef.current) return;
        const ac = new places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: ["au", "nz"] },
          fields: ["formatted_address", "geometry"],
          types: ["address"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const next: AddressValue = {
            address: place.formatted_address ?? inputRef.current?.value ?? "",
            lat: place.geometry?.location?.lat() ?? null,
            lon: place.geometry?.location?.lng() ?? null,
          };
          setCurrent(next);
          onChange(serialize(next));
        });
        autocompleteRef.current = ac;
      },
      (err: Error) => {
        console.error("[AddressInput] loadPlacesLibrary failed", err);
        if (!cancelled) setLoadError(err.message);
      }
    );
    return () => {
      cancelled = true;
    };
    // Load runs once — onChange is intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base =
    "w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm";

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        aria-label={ariaLabel}
        placeholder={placeholder ?? "Start typing an address…"}
        defaultValue={current.address}
        onBlur={(e) => {
          // If the user typed a free-form address without selecting from the
          // dropdown, still capture the text (without coords).
          const typed = e.target.value;
          if (typed !== current.address) {
            const next: AddressValue = { address: typed, lat: null, lon: null };
            setCurrent(next);
            onChange(serialize(next));
          }
        }}
        className={base}
      />
      {current.lat != null && current.lon != null && (
        <p className="mt-1 text-xs text-tal-plum-soft">
          {current.lat.toFixed(5)}, {current.lon.toFixed(5)}
        </p>
      )}
      {loadError && (
        <p className="mt-1 text-xs text-red-600">
          Address autocomplete unavailable — type the address manually. ({loadError})
        </p>
      )}
    </div>
  );
}
