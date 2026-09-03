export interface DeliveryOption {
  id: 'WORKSHOP_PICKUP' | 'MAXIM_COD' | 'FLAT_RATE_MAKASSAR';
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  badge?: string;
}

export const MAKASSAR_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'WORKSHOP_PICKUP',
    name: 'Ambil di Workshop (Tamalanrea)',
    description: 'Jl. Perintis Kemerdekaan KM 10, Tamalanrea Indah, Makassar',
    price: 0,
    estimatedTime: 'Siap diambil setelah QC',
    badge: 'Gratis Rp 0',
  },
  {
    id: 'MAXIM_COD',
    name: 'Maxim Instant Kurir COD',
    description: 'Ongkos kirim dibayar langsung ke driver Maxim saat pesanan tiba',
    price: 0,
    estimatedTime: '1 - 2 Jam setelah selesai sablon',
    badge: 'Bayar di Tempat',
  },
  {
    id: 'FLAT_RATE_MAKASSAR',
    name: 'Kurir Internal Kaos Kami',
    description: 'Tarif flat untuk Panakkukang, Rappocini, Tamalanrea, Biringkanaya, dll',
    price: 15000,
    estimatedTime: 'Same Day Delivery',
    badge: 'Flat Rp 15.000',
  },
];
