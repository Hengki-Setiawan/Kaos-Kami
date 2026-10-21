"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Compass, Layers, Info } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { type MasterCityRateData } from "@/lib/shipping/data/indonesia514Cities";

interface ShippingHubLeafletMapProps {
  selectedCity?: MasterCityRateData | null;
  onSelectCity?: (city: MasterCityRateData) => void;
  heightClass?: string;
}

// Origin: Workshop Kaos Kami (Kota Makassar - Hub Logistik UPG)
const ORIGIN_MAKASSAR = {
  lat: -5.106018,
  lng: 119.432396,
  label: "Workshop Kaos Kami (Origin UPG Makassar)",
  address: "Komp. Tallo Lama No. 14, Makassar, Sulawesi Selatan",
};

// Koordinat Referensi 38 Provinsi & Titik Kunci Kota Indonesia
const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Sulawesi Selatan": { lat: -5.1477, lng: 119.4327 },
  "Sulawesi Barat": { lat: -2.6775, lng: 118.8894 },
  "Sulawesi Tengah": { lat: -0.8917, lng: 119.8707 },
  "Sulawesi Tenggara": { lat: -3.9985, lng: 122.5126 },
  "Sulawesi Utara": { lat: 1.4748, lng: 124.8421 },
  "Gorontalo": { lat: 0.5435, lng: 123.0568 },
  "DKI Jakarta": { lat: -6.2088, lng: 106.8456 },
  "Jawa Barat": { lat: -6.9175, lng: 107.6191 },
  "Jawa Tengah": { lat: -6.9667, lng: 110.4167 },
  "DI Yogyakarta": { lat: -7.7956, lng: 110.3695 },
  "Jawa Timur": { lat: -7.2575, lng: 112.7521 },
  "Banten": { lat: -6.4058, lng: 106.064 },
  "Bali": { lat: -8.6705, lng: 115.2126 },
  "Nusa Tenggara Barat": { lat: -8.5833, lng: 116.1167 },
  "Nusa Tenggara Timur": { lat: -10.1772, lng: 123.607 },
  "Kalimantan Barat": { lat: -0.0263, lng: 109.3425 },
  "Kalimantan Tengah": { lat: -2.2161, lng: 113.914 },
  "Kalimantan Selatan": { lat: -3.3194, lng: 114.5908 },
  "Kalimantan Timur": { lat: -0.5022, lng: 117.1536 },
  "Kalimantan Utara": { lat: 3.3271, lng: 117.5925 },
  "Sumatera Utara": { lat: 3.5952, lng: 98.6722 },
  "Sumatera Barat": { lat: -0.9471, lng: 100.4172 },
  "Riau": { lat: 0.5071, lng: 101.4478 },
  "Kepulauan Riau": { lat: 1.1301, lng: 104.0529 },
  "Jambi": { lat: -1.6101, lng: 103.6131 },
  "Sumatera Selatan": { lat: -2.9761, lng: 104.7754 },
  "Bengkulu": { lat: -3.8004, lng: 102.2655 },
  "Lampung": { lat: -5.45, lng: 105.2667 },
  "Kepulauan Bangka Belitung": { lat: -2.1324, lng: 106.1128 },
  "Aceh": { lat: 5.5483, lng: 95.3238 },
  "Maluku": { lat: -3.6547, lng: 128.1906 },
  "Maluku Utara": { lat: 0.7904, lng: 127.3808 },
  "Papua": { lat: -2.5916, lng: 140.669 },
  "Papua Barat": { lat: -0.8615, lng: 134.062 },
  "Papua Barat Daya": { lat: -0.8762, lng: 131.2558 },
  "Papua Selatan": { lat: -8.4991, lng: 140.4011 },
  "Papua Tengah": { lat: -3.3643, lng: 135.4967 },
  "Papua Pegunungan": { lat: -4.095, lng: 138.9442 },
};

export const ShippingHubLeafletMap: React.FC<ShippingHubLeafletMapProps> = ({
  selectedCity,
  heightClass = "h-[360px]",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current) return;
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Inisialisasi peta berpusat di Makassar
      const map = L.map(mapContainerRef.current, {
        center: [ORIGIN_MAKASSAR.lat, ORIGIN_MAKASSAR.lng],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      // 1. Origin Marker: Workshop Kaos Kami (Makassar Hub)
      const originIcon = L.divIcon({
        className: "origin-leaflet-marker",
        html: `
          <div style="
            background: #1d4ed8;
            color: #ffffff;
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(29,78,216,0.5);
            border: 2.5px solid #ffffff;
          ">
            <span style="transform: rotate(45deg); font-size: 15px;">🏭</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
      });

      const originMarker = L.marker([ORIGIN_MAKASSAR.lat, ORIGIN_MAKASSAR.lng], {
        icon: originIcon,
      }).addTo(map);

      originMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #1a1a1a; min-width: 180px; padding: 2px;">
          <strong style="color: #1d4ed8; display: block; font-size: 13px; margin-bottom: 2px;">
            ${ORIGIN_MAKASSAR.label}
          </strong>
          <div style="color: #555; font-size: 11px; margin-bottom: 4px;">${ORIGIN_MAKASSAR.address}</div>
          <div style="background: #eff6ff; color: #1d4ed8; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">
            ✓ Titik Asal Pengiriman Seluruh Ekspedisi
          </div>
        </div>
      `);

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    };

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update garis rute & pin tujuan saat selectedCity berganti
  useEffect(() => {
    const updateRoute = async () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const L = await import("leaflet");

      // Hapus marker & polyline tujuan lama
      if (destMarkerRef.current) {
        map.removeLayer(destMarkerRef.current);
        destMarkerRef.current = null;
      }
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      if (!selectedCity) {
        map.setView([ORIGIN_MAKASSAR.lat, ORIGIN_MAKASSAR.lng], 5);
        return;
      }

      const destCoord =
        PROVINCE_COORDINATES[selectedCity.province] || {
          lat: -5.1477,
          lng: 119.4327,
        };

      // Buat Marker Tujuan
      const destIcon = L.divIcon({
        className: "dest-leaflet-marker",
        html: `
          <div style="
            background: #2563eb;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(37,99,235,0.45);
            border: 2px solid #ffffff;
          ">
            <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const destMarker = L.marker([destCoord.lat, destCoord.lng], { icon: destIcon }).addTo(map);

      // Hitung kurir termurah
      const rates = [
        { code: "LION", name: "Lion Parcel", cost: selectedCity.lionReg },
        { code: "SICEPAT", name: "SiCepat", cost: selectedCity.sicepatReg },
        { code: "POS", name: "Pos Indonesia", cost: selectedCity.posKilat },
        { code: "JNE", name: "JNE", cost: selectedCity.jneReg },
        { code: "JNT", name: "J&T", cost: selectedCity.jntEz },
      ].sort((a, b) => a.cost - b.cost);

      const cheapest = rates[0]!;

      destMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #1a1a1a; min-width: 210px; padding: 2px;">
          <strong style="color: #2563eb; display: block; font-size: 13px; margin-bottom: 2px;">
            ${selectedCity.city}
          </strong>
          <div style="color: #666; font-size: 11px; margin-bottom: 6px;">
            ${selectedCity.province} (${selectedCity.region}) · Kode Pos ${selectedCity.postalCode}
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 6px; margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px; color: #10b981;">
              ⭐ Termurah: ${cheapest.name} (Rp ${cheapest.cost.toLocaleString("id-ID")})
            </div>
            <div style="font-size: 10px; color: #4b5563; line-height: 1.4;">
              • Lion Parcel: Rp ${selectedCity.lionReg.toLocaleString("id-ID")}<br/>
              • SiCepat: Rp ${selectedCity.sicepatReg.toLocaleString("id-ID")}<br/>
              • Pos Indonesia: Rp ${selectedCity.posKilat.toLocaleString("id-ID")}<br/>
              • JNE Express: Rp ${selectedCity.jneReg.toLocaleString("id-ID")}<br/>
              • J&T Express: Rp ${selectedCity.jntEz.toLocaleString("id-ID")}
            </div>
          </div>
          <div style="font-size: 10px; color: #888;">Estimasi Tiba: ${selectedCity.etdDays}</div>
        </div>
      `);

      destMarkerRef.current = destMarker;
      destMarker.openPopup();

      // Garis Jalur Logistik Antar-Pulau (Polyline)
      const latlngs: [number, number][] = [
        [ORIGIN_MAKASSAR.lat, ORIGIN_MAKASSAR.lng],
        [destCoord.lat, destCoord.lng],
      ];

      const polyline = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.85,
      }).addTo(map);

      polylineRef.current = polyline;

      // Fit bounds agar kedua titik terlihat
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    };

    void updateRoute();
  }, [selectedCity]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-border-subtle bg-surface-elevated shadow-md`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Info Header Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl p-2.5 shadow-lg max-w-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold text-xs">
            📍
          </div>
          <div>
            <h4 className="font-sans font-bold text-xs text-text-primary uppercase tracking-tight">
              Peta Distribusi 5 Ekspedisi Nasional
            </h4>
            <p className="text-[10px] text-text-muted">
              Origin: Workshop Kaos Kami (Makassar UPG) → 514 Kota Tujuan
            </p>
          </div>
        </div>

        {selectedCity && (
          <div className="mt-2 pt-2 border-t border-border-subtle/50 text-[11px] font-sans flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-text-primary block">{selectedCity.city}</span>
              <span className="text-[10px] text-text-muted">{selectedCity.province}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
              Est. {selectedCity.etdDays}
            </span>
          </div>
        )}
      </div>

      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl px-3 py-1.5 text-[10px] font-sans text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-accent inline-block" />
          <span>Hub Asal (Makassar)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span>Kota Tujuan</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-b-2 border-dashed border-brand-accent inline-block" />
          <span>Rute Ekspedisi</span>
        </span>
      </div>
    </div>
  );
};
