export interface DeliveryOption {
  id: 'WORKSHOP_PICKUP' | 'FREE_MAKASSAR' | 'EXPEDITION';
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  badge?: string;
}

export const MAKASSAR_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'WORKSHOP_PICKUP',
    name: 'Ambil di Workshop (Tallo)',
    description: 'Jl. Galangan Kapal Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Makassar',
    price: 0,
    estimatedTime: 'Siap diambil setelah QC',
    badge: 'Gratis Rp 0',
  },
  {
    id: 'FREE_MAKASSAR',
    name: 'Diantar Tim Kaos Kami — Gratis Makassar',
    description: 'Tim kami antar langsung ke alamatmu di Kota Makassar, gratis (1-2 hari setelah produksi)',
    price: 0,
    estimatedTime: '1 - 2 Hari setelah selesai sablon',
    badge: 'Gratis Rp 0',
  },
  {
    id: 'EXPEDITION',
    name: 'Ekspedisi Luar Kota (JNE / J&T)',
    description: 'Pilih kurir termurah sesuai kotamu. Ongkir final dihitung server.',
    price: 25000,
    estimatedTime: '2 - 4 Hari (tergantung kota)',
    badge: 'Mulai Rp 25.000',
  },
];
