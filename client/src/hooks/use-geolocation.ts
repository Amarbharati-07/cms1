import { useState, useEffect } from "react";

export interface LocationAddress {
  area: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
}

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  address: LocationAddress | null;
  error: string | null;
  loading: boolean;
}

async function reverseGeocode(lat: number, lon: number): Promise<LocationAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "en" }
  });
  if (!response.ok) throw new Error("Reverse geocoding failed");
  const data = await response.json();

  const a = data.address || {};
  const area =
    a.suburb || a.neighbourhood || a.village || a.hamlet || a.road || a.quarter || "";
  const city =
    a.city || a.town || a.municipality || a.county || a.district || "";
  const state = a.state || "";
  const pincode = a.postcode || "";
  const fullAddress = data.display_name || "";

  return { area, city, state, pincode, fullAddress };
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    address: null,
    error: null,
    loading: true,
  });

  const getLocation = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    if (!navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        address: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const address = await reverseGeocode(lat, lon);
          setState({
            latitude: lat,
            longitude: lon,
            address,
            error: null,
            loading: false,
          });
        } catch {
          setState({
            latitude: lat,
            longitude: lon,
            address: null,
            error: null,
            loading: false,
          });
        }
      },
      (error) => {
        setState({
          latitude: null,
          longitude: null,
          address: null,
          error: error.message,
          loading: false,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  return { ...state, retry: getLocation };
}
