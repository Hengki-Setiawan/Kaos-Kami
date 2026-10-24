"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  Search,
  Crosshair,
  X,
  Check,
  Loader2,
  Navigation,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { Z_CLASS_POPOVER } from "@/lib/zIndex";

export interface PickedLocation {
  lat: number;
  lng: number;
  displayName: string;
  district?: string;
  city?: string;
  province?: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  onSelectLocation: (loc: PickedLocation) => void;
  title?: string;
}

// Default center: Kota Makassar (Workshop Tallo)
const DEFAULT_CENTER = { lat: -5.106018, lng: 119.432396 };

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  onSelectLocation,
  title = "Tentukan Titik Pengantaran di Peta",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || DEFAULT_CENTER
  );
  const [detectedAddress, setDetectedAddress] = useState<string>("Memuat alamat...");
  const [detectedDetails, setDetectedDetails] = useState<{ district?: string; city?: string; province?: string }>({});
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reverse Geocode helper
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      const data = await res.json().catch(() => null);
      if (data?.result) {
        const r = data.result;
        setDetectedAddress(r.displayName || `Titik koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setDetectedDetails({
          district: r.district,
          city: r.city,
          province: r.province,
        });
      } else {
        setDetectedAddress(`Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      }
    } catch {
      setDetectedAddress(`Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  // Update marker position & reverse geocode
  const setMarkerPosition = useCallback(
    (lat: number, lng: number, fly = true) => {
      setCurrentCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      if (fly && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
      }
      void reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // Inisialisasi Peta Leaflet saat Modal Terbuka
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current) return;
      const L = await import("leaflet");
      if (!isMounted) return;
      LRef.current = L;

      // Bersihkan instance lama jika ada
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const startLat = initialCoords?.lat || DEFAULT_CENTER.lat;
      const startLng = initialCoords?.lng || DEFAULT_CENTER.lng;

      // Inisialisasi Map
      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: false,
      });

      // Tambahkan tile OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Zoom control di pojok kanan bawah agar tidak tertutup search bar
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Custom SVG Pin Icon yang tajam & modern
      const pinIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="position: relative; transform: translate(-50%, -100%); cursor: grab;">
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              background: #2563eb;
              transform: rotate(-45deg);
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 14px rgba(37,99,235,0.5), 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background: #ffffff;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
            <div style="
              width: 14px;
              height: 5px;
              background: rgba(0,0,0,0.3);
              border-radius: 50%;
              margin: 2px auto 0 auto;
              filter: blur(1.5px);
            "></div>
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
      });

      // Marker Draggable
      const marker = L.marker([startLat, startLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setCurrentCoords({ lat: pos.lat, lng: pos.lng });
        void reverseGeocode(pos.lat, pos.lng);
      });

      // Klik di peta untuk pindah pin
      map.on("click", (e: any) => {
        setMarkerPosition(e.latlng.lat, e.latlng.lng, false);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Inisialisasi alamat awal
      void reverseGeocode(startLat, startLng);

      // Invalidate size setelah modal mount
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
    };

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialCoords, reverseGeocode, setMarkerPosition]);

  // Debounced Search via /api/geocode/search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json().catch(() => null);
        if (data?.results && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handler GPS Device Location
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Perangkat Anda tidak mendukung fitur lokasi GPS.");
      return;
    }
    setGpsLoading(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMarkerPosition(latitude, longitude, true);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setErrorMsg(
          err.code === 1
            ? "Izin lokasi ditolak. Silakan izinkan akses lokasi di browser Anda atau cari alamat manual."
            : "Gagal mendeteksi lokasi GPS. Coba cari nama jalan di kolom pencarian."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  const handleSelectSearchResult = (item: any) => {
    setMarkerPosition(item.lat, item.lon, true);
    setSearchQuery(item.displayName);
    setSearchResults([]);
    setSearchFocused(false);
  };

  const handleConfirmLocation = () => {
    onSelectLocation({
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      displayName: detectedAddress,
      district: detectedDetails.district,
      city: detectedDetails.city,
      province: detectedDetails.province,
    });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-picker-title"
      className={`fixed inset-0 ${Z_CLASS_POPOVER} flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn`}
    >
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[720px] rounded-3xl bg-surface border border-border-subtle shadow-2xl flex flex-col overflow-hidden text-text-primary">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/90 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <h2 id="location-picker-title" className="text-sm sm:text-base font-bold font-sans tracking-tight text-text-primary leading-tight">
                {title}
              </h2>
              <p className="text-[11px] text-text-muted">
                Geser pin atau klik di peta persis di depan rumah / lokasi Anda
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Peta"
            className="w-8 h-8 rounded-xl bg-surface-elevated hover:bg-border-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Floating Search & GPS Control Bar */}
        <div className="absolute top-16 left-4 right-4 z-30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3.5 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jalan, kelurahan, perumahan, atau gedung di Indonesia..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-surface/95 border border-border-strong text-xs font-sans text-text-primary placeholder:text-text-muted shadow-lg backdrop-blur-md focus:outline-none focus:border-brand-accent transition-all"
              />
              {isSearching ? (
                <Loader2 size={14} className="absolute right-3.5 text-brand-accent animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-3 text-text-muted hover:text-text-primary p-0.5"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Dropdown Hasil Pencarian */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-2xl bg-surface border border-border-subtle shadow-2xl divide-y divide-border-subtle z-40 backdrop-blur-md">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-surface-elevated transition-colors flex items-start gap-2.5 text-xs group"
                  >
                    <MapPin size={14} className="text-brand-accent shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary truncate">{item.displayName}</p>
                      {(item.district || item.city) && (
                        <p className="text-[10px] text-text-muted truncate">
                          {[item.district, item.city, item.province].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tombol GPS Saya */}
          <button
            type="button"
            onClick={handleGetDeviceLocation}
            disabled={gpsLoading}
            className="px-3.5 py-2.5 rounded-2xl bg-surface/95 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-white text-xs font-bold font-sans shadow-lg backdrop-blur-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 cursor-pointer active:scale-95"
            title="Deteksi lokasi fisik perangkat Anda saat ini"
          >
            {gpsLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Crosshair size={15} className="shrink-0" />
            )}
            <span>{gpsLoading ? "Mencari GPS..." : "Lokasi Saya"}</span>
          </button>
        </div>

        {/* Error Callout Banner */}
        {errorMsg && (
          <div className="absolute top-32 left-4 right-4 z-30 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn shadow-md">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span className="flex-1 text-[11px]">{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5 text-rose-400 hover:text-white">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Map Canvas */}
        <div className="flex-1 w-full h-full relative z-10 bg-neutral-900">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Bottom Location Confirmation Sheet */}
        <div className="p-4 sm:p-5 border-t border-border-subtle bg-surface/95 backdrop-blur-md shrink-0 z-20 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-brand-accent/15 text-brand-accent text-[10px] font-mono font-bold tracking-wider uppercase">
                  Titik Terpilih
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
                {isLoadingAddress ? "Membaca nama jalan dan wilayah..." : detectedAddress}
              </p>
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-border-subtle border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-primary transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLocation}
                disabled={isLoadingAddress}
                className="px-5 py-2.5 rounded-xl bg-brand-accent hover:opacity-95 text-canvas text-xs font-bold font-sans transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer active:scale-95"
              >
                <Check size={15} />
                <span>Gunakan Titik Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
