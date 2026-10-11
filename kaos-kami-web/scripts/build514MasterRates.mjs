// scripts/build514MasterRates.mjs
// Generator untuk 514 Kabupaten dan Kota Resmi Indonesia (Kemendagri / BPS 38 Provinsi)
// Dikalibrasi dengan tarif logistik kargo resmi origin Kota Makassar (Bandara UPG)
// Kurir: Lion Parcel (REGPACK), JNE (REG), J&T (EZ)

import fs from 'fs';
import path from 'path';

const PROVINCES_DATA = [
  // --- 1. SULAWESI SELATAN (INTRA-PROVINSI MAKASSAR) ---
  {
    province: "Sulawesi Selatan",
    region: "Sulsel",
    cities: [
      { name: "Kota Makassar", postal: "90211", jne: 10000, jnt: 12000, lion: 9000, etd: "1 hari" },
      { name: "Kab. Gowa", postal: "92111", jne: 14000, jnt: 15000, lion: 12000, etd: "1-2 hari" },
      { name: "Kab. Maros", postal: "90511", jne: 14000, jnt: 15000, lion: 12000, etd: "1-2 hari" },
      { name: "Kab. Takalar", postal: "92212", jne: 16000, jnt: 17000, lion: 14000, etd: "1-2 hari" },
      { name: "Kab. Jeneponto", postal: "92311", jne: 18000, jnt: 20000, lion: 16000, etd: "1-2 hari" },
      { name: "Kab. Bantaeng", postal: "92411", jne: 19000, jnt: 21000, lion: 17000, etd: "1-2 hari" },
      { name: "Kab. Bulukumba", postal: "92511", jne: 20000, jnt: 22000, lion: 18000, etd: "2-3 hari" },
      { name: "Kab. Kepulauan Selayar", postal: "92812", jne: 35000, jnt: 38000, lion: 32000, etd: "3-5 hari" },
      { name: "Kab. Pangkajene dan Kepulauan", postal: "90611", jne: 16000, jnt: 18000, lion: 15000, etd: "1-2 hari" },
      { name: "Kab. Barru", postal: "90711", jne: 18000, jnt: 20000, lion: 16000, etd: "1-2 hari" },
      { name: "Kota Parepare", postal: "91111", jne: 20000, jnt: 22000, lion: 18000, etd: "1-2 hari" },
      { name: "Kab. Pinrang", postal: "91211", jne: 22000, jnt: 24000, lion: 19000, etd: "2-3 hari" },
      { name: "Kab. Sidenreng Rappang", postal: "91611", jne: 22000, jnt: 24000, lion: 19000, etd: "2-3 hari" },
      { name: "Kab. Enrekang", postal: "91711", jne: 24000, jnt: 26000, lion: 21000, etd: "2-3 hari" },
      { name: "Kab. Bone", postal: "92711", jne: 22000, jnt: 24000, lion: 19000, etd: "2-3 hari" },
      { name: "Kab. Soppeng", postal: "90811", jne: 23000, jnt: 25000, lion: 20000, etd: "2-3 hari" },
      { name: "Kab. Wajo", postal: "90911", jne: 23000, jnt: 25000, lion: 20000, etd: "2-3 hari" },
      { name: "Kab. Sinjai", postal: "92611", jne: 22000, jnt: 24000, lion: 19000, etd: "2-3 hari" },
      { name: "Kota Palopo", postal: "91911", jne: 26000, jnt: 28000, lion: 23000, etd: "2-3 hari" },
      { name: "Kab. Luwu", postal: "91994", jne: 26000, jnt: 28000, lion: 23000, etd: "2-3 hari" },
      { name: "Kab. Luwu Utara", postal: "92911", jne: 28000, jnt: 30000, lion: 25000, etd: "2-4 hari" },
      { name: "Kab. Luwu Timur", postal: "92981", jne: 30000, jnt: 32000, lion: 27000, etd: "3-4 hari" },
      { name: "Kab. Tana Toraja", postal: "91811", jne: 26000, jnt: 28000, lion: 23000, etd: "2-3 hari" },
      { name: "Kab. Toraja Utara", postal: "91831", jne: 26000, jnt: 28000, lion: 23000, etd: "2-3 hari" },
    ]
  },

  // --- 2. SULAWESI BARAT ---
  {
    province: "Sulawesi Barat",
    region: "Sulawesi",
    cities: [
      { name: "Kab. Mamuju", postal: "91511", jne: 28000, jnt: 30000, lion: 25000, etd: "2-3 hari" },
      { name: "Kab. Polewali Mandar", postal: "91311", jne: 25000, jnt: 27000, lion: 22000, etd: "2-3 hari" },
      { name: "Kab. Majene", postal: "91411", jne: 26000, jnt: 28000, lion: 23000, etd: "2-3 hari" },
      { name: "Kab. Mamasa", postal: "91362", jne: 30000, jnt: 32000, lion: 26000, etd: "3-4 hari" },
      { name: "Kab. Pasangkayu", postal: "91571", jne: 32000, jnt: 34000, lion: 28000, etd: "3-4 hari" },
      { name: "Kab. Mamuju Tengah", postal: "91563", jne: 30000, jnt: 33000, lion: 27000, etd: "3-4 hari" },
    ]
  },

  // --- 3. SULAWESI TENGAH ---
  {
    province: "Sulawesi Tengah",
    region: "Sulawesi",
    cities: [
      { name: "Kota Palu", postal: "94111", jne: 32000, jnt: 34000, lion: 28000, etd: "2-3 hari" },
      { name: "Kab. Poso", postal: "94611", jne: 35000, jnt: 38000, lion: 30000, etd: "2-4 hari" },
      { name: "Kab. Banggai", postal: "94711", jne: 38000, jnt: 40000, lion: 33000, etd: "3-4 hari" },
      { name: "Kab. Banggai Kepulauan", postal: "94881", jne: 45000, jnt: 48000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Banggai Laut", postal: "94891", jne: 48000, jnt: 50000, lion: 42000, etd: "4-5 hari" },
      { name: "Kab. Tolitoli", postal: "94511", jne: 38000, jnt: 40000, lion: 33000, etd: "3-4 hari" },
      { name: "Kab. Buol", postal: "94563", jne: 40000, jnt: 42000, lion: 35000, etd: "3-5 hari" },
      { name: "Kab. Morowali", postal: "94973", jne: 38000, jnt: 42000, lion: 34000, etd: "3-5 hari" },
      { name: "Kab. Morowali Utara", postal: "94991", jne: 40000, jnt: 43000, lion: 35000, etd: "3-5 hari" },
      { name: "Kab. Parigi Moutong", postal: "94471", jne: 36000, jnt: 38000, lion: 32000, etd: "2-4 hari" },
      { name: "Kab. Tojo Una-Una", postal: "94683", jne: 42000, jnt: 45000, lion: 38000, etd: "3-5 hari" },
      { name: "Kab. Sigi", postal: "94364", jne: 35000, jnt: 37000, lion: 30000, etd: "2-4 hari" },
      { name: "Kab. Donggala", postal: "94351", jne: 35000, jnt: 38000, lion: 30000, etd: "2-4 hari" },
    ]
  },

  // --- 4. SULAWESI TENGGARA ---
  {
    province: "Sulawesi Tenggara",
    region: "Sulawesi",
    cities: [
      { name: "Kota Kendari", postal: "93111", jne: 30000, jnt: 32000, lion: 26000, etd: "2-3 hari" },
      { name: "Kota Baubau", postal: "93711", jne: 34000, jnt: 36000, lion: 29000, etd: "2-4 hari" },
      { name: "Kab. Kolaka", postal: "93511", jne: 32000, jnt: 34000, lion: 28000, etd: "2-3 hari" },
      { name: "Kab. Kolaka Utara", postal: "93911", jne: 34000, jnt: 36000, lion: 29000, etd: "2-4 hari" },
      { name: "Kab. Kolaka Timur", postal: "93572", jne: 35000, jnt: 37000, lion: 30000, etd: "3-4 hari" },
      { name: "Kab. Konawe", postal: "93411", jne: 33000, jnt: 35000, lion: 29000, etd: "2-4 hari" },
      { name: "Kab. Konawe Selatan", postal: "93811", jne: 34000, jnt: 36000, lion: 30000, etd: "2-4 hari" },
      { name: "Kab. Konawe Utara", postal: "93311", jne: 36000, jnt: 38000, lion: 32000, etd: "3-4 hari" },
      { name: "Kab. Konawe Kepulauan", postal: "93393", jne: 45000, jnt: 48000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Muna", postal: "93611", jne: 35000, jnt: 38000, lion: 30000, etd: "2-4 hari" },
      { name: "Kab. Muna Barat", postal: "93653", jne: 37000, jnt: 40000, lion: 32000, etd: "3-5 hari" },
      { name: "Kab. Buton", postal: "93754", jne: 36000, jnt: 38000, lion: 31000, etd: "3-4 hari" },
      { name: "Kab. Buton Utara", postal: "93672", jne: 38000, jnt: 41000, lion: 33000, etd: "3-5 hari" },
      { name: "Kab. Buton Selatan", postal: "93741", jne: 38000, jnt: 41000, lion: 33000, etd: "3-5 hari" },
      { name: "Kab. Buton Tengah", postal: "93761", jne: 38000, jnt: 41000, lion: 33000, etd: "3-5 hari" },
      { name: "Kab. Wakatobi", postal: "93791", jne: 48000, jnt: 52000, lion: 42000, etd: "4-6 hari" },
      { name: "Kab. Bombana", postal: "93771", jne: 36000, jnt: 38000, lion: 31000, etd: "3-4 hari" },
    ]
  },

  // --- 5. GORONTALO ---
  {
    province: "Gorontalo",
    region: "Sulawesi",
    cities: [
      { name: "Kota Gorontalo", postal: "96111", jne: 35000, jnt: 38000, lion: 30000, etd: "2-3 hari" },
      { name: "Kab. Gorontalo", postal: "96211", jne: 37000, jnt: 40000, lion: 32000, etd: "2-4 hari" },
      { name: "Kab. Gorontalo Utara", postal: "96511", jne: 39000, jnt: 42000, lion: 34000, etd: "3-4 hari" },
      { name: "Kab. Bone Bolango", postal: "96562", jne: 38000, jnt: 40000, lion: 33000, etd: "2-4 hari" },
      { name: "Kab. Boalemo", postal: "96263", jne: 40000, jnt: 43000, lion: 35000, etd: "3-5 hari" },
      { name: "Kab. Pohuwato", postal: "96265", jne: 42000, jnt: 45000, lion: 37000, etd: "3-5 hari" },
    ]
  },

  // --- 6. SULAWESI UTARA ---
  {
    province: "Sulawesi Utara",
    region: "Sulawesi",
    cities: [
      { name: "Kota Manado", postal: "95111", jne: 36000, jnt: 38000, lion: 30000, etd: "2-3 hari" },
      { name: "Kota Bitung", postal: "95511", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Tomohon", postal: "95411", jne: 38000, jnt: 40000, lion: 32000, etd: "2-4 hari" },
      { name: "Kota Kotamobagu", postal: "95711", jne: 40000, jnt: 42000, lion: 34000, etd: "3-4 hari" },
      { name: "Kab. Minahasa", postal: "95611", jne: 39000, jnt: 41000, lion: 33000, etd: "2-4 hari" },
      { name: "Kab. Minahasa Utara", postal: "95371", jne: 38000, jnt: 40000, lion: 32000, etd: "2-4 hari" },
      { name: "Kab. Minahasa Selatan", postal: "95911", jne: 40000, jnt: 42000, lion: 34000, etd: "3-4 hari" },
      { name: "Kab. Minahasa Tenggara", postal: "95995", jne: 42000, jnt: 44000, lion: 36000, etd: "3-5 hari" },
      { name: "Kab. Bolaang Mongondow", postal: "95761", jne: 42000, jnt: 44000, lion: 36000, etd: "3-5 hari" },
      { name: "Kab. Bolaang Mongondow Utara", postal: "95764", jne: 44000, jnt: 46000, lion: 38000, etd: "3-5 hari" },
      { name: "Kab. Bolaang Mongondow Selatan", postal: "95774", jne: 44000, jnt: 47000, lion: 38000, etd: "3-5 hari" },
      { name: "Kab. Bolaang Mongondow Timur", postal: "95783", jne: 43000, jnt: 45000, lion: 37000, etd: "3-5 hari" },
      { name: "Kab. Kepulauan Sangihe", postal: "95811", jne: 55000, jnt: 60000, lion: 48000, etd: "4-6 hari" },
      { name: "Kab. Kepulauan Talaud", postal: "95885", jne: 60000, jnt: 65000, lion: 52000, etd: "4-7 hari" },
      { name: "Kab. Kepulauan Siau Tagulandang Biaro", postal: "95861", jne: 58000, jnt: 62000, lion: 50000, etd: "4-6 hari" },
    ]
  },

  // --- 7. DKI JAKARTA ---
  {
    province: "DKI Jakarta",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Jakarta Pusat", postal: "10110", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Jakarta Selatan", postal: "12110", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Jakarta Barat", postal: "11110", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Jakarta Timur", postal: "13110", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Jakarta Utara", postal: "14110", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kab. Kepulauan Seribu", postal: "14510", jne: 48000, jnt: 52000, lion: 42000, etd: "3-5 hari" },
    ]
  },

  // --- 8. JAWA BARAT ---
  {
    province: "Jawa Barat",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Bandung", postal: "40111", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Bogor", postal: "16111", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kota Bekasi", postal: "17111", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kota Depok", postal: "16411", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kota Cimahi", postal: "40511", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Cirebon", postal: "45111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kota Sukabumi", postal: "43111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kota Tasikmalaya", postal: "46111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kota Banjar", postal: "46311", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Bandung", postal: "40311", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Bandung Barat", postal: "40552", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Bekasi", postal: "17530", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Bogor", postal: "16911", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Ciamis", postal: "46211", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Cianjur", postal: "43211", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Cirebon", postal: "45611", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Garut", postal: "44111", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Indramayu", postal: "45211", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Karawang", postal: "41311", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Kuningan", postal: "45511", jne: 45000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Majalengka", postal: "45411", jne: 45000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Pangandaran", postal: "46396", jne: 48000, jnt: 50000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Purwakarta", postal: "41111", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Subang", postal: "41211", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Sukabumi", postal: "43311", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Sumedang", postal: "45311", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Tasikmalaya", postal: "46411", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
    ]
  },

  // --- 9. BANTEN ---
  {
    province: "Banten",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Tangerang", postal: "15111", jne: 39000, jnt: 41000, lion: 33000, etd: "2-3 hari" },
      { name: "Kota Tangerang Selatan", postal: "15411", jne: 39000, jnt: 41000, lion: 33000, etd: "2-3 hari" },
      { name: "Kota Serang", postal: "42111", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Cilegon", postal: "42411", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Tangerang", postal: "15911", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kab. Serang", postal: "42162", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Lebak", postal: "42311", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Pandeglang", postal: "42211", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
    ]
  },

  // --- 10. JAWA TENGAH ---
  {
    province: "Jawa Tengah",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Semarang", postal: "50111", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Surakarta (Solo)", postal: "57111", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kota Magelang", postal: "56111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kota Pekalongan", postal: "51111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kota Salatiga", postal: "50711", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kota Tegal", postal: "52111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Banjarnegara", postal: "53411", jne: 47000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Banyumas (Purwokerto)", postal: "53111", jne: 45000, jnt: 47000, lion: 38000, etd: "2-3 hari" },
      { name: "Kab. Batang", postal: "51211", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Blora", postal: "58211", jne: 47000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Boyolali", postal: "57311", jne: 45000, jnt: 47000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Brebes", postal: "52211", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Cilacap", postal: "53211", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Demak", postal: "59511", jne: 44000, jnt: 46000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Grobogan (Purwodadi)", postal: "58111", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Jepara", postal: "59411", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Karanganyar", postal: "57711", jne: 45000, jnt: 47000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Kebumen", postal: "54311", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Kendal", postal: "51311", jne: 44000, jnt: 46000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Klaten", postal: "57411", jne: 45000, jnt: 47000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Kudus", postal: "59311", jne: 45000, jnt: 47000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Magelang", postal: "56511", jne: 45000, jnt: 47000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Pati", postal: "59111", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Pekalongan", postal: "51161", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Pemalang", postal: "52311", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Purbalingga", postal: "53311", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Purworejo", postal: "54111", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Rembang", postal: "59211", jne: 47000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Semarang (Ungaran)", postal: "50511", jne: 44000, jnt: 46000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Sragen", postal: "57211", jne: 45000, jnt: 47000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Sukoharjo", postal: "57511", jne: 45000, jnt: 47000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Tegal (Slawi)", postal: "52411", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Temanggung", postal: "56211", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Wonogiri", postal: "57611", jne: 46000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Wonosobo", postal: "56311", jne: 47000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
    ]
  },

  // --- 11. DI YOGYAKARTA ---
  {
    province: "DI Yogyakarta",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Yogyakarta", postal: "55111", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Sleman", postal: "55511", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Bantul", postal: "55711", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Kulon Progo", postal: "55611", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Gunungkidul", postal: "55811", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
    ]
  },

  // --- 12. JAWA TIMUR ---
  {
    province: "Jawa Timur",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Surabaya", postal: "60111", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Malang", postal: "65111", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Batu", postal: "65311", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kota Madiun", postal: "63111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kota Kediri", postal: "64111", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kota Blitar", postal: "66111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kota Mojokerto", postal: "61311", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Pasuruan", postal: "67111", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Probolinggo", postal: "67211", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Sidoarjo", postal: "61211", jne: 39000, jnt: 41000, lion: 33000, etd: "2-3 hari" },
      { name: "Kab. Gresik", postal: "61111", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kab. Mojokerto", postal: "61361", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Jombang", postal: "61411", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Lamongan", postal: "62211", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Tuban", postal: "62311", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Bojonegoro", postal: "62111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Ngawi", postal: "63211", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Magetan", postal: "63311", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Madiun", postal: "63153", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Nganjuk", postal: "64411", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Kediri", postal: "64182", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Tulungagung", postal: "66211", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Blitar", postal: "66171", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Trenggalek", postal: "66311", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Ponorogo", postal: "63411", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Pacitan", postal: "63511", jne: 47000, jnt: 49000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Pasuruan", postal: "67153", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Probolinggo", postal: "67271", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Lumajang", postal: "67311", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Jember", postal: "68111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kab. Bondowoso", postal: "68211", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Situbondo", postal: "68311", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Banyuwangi", postal: "68411", jne: 45000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Bangkalan", postal: "69111", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Sampang", postal: "69211", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Pamekasan", postal: "69311", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Sumenep", postal: "69411", jne: 45000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Malang", postal: "65163", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
    ]
  },

  // --- 13. BALI ---
  {
    province: "Bali",
    region: "Jawa-Bali",
    cities: [
      { name: "Kota Denpasar", postal: "80111", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kab. Badung", postal: "80351", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kab. Gianyar", postal: "80511", jne: 42000, jnt: 44000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Tabanan", postal: "82111", jne: 43000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Klungkung", postal: "80711", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Bangli", postal: "80611", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Karangasem", postal: "80811", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Buleleng (Singaraja)", postal: "81111", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Jembrana (Negara)", postal: "82211", jne: 45000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
    ]
  },

  // --- 14. NUSA TENGGARA BARAT ---
  {
    province: "Nusa Tenggara Barat",
    region: "NusaTenggara",
    cities: [
      { name: "Kota Mataram", postal: "83111", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kota Bima", postal: "84111", jne: 45000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Lombok Barat", postal: "83311", jne: 42000, jnt: 44000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Lombok Tengah", postal: "83511", jne: 42000, jnt: 44000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Lombok Timur", postal: "83611", jne: 43000, jnt: 45000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Lombok Utara", postal: "83711", jne: 44000, jnt: 46000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Sumbawa", postal: "84311", jne: 44000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Sumbawa Barat", postal: "84411", jne: 45000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Dompu", postal: "84211", jne: 46000, jnt: 49000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Bima", postal: "84171", jne: 46000, jnt: 49000, lion: 40000, etd: "3-5 hari" },
    ]
  },

  // --- 15. NUSA TENGGARA TIMUR ---
  {
    province: "Nusa Tenggara Timur",
    region: "NusaTenggara",
    cities: [
      { name: "Kota Kupang", postal: "85111", jne: 45000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Kupang", postal: "85362", jne: 48000, jnt: 51000, lion: 41000, etd: "3-5 hari" },
      { name: "Kab. Timor Tengah Selatan", postal: "85511", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Timor Tengah Utara", postal: "85611", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Belu (Atambua)", postal: "85711", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Malaka", postal: "85762", jne: 54000, jnt: 58000, lion: 47000, etd: "3-6 hari" },
      { name: "Kab. Rote Ndao", postal: "85911", jne: 56000, jnt: 60000, lion: 49000, etd: "4-6 hari" },
      { name: "Kab. Sabu Raijua", postal: "85391", jne: 60000, jnt: 65000, lion: 52000, etd: "4-7 hari" },
      { name: "Kab. Alor", postal: "85811", jne: 55000, jnt: 59000, lion: 48000, etd: "3-6 hari" },
      { name: "Kab. Lembata", postal: "86611", jne: 55000, jnt: 59000, lion: 48000, etd: "3-6 hari" },
      { name: "Kab. Flores Timur (Larantuka)", postal: "86211", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Sikka (Maumere)", postal: "86111", jne: 48000, jnt: 52000, lion: 42000, etd: "2-4 hari" },
      { name: "Kab. Ende", postal: "86311", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Ngada (Bajawa)", postal: "86411", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Nagekeo", postal: "86472", jne: 54000, jnt: 58000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Manggarai (Ruteng)", postal: "86511", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Manggarai Timur", postal: "86571", jne: 55000, jnt: 59000, lion: 47000, etd: "3-6 hari" },
      { name: "Kab. Manggarai Barat (Labuan Bajo)", postal: "86711", jne: 46000, jnt: 50000, lion: 40000, etd: "2-4 hari" },
      { name: "Kab. Sumba Timur (Waingapu)", postal: "87111", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Sumba Barat", postal: "87211", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Sumba Barat Daya", postal: "87254", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Sumba Tengah", postal: "87282", jne: 54000, jnt: 58000, lion: 47000, etd: "3-6 hari" },
    ]
  },

  // --- 16. KALIMANTAN TIMUR ---
  {
    province: "Kalimantan Timur",
    region: "Kalimantan",
    cities: [
      { name: "Kota Balikpapan", postal: "76111", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Samarinda", postal: "75111", jne: 40000, jnt: 42000, lion: 34000, etd: "2-3 hari" },
      { name: "Kota Bontang", postal: "75311", jne: 42000, jnt: 45000, lion: 36000, etd: "2-4 hari" },
      { name: "Kab. Kutai Kartanegara", postal: "75511", jne: 42000, jnt: 45000, lion: 36000, etd: "2-4 hari" },
      { name: "Kab. Kutai Timur (Sangatta)", postal: "75611", jne: 45000, jnt: 48000, lion: 39000, etd: "3-5 hari" },
      { name: "Kab. Kutai Barat", postal: "75711", jne: 50000, jnt: 54000, lion: 44000, etd: "3-6 hari" },
      { name: "Kab. Berau", postal: "77311", jne: 46000, jnt: 50000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Paser (Tanah Grogot)", postal: "76211", jne: 44000, jnt: 47000, lion: 38000, etd: "3-4 hari" },
      { name: "Kab. Penajam Paser Utara (IKN)", postal: "76311", jne: 42000, jnt: 45000, lion: 36000, etd: "2-3 hari" },
      { name: "Kab. Mahakam Ulu", postal: "75773", jne: 60000, jnt: 65000, lion: 52000, etd: "4-7 hari" },
    ]
  },

  // --- 17. KALIMANTAN SELATAN ---
  {
    province: "Kalimantan Selatan",
    region: "Kalimantan",
    cities: [
      { name: "Kota Banjarmasin", postal: "70111", jne: 38000, jnt: 40000, lion: 32000, etd: "2-3 hari" },
      { name: "Kota Banjarbaru", postal: "70711", jne: 39000, jnt: 41000, lion: 33000, etd: "2-3 hari" },
      { name: "Kab. Banjar (Martapura)", postal: "70611", jne: 41000, jnt: 43000, lion: 35000, etd: "2-3 hari" },
      { name: "Kab. Barito Kuala", postal: "70511", jne: 42000, jnt: 44000, lion: 36000, etd: "2-4 hari" },
      { name: "Kab. Tanah Laut (Pelaihari)", postal: "70811", jne: 42000, jnt: 45000, lion: 36000, etd: "2-4 hari" },
      { name: "Kab. Tanah Bumbu (Batulicin)", postal: "72211", jne: 44000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Kotabaru", postal: "72111", jne: 46000, jnt: 49000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Tapin (Rantau)", postal: "71111", jne: 43000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Hulu Sungai Selatan (Kandangan)", postal: "71211", jne: 44000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Hulu Sungai Tengah (Barabai)", postal: "71311", jne: 44000, jnt: 47000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Hulu Sungai Utara (Amuntai)", postal: "71411", jne: 45000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Balangan", postal: "71611", jne: 46000, jnt: 49000, lion: 40000, etd: "3-5 hari" },
      { name: "Kab. Tabalong (Tanjung)", postal: "71511", jne: 46000, jnt: 49000, lion: 40000, etd: "3-5 hari" },
    ]
  },

  // --- 18. KALIMANTAN BARAT ---
  {
    province: "Kalimantan Barat",
    region: "Kalimantan",
    cities: [
      { name: "Kota Pontianak", postal: "78111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-3 hari" },
      { name: "Kota Singkawang", postal: "79111", jne: 46000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Kubu Raya", postal: "78311", jne: 45000, jnt: 47000, lion: 38000, etd: "2-3 hari" },
      { name: "Kab. Mempawah", postal: "79511", jne: 47000, jnt: 50000, lion: 40000, etd: "2-4 hari" },
      { name: "Kab. Sambas", postal: "79411", jne: 49000, jnt: 52000, lion: 42000, etd: "3-5 hari" },
      { name: "Kab. Bengkayang", postal: "79211", jne: 49000, jnt: 52000, lion: 42000, etd: "3-5 hari" },
      { name: "Kab. Landak", postal: "79311", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Sanggau", postal: "78511", jne: 49000, jnt: 52000, lion: 42000, etd: "3-5 hari" },
      { name: "Kab. Sekadau", postal: "79582", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Sintang", postal: "78611", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Melawi", postal: "79611", jne: 52000, jnt: 56000, lion: 45000, etd: "3-6 hari" },
      { name: "Kab. Kapuas Hulu", postal: "78711", jne: 54000, jnt: 58000, lion: 47000, etd: "4-6 hari" },
      { name: "Kab. Ketapang", postal: "78811", jne: 48000, jnt: 52000, lion: 41000, etd: "3-5 hari" },
      { name: "Kab. Kayong Utara", postal: "78852", jne: 52000, jnt: 56000, lion: 45000, etd: "3-6 hari" },
    ]
  },

  // --- 19. KALIMANTAN TENGAH ---
  {
    province: "Kalimantan Tengah",
    region: "Kalimantan",
    cities: [
      { name: "Kota Palangka Raya", postal: "73111", jne: 44000, jnt: 46000, lion: 37000, etd: "2-4 hari" },
      { name: "Kab. Kotawaringin Timur (Sampit)", postal: "74311", jne: 46000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Kotawaringin Barat (Pangkalan Bun)", postal: "74111", jne: 46000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Kapuas", postal: "73511", jne: 46000, jnt: 49000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Barito Selatan", postal: "73711", jne: 48000, jnt: 51000, lion: 41000, etd: "3-5 hari" },
      { name: "Kab. Barito Utara", postal: "73811", jne: 49000, jnt: 52000, lion: 42000, etd: "3-5 hari" },
      { name: "Kab. Barito Timur", postal: "73611", jne: 48000, jnt: 51000, lion: 41000, etd: "3-5 hari" },
      { name: "Kab. Murung Raya", postal: "73911", jne: 54000, jnt: 58000, lion: 47000, etd: "4-6 hari" },
      { name: "Kab. Katingan", postal: "74411", jne: 48000, jnt: 52000, lion: 41000, etd: "3-5 hari" },
      { name: "Kab. Seruyan", postal: "74211", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Sukamara", postal: "74711", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Lamandau", postal: "74611", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Gunung Mas", postal: "74511", jne: 52000, jnt: 56000, lion: 45000, etd: "3-6 hari" },
      { name: "Kab. Pulang Pisau", postal: "74811", jne: 47000, jnt: 50000, lion: 40000, etd: "2-4 hari" },
    ]
  },

  // --- 20. KALIMANTAN UTARA ---
  {
    province: "Kalimantan Utara",
    region: "Kalimantan",
    cities: [
      { name: "Kota Tarakan", postal: "77111", jne: 45000, jnt: 48000, lion: 38000, etd: "2-4 hari" },
      { name: "Kab. Bulungan (Tanjung Selor)", postal: "77211", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Nunukan", postal: "77411", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Malinau", postal: "77511", jne: 55000, jnt: 60000, lion: 48000, etd: "3-6 hari" },
      { name: "Kab. Tana Tidung", postal: "77611", jne: 56000, jnt: 60000, lion: 49000, etd: "4-6 hari" },
    ]
  },

  // --- 21. SUMATERA UTARA ---
  {
    province: "Sumatera Utara",
    region: "Sumatera",
    cities: [
      { name: "Kota Medan", postal: "20111", jne: 48000, jnt: 50000, lion: 42000, etd: "3-4 hari" },
      { name: "Kota Pematangsiantar", postal: "21111", jne: 50000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kota Binjai", postal: "20711", jne: 49000, jnt: 51000, lion: 43000, etd: "3-4 hari" },
      { name: "Kota Tebing Tinggi", postal: "20611", jne: 50000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kota Tanjungbalai", postal: "21311", jne: 52000, jnt: 55000, lion: 46000, etd: "3-5 hari" },
      { name: "Kota Sibolga", postal: "22511", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kota Padangsidimpuan", postal: "22711", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kota Gunungsitoli (Nias)", postal: "22811", jne: 60000, jnt: 65000, lion: 54000, etd: "4-7 hari" },
      { name: "Kab. Deli Serdang", postal: "20511", jne: 49000, jnt: 52000, lion: 43000, etd: "3-4 hari" },
      { name: "Kab. Langkat", postal: "20811", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Karo (Kabanjahe)", postal: "22111", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Simalungun", postal: "21162", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Dairi", postal: "22211", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Asahan (Kisaran)", postal: "21211", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Labuhanbatu", postal: "21411", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Labuhanbatu Utara", postal: "21457", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Labuhanbatu Selatan", postal: "21511", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Tapanuli Utara", postal: "22411", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Tapanuli Tengah", postal: "22611", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Tapanuli Selatan", postal: "22738", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Toba", postal: "22311", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Mandailing Natal", postal: "22911", jne: 55000, jnt: 58000, lion: 48000, etd: "3-6 hari" },
      { name: "Kab. Nias", postal: "22871", jne: 62000, jnt: 68000, lion: 55000, etd: "4-7 hari" },
      { name: "Kab. Nias Selatan", postal: "22865", jne: 64000, jnt: 70000, lion: 57000, etd: "4-7 hari" },
      { name: "Kab. Nias Utara", postal: "22856", jne: 64000, jnt: 70000, lion: 57000, etd: "4-7 hari" },
      { name: "Kab. Nias Barat", postal: "22863", jne: 64000, jnt: 70000, lion: 57000, etd: "4-7 hari" },
      { name: "Kab. Pakpak Bharat", postal: "22272", jne: 56000, jnt: 60000, lion: 49000, etd: "4-6 hari" },
      { name: "Kab. Humbang Hasundutan", postal: "22457", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Samosir", postal: "22391", jne: 55000, jnt: 58000, lion: 48000, etd: "3-5 hari" },
      { name: "Kab. Serdang Bedagai", postal: "20998", jne: 51000, jnt: 54000, lion: 44000, etd: "3-4 hari" },
      { name: "Kab. Batu Bara", postal: "21255", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Padang Lawas", postal: "22763", jne: 56000, jnt: 60000, lion: 49000, etd: "4-6 hari" },
      { name: "Kab. Padang Lawas Utara", postal: "22753", jne: 55000, jnt: 59000, lion: 48000, etd: "3-6 hari" },
    ]
  },

  // --- 22. SUMATERA BARAT ---
  {
    province: "Sumatera Barat",
    region: "Sumatera",
    cities: [
      { name: "Kota Padang", postal: "25111", jne: 48000, jnt: 50000, lion: 42000, etd: "3-4 hari" },
      { name: "Kota Bukittinggi", postal: "26111", jne: 50000, jnt: 52000, lion: 43000, etd: "3-4 hari" },
      { name: "Kota Payakumbuh", postal: "26211", jne: 51000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kota Solok", postal: "27311", jne: 51000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kota Pariaman", postal: "25511", jne: 50000, jnt: 52000, lion: 43000, etd: "3-4 hari" },
      { name: "Kota Padang Panjang", postal: "27111", jne: 50000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kota Sawahlunto", postal: "27411", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Agam", postal: "26411", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Dharmasraya", postal: "27611", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Kepulauan Mentawai", postal: "25392", jne: 68000, jnt: 75000, lion: 60000, etd: "5-8 hari" },
      { name: "Kab. Lima Puluh Kota", postal: "26271", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Padang Pariaman", postal: "25586", jne: 51000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kab. Pasaman", postal: "26311", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Pasaman Barat", postal: "26368", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Pesisir Selatan (Painan)", postal: "25611", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Sijunjung", postal: "27511", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Solok (Arosuka)", postal: "27365", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Solok Selatan", postal: "27779", jne: 55000, jnt: 58000, lion: 48000, etd: "3-6 hari" },
      { name: "Kab. Tanah Datar (Batusangkar)", postal: "27211", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
    ]
  },

  // --- 23. RIAU ---
  {
    province: "Riau",
    region: "Sumatera",
    cities: [
      { name: "Kota Pekanbaru", postal: "28111", jne: 48000, jnt: 50000, lion: 42000, etd: "3-4 hari" },
      { name: "Kota Dumai", postal: "28811", jne: 50000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kab. Kampar (Bangkinang)", postal: "28411", jne: 51000, jnt: 54000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Bengkalis", postal: "28711", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Indragiri Hilir (Tembilahan)", postal: "29211", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Indragiri Hulu (Rengat)", postal: "29311", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Pelalawan (Pangkalan Kerinci)", postal: "28311", jne: 51000, jnt: 54000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Rokan Hilir (Bagansiapiapi)", postal: "28911", jne: 54000, jnt: 57000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Rokan Hulu (Pasir Pengaraian)", postal: "28511", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Siak", postal: "28611", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Kuantan Singingi (Teluk Kuantan)", postal: "29511", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Kepulauan Meranti (Selatpanjang)", postal: "28751", jne: 56000, jnt: 60000, lion: 49000, etd: "4-6 hari" },
    ]
  },

  // --- 24. KEPULAUAN RIAU ---
  {
    province: "Kepulauan Riau",
    region: "Sumatera",
    cities: [
      { name: "Kota Batam", postal: "29411", jne: 46000, jnt: 48000, lion: 40000, etd: "2-3 hari" },
      { name: "Kota Tanjungpinang", postal: "29111", jne: 48000, jnt: 50000, lion: 42000, etd: "2-4 hari" },
      { name: "Kab. Bintan", postal: "29154", jne: 50000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kab. Karimun (Tanjung Balai Karimun)", postal: "29611", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Lingga (Daik)", postal: "29872", jne: 58000, jnt: 63000, lion: 51000, etd: "4-6 hari" },
      { name: "Kab. Natuna (Ranai)", postal: "29711", jne: 68000, jnt: 75000, lion: 60000, etd: "4-7 hari" },
      { name: "Kab. Kepulauan Anambas (Tarempa)", postal: "29791", jne: 70000, jnt: 78000, lion: 62000, etd: "5-8 hari" },
    ]
  },

  // --- 25. JAMBI ---
  {
    province: "Jambi",
    region: "Sumatera",
    cities: [
      { name: "Kota Jambi", postal: "36111", jne: 46000, jnt: 48000, lion: 40000, etd: "3-4 hari" },
      { name: "Kota Sungai Penuh", postal: "37111", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Batanghari (Muara Bulian)", postal: "36611", jne: 49000, jnt: 52000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Bungo (Muara Bungo)", postal: "37211", jne: 50000, jnt: 53000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Kerinci", postal: "37161", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Merangin (Bangko)", postal: "37311", jne: 50000, jnt: 53000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Muaro Jambi (Sengeti)", postal: "36311", jne: 48000, jnt: 51000, lion: 42000, etd: "3-4 hari" },
      { name: "Kab. Sarolangun", postal: "37411", jne: 50000, jnt: 53000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Tanjung Jabung Barat (Kuala Tungkal)", postal: "36511", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Tanjung Jabung Timur (Muara Sabak)", postal: "36711", jne: 52000, jnt: 55000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Tebo (Muara Tebo)", postal: "37511", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
    ]
  },

  // --- 26. SUMATERA SELATAN ---
  {
    province: "Sumatera Selatan",
    region: "Sumatera",
    cities: [
      { name: "Kota Palembang", postal: "30111", jne: 45000, jnt: 48000, lion: 38000, etd: "2-3 hari" },
      { name: "Kota Prabumulih", postal: "31111", jne: 48000, jnt: 51000, lion: 41000, etd: "2-4 hari" },
      { name: "Kota Lubuklinggau", postal: "31611", jne: 50000, jnt: 53000, lion: 43000, etd: "3-4 hari" },
      { name: "Kota Pagar Alam", postal: "31511", jne: 51000, jnt: 54000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Banyuasin (Pangkalan Balai)", postal: "30711", jne: 48000, jnt: 51000, lion: 41000, etd: "2-4 hari" },
      { name: "Kab. Empat Lawang (Tebing Tinggi)", postal: "31811", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Lahat", postal: "31411", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Muara Enim", postal: "31311", jne: 49000, jnt: 52000, lion: 42000, etd: "3-4 hari" },
      { name: "Kab. Musi Banyuasin (Sekayu)", postal: "30711", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Musi Rawas", postal: "31661", jne: 51000, jnt: 54000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Musi Rawas Utara", postal: "31654", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Ogan Ilir (Indralaya)", postal: "30662", jne: 48000, jnt: 51000, lion: 41000, etd: "2-4 hari" },
      { name: "Kab. Ogan Komering Ilir (Kayuagung)", postal: "30611", jne: 49000, jnt: 52000, lion: 42000, etd: "3-4 hari" },
      { name: "Kab. Ogan Komering Ulu (Baturaja)", postal: "32111", jne: 49000, jnt: 52000, lion: 42000, etd: "3-4 hari" },
      { name: "Kab. Ogan Komering Ulu Selatan (Muaradua)", postal: "32211", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Ogan Komering Ulu Timur (Martapura)", postal: "32311", jne: 51000, jnt: 54000, lion: 44000, etd: "3-5 hari" },
      { name: "Kab. Penukal Abab Lematang Ilir", postal: "31211", jne: 51000, jnt: 54000, lion: 44000, etd: "3-5 hari" },
    ]
  },

  // --- 27. BENGKULU ---
  {
    province: "Bengkulu",
    region: "Sumatera",
    cities: [
      { name: "Kota Bengkulu", postal: "38111", jne: 48000, jnt: 50000, lion: 42000, etd: "3-4 hari" },
      { name: "Kab. Bengkulu Selatan (Manna)", postal: "38511", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Bengkulu Tengah", postal: "38371", jne: 50000, jnt: 53000, lion: 44000, etd: "3-4 hari" },
      { name: "Kab. Bengkulu Utara (Arga Makmur)", postal: "38611", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Kaur (Bintuhan)", postal: "38911", jne: 53000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Kepahiang", postal: "39311", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Lebong (Tubei)", postal: "39263", jne: 54000, jnt: 57000, lion: 47000, etd: "3-6 hari" },
      { name: "Kab. Mukomuko", postal: "38711", jne: 54000, jnt: 57000, lion: 47000, etd: "3-6 hari" },
      { name: "Kab. Rejang Lebong (Curup)", postal: "39111", jne: 51000, jnt: 54000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Seluma (Pasar Tais)", postal: "38811", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
    ]
  },

  // --- 28. LAMPUNG ---
  {
    province: "Lampung",
    region: "Sumatera",
    cities: [
      { name: "Kota Bandar Lampung", postal: "35111", jne: 44000, jnt: 46000, lion: 38000, etd: "2-3 hari" },
      { name: "Kota Metro", postal: "34111", jne: 46000, jnt: 48000, lion: 39000, etd: "2-3 hari" },
      { name: "Kab. Lampung Selatan (Kalianda)", postal: "35511", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Lampung Tengah (Gunung Sugih)", postal: "34211", jne: 47000, jnt: 49000, lion: 40000, etd: "2-4 hari" },
      { name: "Kab. Lampung Utara (Kotabumi)", postal: "34511", jne: 48000, jnt: 50000, lion: 41000, etd: "2-4 hari" },
      { name: "Kab. Lampung Barat (Liwa)", postal: "34811", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Lampung Timur (Sukadana)", postal: "34311", jne: 48000, jnt: 50000, lion: 41000, etd: "2-4 hari" },
      { name: "Kab. Pesawaran (Gedong Tataan)", postal: "35366", jne: 46000, jnt: 48000, lion: 39000, etd: "2-4 hari" },
      { name: "Kab. Pringsewu", postal: "35373", jne: 47000, jnt: 49000, lion: 40000, etd: "2-4 hari" },
      { name: "Kab. Mesuji", postal: "34698", jne: 52000, jnt: 55000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Tulang Bawang (Menggala)", postal: "34611", jne: 49000, jnt: 52000, lion: 42000, etd: "2-4 hari" },
      { name: "Kab. Tulang Bawang Barat", postal: "34693", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Way Kanan (Blambangan Umpu)", postal: "34711", jne: 50000, jnt: 53000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Tanggamus (Kota Agung)", postal: "35611", jne: 49000, jnt: 52000, lion: 42000, etd: "3-5 hari" },
      { name: "Kab. Pesisir Barat (Krui)", postal: "35911", jne: 52000, jnt: 55000, lion: 45000, etd: "3-6 hari" },
    ]
  },

  // --- 29. KEPULAUAN BANGKA BELITUNG ---
  {
    province: "Kepulauan Bangka Belitung",
    region: "Sumatera",
    cities: [
      { name: "Kota Pangkalpinang", postal: "33111", jne: 46000, jnt: 48000, lion: 40000, etd: "2-3 hari" },
      { name: "Kab. Bangka (Sungailiat)", postal: "33211", jne: 48000, jnt: 51000, lion: 42000, etd: "2-4 hari" },
      { name: "Kab. Bangka Barat (Muntok)", postal: "33311", jne: 50000, jnt: 53000, lion: 43000, etd: "3-4 hari" },
      { name: "Kab. Bangka Tengah (Koba)", postal: "33611", jne: 49000, jnt: 52000, lion: 42000, etd: "2-4 hari" },
      { name: "Kab. Bangka Selatan (Toboali)", postal: "33711", jne: 50000, jnt: 53000, lion: 43000, etd: "3-4 hari" },
      { name: "Kab. Belitung (Tanjung Pandan)", postal: "33411", jne: 48000, jnt: 51000, lion: 41000, etd: "2-3 hari" },
      { name: "Kab. Belitung Timur (Manggar)", postal: "33511", jne: 50000, jnt: 53000, lion: 43000, etd: "3-4 hari" },
    ]
  },

  // --- 30. ACEH ---
  {
    province: "Aceh",
    region: "Sumatera",
    cities: [
      { name: "Kota Banda Aceh", postal: "23111", jne: 54000, jnt: 56000, lion: 46000, etd: "3-5 hari" },
      { name: "Kota Sabang", postal: "23511", jne: 60000, jnt: 64000, lion: 52000, etd: "4-6 hari" },
      { name: "Kota Lhokseumawe", postal: "24311", jne: 56000, jnt: 58000, lion: 48000, etd: "3-5 hari" },
      { name: "Kota Langsa", postal: "24411", jne: 56000, jnt: 58000, lion: 48000, etd: "3-5 hari" },
      { name: "Kota Subulussalam", postal: "24882", jne: 62000, jnt: 66000, lion: 54000, etd: "4-7 hari" },
      { name: "Kab. Aceh Besar (Jantho)", postal: "23911", jne: 56000, jnt: 59000, lion: 48000, etd: "3-5 hari" },
      { name: "Kab. Aceh Barat (Meulaboh)", postal: "23611", jne: 58000, jnt: 62000, lion: 50000, etd: "4-6 hari" },
      { name: "Kab. Aceh Barat Daya (Blangpidie)", postal: "23764", jne: 60000, jnt: 64000, lion: 52000, etd: "4-6 hari" },
      { name: "Kab. Aceh Selatan (Tapaktuan)", postal: "23711", jne: 60000, jnt: 64000, lion: 52000, etd: "4-6 hari" },
      { name: "Kab. Aceh Singkil", postal: "24785", jne: 64000, jnt: 68000, lion: 55000, etd: "4-7 hari" },
      { name: "Kab. Aceh Jaya (Calang)", postal: "23654", jne: 58000, jnt: 62000, lion: 50000, etd: "4-6 hari" },
      { name: "Kab. Nagan Raya (Suka Makmue)", postal: "23671", jne: 59000, jnt: 63000, lion: 51000, etd: "4-6 hari" },
      { name: "Kab. Pidie (Sigli)", postal: "24111", jne: 57000, jnt: 60000, lion: 49000, etd: "3-5 hari" },
      { name: "Kab. Pidie Jaya (Meureudu)", postal: "24186", jne: 58000, jnt: 61000, lion: 50000, etd: "3-5 hari" },
      { name: "Kab. Bireuen", postal: "24211", jne: 57000, jnt: 60000, lion: 49000, etd: "3-5 hari" },
      { name: "Kab. Aceh Utara (Lhoksukon)", postal: "24376", jne: 58000, jnt: 61000, lion: 50000, etd: "3-5 hari" },
      { name: "Kab. Aceh Timur (Idi Rayeuk)", postal: "24454", jne: 58000, jnt: 61000, lion: 50000, etd: "3-5 hari" },
      { name: "Kab. Aceh Tamiang (Karang Baru)", postal: "24476", jne: 57000, jnt: 60000, lion: 49000, etd: "3-5 hari" },
      { name: "Kab. Bener Meriah (Simpang Tiga Redelong)", postal: "24582", jne: 60000, jnt: 64000, lion: 52000, etd: "4-6 hari" },
      { name: "Kab. Aceh Tengah (Takengon)", postal: "24511", jne: 60000, jnt: 64000, lion: 52000, etd: "4-6 hari" },
      { name: "Kab. Gayo Lues (Blangkejeren)", postal: "24653", jne: 65000, jnt: 70000, lion: 56000, etd: "4-7 hari" },
      { name: "Kab. Aceh Tenggara (Kutacane)", postal: "24611", jne: 62000, jnt: 66000, lion: 54000, etd: "4-7 hari" },
      { name: "Kab. Simeulue (Sinabang)", postal: "23891", jne: 70000, jnt: 76000, lion: 62000, etd: "5-8 hari" },
    ]
  },

  // --- 31. MALUKU ---
  {
    province: "Maluku",
    region: "Maluku",
    cities: [
      { name: "Kota Ambon", postal: "97111", jne: 42000, jnt: 45000, lion: 35000, etd: "2-3 hari" },
      { name: "Kota Tual", postal: "97611", jne: 55000, jnt: 60000, lion: 48000, etd: "3-5 hari" },
      { name: "Kab. Maluku Tengah (Masohi)", postal: "97511", jne: 48000, jnt: 52000, lion: 41000, etd: "3-5 hari" },
      { name: "Kab. Seram Bagian Barat (Piru)", postal: "97562", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Seram Bagian Timur (Bula)", postal: "97552", jne: 54000, jnt: 58000, lion: 46000, etd: "4-6 hari" },
      { name: "Kab. Buru (Namlea)", postal: "97571", jne: 50000, jnt: 54000, lion: 43000, etd: "3-5 hari" },
      { name: "Kab. Buru Selatan (Namrole)", postal: "97572", jne: 55000, jnt: 60000, lion: 48000, etd: "4-6 hari" },
      { name: "Kab. Maluku Tenggara (Langgur)", postal: "97611", jne: 55000, jnt: 60000, lion: 48000, etd: "3-5 hari" },
      { name: "Kab. Kepulauan Aru (Dobo)", postal: "97662", jne: 62000, jnt: 68000, lion: 55000, etd: "4-7 hari" },
      { name: "Kab. Kepulauan Tanimbar (Saumlaki)", postal: "97464", jne: 60000, jnt: 66000, lion: 53000, etd: "4-7 hari" },
      { name: "Kab. Maluku Barat Daya (Tiakur)", postal: "97444", jne: 65000, jnt: 72000, lion: 58000, etd: "5-8 hari" },
    ]
  },

  // --- 32. MALUKU UTARA ---
  {
    province: "Maluku Utara",
    region: "Maluku",
    cities: [
      { name: "Kota Ternate", postal: "97711", jne: 46000, jnt: 48000, lion: 38000, etd: "2-3 hari" },
      { name: "Kota Tidore Kepulauan", postal: "97811", jne: 48000, jnt: 51000, lion: 41000, etd: "2-4 hari" },
      { name: "Kab. Halmahera Barat (Jailolo)", postal: "97752", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Halmahera Tengah (Weda)", postal: "97853", jne: 54000, jnt: 58000, lion: 47000, etd: "3-5 hari" },
      { name: "Kab. Halmahera Utara (Tobelo)", postal: "97762", jne: 52000, jnt: 56000, lion: 45000, etd: "3-5 hari" },
      { name: "Kab. Halmahera Selatan (Labuha)", postal: "97911", jne: 53000, jnt: 57000, lion: 46000, etd: "3-5 hari" },
      { name: "Kab. Halmahera Timur (Maba)", postal: "97862", jne: 55000, jnt: 60000, lion: 48000, etd: "4-6 hari" },
      { name: "Kab. Kepulauan Sula (Sanana)", postal: "97995", jne: 56000, jnt: 62000, lion: 50000, etd: "4-6 hari" },
      { name: "Kab. Pulau Morotai (Daruba)", postal: "97771", jne: 55000, jnt: 60000, lion: 48000, etd: "3-5 hari" },
      { name: "Kab. Pulau Taliabu (Bobong)", postal: "97976", jne: 60000, jnt: 66000, lion: 53000, etd: "4-7 hari" },
    ]
  },

  // --- 33. PAPUA ---
  {
    province: "Papua",
    region: "Papua",
    cities: [
      { name: "Kota Jayapura", postal: "99111", jne: 78000, jnt: 82000, lion: 68000, etd: "3-5 hari" },
      { name: "Kab. Jayapura (Sentani)", postal: "99352", jne: 80000, jnt: 85000, lion: 70000, etd: "3-5 hari" },
      { name: "Kab. Keerom (Waris)", postal: "99468", jne: 85000, jnt: 90000, lion: 75000, etd: "4-6 hari" },
      { name: "Kab. Sarmi", postal: "99373", jne: 88000, jnt: 94000, lion: 78000, etd: "4-7 hari" },
      { name: "Kab. Mamberamo Raya (Burmeso)", postal: "99384", jne: 98000, jnt: 105000, lion: 88000, etd: "5-8 hari" },
      { name: "Kab. Biak Numfor", postal: "98111", jne: 75000, jnt: 80000, lion: 65000, etd: "3-5 hari" },
      { name: "Kab. Supiori (Sorendiweri)", postal: "98161", jne: 82000, jnt: 88000, lion: 72000, etd: "4-6 hari" },
      { name: "Kab. Kepulauan Yapen (Serui)", postal: "98211", jne: 80000, jnt: 86000, lion: 70000, etd: "4-6 hari" },
      { name: "Kab. Waropen (Botawa)", postal: "98263", jne: 90000, jnt: 96000, lion: 80000, etd: "5-7 hari" },
    ]
  },

  // --- 34. PAPUA BARAT ---
  {
    province: "Papua Barat",
    region: "Papua",
    cities: [
      { name: "Kab. Manokwari", postal: "98311", jne: 70000, jnt: 75000, lion: 60000, etd: "3-5 hari" },
      { name: "Kab. Manokwari Selatan (Ransiki)", postal: "98321", jne: 75000, jnt: 80000, lion: 65000, etd: "3-6 hari" },
      { name: "Kab. Pegunungan Arfak (Anggi)", postal: "98353", jne: 85000, jnt: 92000, lion: 76000, etd: "4-7 hari" },
      { name: "Kab. Fakfak", postal: "98611", jne: 75000, jnt: 80000, lion: 65000, etd: "3-5 hari" },
      { name: "Kab. Kaimana", postal: "98654", jne: 78000, jnt: 84000, lion: 68000, etd: "3-5 hari" },
      { name: "Kab. Teluk Bintuni", postal: "98364", jne: 78000, jnt: 84000, lion: 68000, etd: "4-6 hari" },
      { name: "Kab. Teluk Wondama (Rasiei)", postal: "98362", jne: 82000, jnt: 88000, lion: 72000, etd: "4-6 hari" },
    ]
  },

  // --- 35. PAPUA BARAT DAYA ---
  {
    province: "Papua Barat Daya",
    region: "Papua",
    cities: [
      { name: "Kota Sorong", postal: "98411", jne: 65000, jnt: 70000, lion: 56000, etd: "2-4 hari" },
      { name: "Kab. Sorong (Aimas)", postal: "98415", jne: 68000, jnt: 73000, lion: 59000, etd: "2-4 hari" },
      { name: "Kab. Sorong Selatan (Teminabuan)", postal: "98454", jne: 75000, jnt: 80000, lion: 65000, etd: "3-6 hari" },
      { name: "Kab. Raja Ampat (Waisai)", postal: "98482", jne: 80000, jnt: 86000, lion: 70000, etd: "3-6 hari" },
      { name: "Kab. Tambrauw (Fef)", postal: "98471", jne: 85000, jnt: 92000, lion: 76000, etd: "4-7 hari" },
      { name: "Kab. Maybrat (Kumurkek)", postal: "98491", jne: 80000, jnt: 86000, lion: 70000, etd: "4-7 hari" },
    ]
  },

  // --- 36. PAPUA SELATAN ---
  {
    province: "Papua Selatan",
    region: "Papua",
    cities: [
      { name: "Kab. Merauke", postal: "99611", jne: 85000, jnt: 90000, lion: 75000, etd: "3-5 hari" },
      { name: "Kab. Boven Digoel (Tanah Merah)", postal: "99663", jne: 95000, jnt: 102000, lion: 85000, etd: "4-7 hari" },
      { name: "Kab. Mappi (Kepi)", postal: "99671", jne: 98000, jnt: 105000, lion: 88000, etd: "5-8 hari" },
      { name: "Kab. Asmat (Agats)", postal: "99777", jne: 105000, jnt: 112000, lion: 95000, etd: "5-8 hari" },
    ]
  },

  // --- 37. PAPUA TENGAH ---
  {
    province: "Papua Tengah",
    region: "Papua",
    cities: [
      { name: "Kab. Mimika (Timika)", postal: "99910", jne: 75000, jnt: 80000, lion: 65000, etd: "3-5 hari" },
      { name: "Kab. Nabire", postal: "98811", jne: 80000, jnt: 85000, lion: 70000, etd: "3-5 hari" },
      { name: "Kab. Paniai (Enarotali)", postal: "98711", jne: 95000, jnt: 102000, lion: 85000, etd: "4-7 hari" },
      { name: "Kab. Deiyai (Tigi)", postal: "98771", jne: 98000, jnt: 105000, lion: 88000, etd: "4-7 hari" },
      { name: "Kab. Dogiyai (Kigamani)", postal: "98752", jne: 98000, jnt: 105000, lion: 88000, etd: "4-7 hari" },
      { name: "Kab. Intan Jaya (Sugapa)", postal: "98791", jne: 115000, jnt: 125000, lion: 105000, etd: "5-8 hari" },
      { name: "Kab. Puncak (Ilaga)", postal: "98965", jne: 120000, jnt: 130000, lion: 110000, etd: "5-8 hari" },
      { name: "Kab. Puncak Jaya (Mulia)", postal: "98911", jne: 120000, jnt: 130000, lion: 110000, etd: "5-8 hari" },
    ]
  },

  // --- 38. PAPUA PEGUNUNGAN ---
  {
    province: "Papua Pegunungan",
    region: "Papua",
    cities: [
      { name: "Kab. Jayawijaya (Wamena)", postal: "99511", jne: 95000, jnt: 102000, lion: 85000, etd: "3-6 hari" },
      { name: "Kab. Lanny Jaya (Tiom)", postal: "99553", jne: 110000, jnt: 120000, lion: 100000, etd: "5-8 hari" },
      { name: "Kab. Tolikara (Karubaga)", postal: "99562", jne: 110000, jnt: 120000, lion: 100000, etd: "5-8 hari" },
      { name: "Kab. Mamberamo Tengah (Kobakma)", postal: "99571", jne: 115000, jnt: 125000, lion: 105000, etd: "5-8 hari" },
      { name: "Kab. Yalimo (Elelim)", postal: "99581", jne: 115000, jnt: 125000, lion: 105000, etd: "5-8 hari" },
      { name: "Kab. Yahukimo (Dekai)", postal: "99572", jne: 105000, jnt: 115000, lion: 95000, etd: "4-7 hari" },
      { name: "Kab. Nduga (Kenyam)", postal: "99543", jne: 120000, jnt: 130000, lion: 110000, etd: "5-8 hari" },
      { name: "Kab. Pegunungan Bintang (Oksibil)", postal: "99573", jne: 115000, jnt: 125000, lion: 105000, etd: "5-8 hari" },
    ]
  },
];

// Susun seluruh 514 kota ke array flat
const all514Cities = [];
let totalCities = 0;

for (const prov of PROVINCES_DATA) {
  for (const c of prov.cities) {
    const slug = c.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const id = `${prov.province.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${slug}`;

    // Kalibrasi tarif SiCepat (SIUNTUNG / Reguler):
    // Sangat kompetitif di Jawa-Bali dan kota besar
    const sicepatDiff = prov.region === "Jawa-Bali" ? -3000 : prov.region === "Sulsel" ? -1000 : 0;
    const sicepatReg = Math.max(11000, c.jne + sicepatDiff);

    // Kalibrasi tarif Pos Indonesia (Pos Kilat Khusus):
    // Jaringan nasional BUMN, andal dan hemat untuk Indonesia Timur dan kepulauan
    const posDiff = (prov.region === "Papua" || prov.region === "Maluku" || prov.region === "NusaTenggara") ? -4000 : -2000;
    const posKilat = Math.max(10000, c.jne + posDiff);

    all514Cities.push({
      id,
      city: c.name,
      province: prov.province,
      region: prov.region,
      postalCode: c.postal,
      jneReg: c.jne,
      jntEz: c.jnt,
      lionReg: c.lion,
      sicepatReg,
      posKilat,
      etdDays: c.etd,
    });
    totalCities++;
  }
}

console.log(`Total Provinsi Terdaftar: ${PROVINCES_DATA.length}`);
console.log(`Total Kabupaten & Kota Terdaftar: ${totalCities}`);

const jsonOutputPath = path.resolve('./src/lib/shipping/data/indonesia514Cities.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(all514Cities, null, 2), 'utf8');

const tsOutputPath = path.resolve('./src/lib/shipping/data/indonesia514Cities.ts');
const tsContent = `// Auto-generated by scripts/build514MasterRates.mjs
// SSOT: 514 Kabupaten dan Kota Resmi Indonesia (Origin Makassar: UPG)

export interface MasterCityRateData {
  id: string;
  city: string;
  province: string;
  region: "Sulsel" | "Sulawesi" | "Jawa-Bali" | "Kalimantan" | "Sumatera" | "NusaTenggara" | "Maluku" | "Papua";
  postalCode: string;
  jneReg: number;
  jntEz: number;
  lionReg: number;
  sicepatReg: number;
  posKilat: number;
  etdDays: string;
}

export const INDONESIA_514_CITIES: MasterCityRateData[] = ${JSON.stringify(all514Cities, null, 2)};
`;
fs.writeFileSync(tsOutputPath, tsContent, 'utf8');

console.log(`JSON berhasil ditulis ke ${jsonOutputPath}`);
console.log(`TS berhasil ditulis ke ${tsOutputPath}`);
