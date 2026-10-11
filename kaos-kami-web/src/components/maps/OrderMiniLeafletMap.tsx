"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, ExternalLink, Maximize2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface OrderMiniLeafletMapProps {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  addressText: string;
  notes?: string | null;
  deliveryMethod?: string | null;
  lat?: number | null;
  lng?: number | null;
  heightClass?: string;
}

// Koordinat default Workshop Kaos Kami (Origin Makassar Tallo)
const WORKSHOP_COORDS = { lat: -5.106018, lng: 119.432396 };

// Peta Koordinat Kota/Provinsi se-Indonesia untuk estimasi fallback
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Jabodetabek & Jawa
  "jakarta selatan": { lat: -6.2615, lng: 106.8106 },
  "jakarta timur": { lat: -6.225, lng: 106.9004 },
  "jakarta pusat": { lat: -6.1805, lng: 106.8284 },
  "jakarta barat": { lat: -6.1683, lng: 106.7589 },
  "jakarta utara": { lat: -6.1384, lng: 106.864 },
  "kemang": { lat: -6.2736, lng: 106.8166 },
  "mampang": { lat: -6.2556, lng: 106.8282 },
  "jakarta": { lat: -6.2088, lng: 106.8456 },
  "bogor": { lat: -6.5971, lng: 106.806 },
  "depok": { lat: -6.4025, lng: 106.7942 },
  "tangerang": { lat: -6.1783, lng: 106.6319 },
  "bekasi": { lat: -6.2383, lng: 106.9756 },
  "bandung": { lat: -6.9175, lng: 107.6191 },
  "surabaya": { lat: -7.2575, lng: 112.7521 },
  "semarang": { lat: -6.9667, lng: 110.4167 },
  "yogyakarta": { lat: -7.7956, lng: 110.3695 },
  "malang": { lat: -7.9666, lng: 112.6326 },
  "solo": { lat: -7.5755, lng: 110.8243 },
  "denpasar": { lat: -8.6705, lng: 115.2126 },
  "bali": { lat: -8.4095, lng: 115.1889 },

  // Sulawesi & Indonesia Timur
  "makassar": { lat: -5.1477, lng: 119.4327 },
  "tallo": { lat: -5.106, lng: 119.4324 },
  "panakkukang": { lat: -5.1481, lng: 119.4526 },
  "tamalanrea": { lat: -5.1328, lng: 119.4938 },
  "biringkanaya": { lat: -5.1017, lng: 119.5222 },
  "rappocini": { lat: -5.1742, lng: 119.4428 },
  "manggala": { lat: -5.1672, lng: 119.4965 },
  "gowa": { lat: -5.2014, lng: 119.4589 },
  "maros": { lat: -5.0069, lng: 119.5746 },
  "bone": { lat: -4.5387, lng: 120.3276 },
  "parepare": { lat: -4.0145, lng: 119.6247 },
  "palopo": { lat: -2.9928, lng: 120.197 },
  "kendari": { lat: -3.9985, lng: 122.5126 },
  "manado": { lat: 1.4748, lng: 124.8421 },
  "palu": { lat: -0.8917, lng: 119.8707 },
  "gorontalo": { lat: 0.5435, lng: 123.0568 },
  "mamuju": { lat: -2.6775, lng: 118.8894 },
  "jayapura": { lat: -2.5916, lng: 140.669 },
  "merauke": { lat: -8.4991, lng: 140.4011 },
  "sorong": { lat: -0.8762, lng: 131.2558 },
  "ambon": { lat: -3.6547, lng: 128.1906 },
  "mataram": { lat: -8.5833, lng: 116.1167 },
  "kupang": { lat: -10.1772, lng: 123.607 },

  // Sumatera & Kalimantan
  "medan": { lat: 3.5952, lng: 98.6722 },
  "palembang": { lat: -2.9761, lng: 104.7754 },
  "padang": { lat: -0.9471, lng: 100.4172 },
  "pekanbaru": { lat: 0.5071, lng: 101.4478 },
  "batam": { lat: 1.1301, lng: 104.0529 },
  "lampung": { lat: -5.45, lng: 105.2667 },
  "aceh": { lat: 5.5483, lng: 95.3238 },
  "samarinda": { lat: -0.5022, lng: 117.1536 },
  "balikpapan": { lat: -1.2379, lng: 116.8529 },
  "banjarmasin": { lat: -3.3194, lng: 114.5908 },
  "pontianak": { lat: -0.0263, lng: 109.3425 },
};

function detectCityCoordinates(text: string): { lat: number; lng: number } | null {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(CITY_COORDINATES)) {
    if (lower.includes(key)) {
      return val;
    }
  }
  return null;
}

/**
 * Ekstrak koordinat dari catatan atau teks alamat jika tidak disediakan langsung
 */
function extractCoordinates(notes?: string | null, addressText?: string): { lat: number; lng: number } | null {
  const combined = `${notes || ""} ${addressText || ""}`;
  const match =
    combined.match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i) ||
    combined.match(/google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    combined.match(/(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})/);

  if (match && match[1] && match[2]) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
}

export const OrderMiniLeafletMap: React.FC<OrderMiniLeafletMapProps> = ({
  orderNumber,
  recipientName,
  addressText,
  notes,
  deliveryMethod,
  lat,
  lng,
  heightClass = "h-40",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isExactGps, setIsExactGps] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setCoords({ lat, lng });
      setIsExactGps(true);
    } else {
      const extracted = extractCoordinates(notes, addressText);
      if (extracted) {
        setCoords(extracted);
        setIsExactGps(true);
      } else {
        // Cek deteksi koordinat kota/kabupaten se-Indonesia dari teks alamat/catatan
        const detected = detectCityCoordinates(`${addressText} ${notes || ""}`);
        if (detected) {
          setCoords(detected);
          setIsExactGps(false);
        } else if (deliveryMethod === "FREE_MAKASSAR" || deliveryMethod === "PICKUP") {
          setCoords({ lat: -5.147665, lng: 119.432731 }); // Pusat Makassar
          setIsExactGps(false);
        } else {
          setCoords({ lat: -6.2088, lng: 106.8456 }); // Default nasional (Jakarta)
          setIsExactGps(false);
        }
      }
    }
  }, [lat, lng, notes, addressText, deliveryMethod]);

  useEffect(() => {
    let isMounted = true;

    const initLeaflet = async () => {
      if (!mapContainerRef.current || !coords) return;
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: isExactGps ? 15 : 12,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Custom SVG Marker Icon
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            background: ${isExactGps ? "#e65100" : "#3b82f6"};
            color: #ffffff;
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
          ">
            <span style="transform: rotate(45deg); font-size: 13px; font-weight: bold;">📍</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; color: #1a1a1a; min-width: 140px; padding: 2px;">
          <strong style="color: #e65100; display: block; font-size: 12px; margin-bottom: 2px;">
            Order #${orderNumber}
          </strong>
          <div style="font-weight: bold; margin-bottom: 2px;">${recipientName}</div>
          <div style="color: #666; font-size: 10px; line-height: 1.2;">${addressText}</div>
          ${isExactGps ? `<div style="color: #10b981; font-size: 9px; margin-top: 4px; font-weight: bold;">✓ GPS Terkunci (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})</div>` : ""}
        </div>
      `);

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Force recalculate container size
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    };

    void initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coords, isExactGps, orderNumber, recipientName, addressText]);

  const googleMapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-border-subtle bg-surface-elevated group`}>
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Header Overlay Badges */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
        <span
          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold flex items-center gap-1 shadow-xs border ${
            isExactGps
              ? "bg-brand-accent text-canvas border-brand-accent/50"
              : "bg-surface/90 text-text-muted border-border-subtle"
          }`}
        >
          <MapPin size={10} />
          <span>{isExactGps ? "PIN GPS TERKUNCI" : "ESTIMASI WILAYAH"}</span>
        </span>

        {coords && isExactGps && (
          <span className="bg-surface/90 text-text-primary px-1.5 py-0.5 rounded font-mono text-[9px] border border-border-subtle">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Bottom Action Button Overlay */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-2.5 py-1 rounded-lg bg-surface/95 hover:bg-brand-accent text-text-primary hover:text-canvas border border-border-subtle hover:border-brand-accent font-sans font-bold text-[10px] flex items-center gap-1 shadow-md transition-all cursor-pointer"
          title="Buka Navigasi Rute Kurir di Google Maps"
        >
          <Navigation size={10} />
          <span>Rute Maps</span>
          <ExternalLink size={9} className="opacity-70" />
        </a>
      </div>
    </div>
  );
};
