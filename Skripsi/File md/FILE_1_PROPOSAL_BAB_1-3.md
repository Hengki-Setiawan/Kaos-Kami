# PROPOSAL SKRIPSI BAB I–III
### Rancang Bangun E-Commerce Berbasis 3D Interactive Mockup untuk Optimalisasi Pemesanan UMKM Kaos Kami

> **CATATAN PENGGUNAAN FILE INI (hapus/pindahkan ke lampiran sebelum print/seminar)**
>
> 1. File ini adalah **kerangka sekaligus draf isi** Proposal Skripsi Bab I–III, ditulis mengikuti format **Penelitian dan Pengembangan (Research and Development/R&D)** — jenis skripsi yang memang secara eksplisit diakomodasi untuk mahasiswa Bisnis Digital (bandingkan dengan definisi "Skripsi adalah laporan hasil penelitian dan pengembangan..." pada pedoman skripsi Prodi Bisnis Digital di beberapa PTN sejenis UNM, dan pedoman umum UNM 2019 yang menetapkan bagian utama proposal = Pendahuluan, Tinjauan Pustaka, Metode Penelitian).
> 2. Bagian yang sudah **ditulis penuh** bersumber dari: (a) isi PPT Presentasi Proposal Seminar Konsentrasi kamu, (b) 7 jurnal/artikel yang kamu unggah, (c) data riil di kaoskami.biz.id.
> 3. Bagian yang ditandai `[[ISI:KODE-TAG]]` **belum bisa saya isi** karena butuh pemeriksaan langsung ke source code/database/UI aplikasi kamu. Kode-kode ini **persis sama** dengan yang ada di **FILE 2 (Template Isian Teknis untuk AI Agent)**. Alurnya:
>    - Berikan **FILE 2** ke AI agent koding kamu (yang punya akses ke repo `Kaos-Kami`).
>    - Agent akan mengisi setiap bagian di FILE 2 sesuai instruksi di dalamnya.
>    - Salin hasil isian dari FILE 2, cari tag yang sama persis di FILE 1 ini, lalu ganti/timpa. Selesai — jadi satu naskah Bab I–III utuh.
> 4. **PENTING soal format teknis (margin, spasi, ukuran font, jenis sampul, dsb.):** Saya menyusun draf ini memakai kaidah umum penulisan skripsi UNM (Times New Roman 12pt, spasi 1,5–2, kertas A4) berdasarkan **Pedoman Penulisan Tugas Akhir Mahasiswa UNM 2019** (dokumen tingkat universitas) dan pola umum pedoman skripsi FEB di berbagai kampus sejenis. **Saya tidak menemukan dokumen pedoman skripsi versi terbaru khusus Prodi Bisnis Digital FEB UNM secara publik/daring**, jadi **wajib kamu cross-check** ke: (a) buku pedoman terbaru dari prodi/jurusan (biasanya dibagikan lewat grup angkatan atau kantor prodi), (b) dosen pembimbing/PA, (c) contoh skripsi Bisnis Digital UNM angkatan terbaru yang sudah lulus sidang, terutama untuk: halaman sampul & pengesahan, margin persis, spasi persis, gaya sitasi (APA vs lainnya), dan syarat administratif (jumlah SKS, IPK minimal, dsb). Jangan andalkan draf ini 100% untuk hal-hal administratif tersebut.
> 5. Struktur R&D di bawah ini saya adaptasi dari pola baku "Skripsi Penelitian Pengembangan" (Bab I: Latar Belakang–Tujuan P&P–Spesifikasi Produk–Manfaat–Asumsi & Keterbatasan–Definisi Istilah; Bab II: Kajian Teori–Penelitian Relevan–Kerangka Berpikir; Bab III: Model P&P–Prosedur P&P–Uji Coba Produk–Instrumen–Analisis Data) yang berlaku luas di lingkungan eks-IKIP/Universitas Negeri sejenis UNM. Diskusikan dengan pembimbing apakah prodi Bisnis Digital UNM mewajibkan header bab yang identik atau memperbolehkan penyesuaian nama sub-bab.

---

## HALAMAN SAMPUL (contoh isi — sesuaikan ke template resmi prodi)

```
PROPOSAL SKRIPSI

RANCANG BANGUN E-COMMERCE BERBASIS 3D INTERACTIVE MOCKUP
UNTUK OPTIMALISASI PEMESANAN UMKM KAOS KAMI

[LOGO UNM]

Diajukan kepada Program Studi Bisnis Digital Fakultas Ekonomi dan Bisnis
Universitas Negeri Makassar untuk Memenuhi Salah Satu Syarat
Memperoleh Gelar Sarjana Bisnis Digital

Oleh:
HENGKI SETIAWAN
NIM. [ISI NIM]

PROGRAM STUDI BISNIS DIGITAL
FAKULTAS EKONOMI DAN BISNIS
UNIVERSITAS NEGERI MAKASSAR
[TAHUN]
```

*(Sesuaikan ukuran font judul 14pt bold, kata "PROPOSAL SKRIPSI" 16pt bold, format center, jarak antar blok — cek ke pedoman resmi/contoh skripsi kakak tingkat terbaru.)*

## LEMBAR PERSETUJUAN PEMBIMBING
*(diisi saat proposal siap diseminarkan — format standar tanda tangan Pembimbing I & II)*

## DAFTAR ISI, DAFTAR TABEL, DAFTAR GAMBAR
*(dibuat otomatis di akhir menggunakan fitur Table of Contents/Table of Figures pada Word setelah seluruh naskah final — jangan diketik manual)*

---

# BAB I
# PENDAHULUAN

## A. Latar Belakang Masalah

Usaha Mikro, Kecil, dan Menengah (UMKM) merupakan salah satu penopang utama perekonomian nasional Indonesia. Berdasarkan data Kementerian Koperasi dan UKM yang dipublikasikan melalui Kementerian Koordinator Bidang Perekonomian Republik Indonesia, jumlah unit UMKM di Indonesia tercatat sebanyak 64,2 juta unit dengan kontribusi terhadap Produk Domestik Bruto (PDB) nasional mencapai 60,51 persen atau setara kurang lebih Rp9.580 triliun, serta mampu menyerap 96,92 persen tenaga kerja nasional (Kementerian Koordinator Bidang Perekonomian RI, ekon.go.id, 2024). Data ini menegaskan bahwa keberlangsungan dan daya saing UMKM memiliki dampak yang sangat luas terhadap stabilitas ekonomi Indonesia secara keseluruhan.

Salah satu sektor UMKM yang menunjukkan pertumbuhan signifikan adalah sektor pakaian jadi. Kementerian Perindustrian RI melaporkan bahwa industri pakaian jadi nasional tumbuh sebesar 5,78 persen pada tahun 2024 (Kementerian Perindustrian RI dalam Kompas.com, 17 Maret 2025). Pertumbuhan ini turut dirasakan di tingkat daerah, termasuk Kota Makassar yang menurut data Dinas Koperasi dan UKM Kota Makassar memiliki 31.848 UMKM terdaftar pada tahun 2024 (Dinas Koperasi dan UKM Kota Makassar dalam ANTARA News, 7 November 2024). Salah satu pelaku usaha pada sektor pakaian jadi di Kota Makassar adalah **UMKM Kaos Kami**, sebuah usaha kaos komunitas yang berlokasi di Jalan Galangan Kapal, Kelurahan Tallo, Kota Makassar, yang menjadi objek penelitian dalam penelitian dan pengembangan ini.

Di balik potensi besar sektor UMKM pakaian jadi tersebut, terdapat tantangan struktural yang secara konsisten dilaporkan dalam berbagai penelitian mengenai media penjualan *online* UMKM. Hananto dkk. (2021) dalam penelitiannya mengenai visualisasi produk 3D pada media promosi dan pemesanan *online* menemukan bahwa media sosial, blog, situs web, maupun *marketplace* yang saat ini banyak digunakan UMKM belum mampu menampilkan representasi digital produk secara maksimal, karena foto dan video yang digunakan tidak cukup menggambarkan seluruh sisi produk sehingga sering memunculkan salah persepsi calon pembeli yang berujung pada ketidakpuasan setelah barang diterima. Temuan ini diperkuat dalam penelitian lanjutan Hananto dkk. (2024) yang menegaskan bahwa UMKM pada umumnya tidak memiliki stok produk dalam jumlah besar sehingga lebih banyak melayani pemesanan sesuai keinginan calon konsumen, namun kemampuan visualisasi media yang tersedia saat ini membuat UMKM kesulitan memberikan layanan pemesanan yang sesuai dengan keinginan tersebut. Pada konteks usaha sablon secara lebih spesifik, Luthfi dan Asmunin (Universitas Negeri Surabaya, t.t.) menemukan bahwa pemesanan kaos *custom* secara *online* umumnya masih dilakukan secara manual melalui telepon, *email*, maupun WhatsApp, di mana pelanggan kerap kurang memahami resolusi gambar dan tidak memperoleh informasi stok ukuran maupun warna secara akurat, sehingga proses produksi menjadi terhambat dan pelanggan merasa tidak puas.

Ketiga pola tantangan tersebut — keterbatasan visualisasi media *online*, kesulitan UMKM memberikan layanan kustomisasi, dan proses pemesanan *custom* yang masih manual — juga dialami secara langsung oleh UMKM Kaos Kami. Berdasarkan observasi dan wawancara dengan pemilik usaha, seluruh proses UMKM Kaos Kami mulai dari pembelian bahan, penyablonan (dengan alur beli kaos polos → cetak desain DTF → sablon manual menggunakan *heat press* → pengemasan → pengiriman) dikerjakan sendiri oleh pemilik tanpa bantuan karyawan. Komunikasi desain dan konfirmasi pesanan kustom sablon masih dilakukan secara manual melalui obrolan pribadi (*chat* WhatsApp), sementara produk yang tayang di etalase *marketplace* (Shopee/Tokopedia) hanya berupa desain siap pakai buatan pemilik seperti "Kaos Kami Skizo – Lost Kitten", "Kaos Vagabond/Miyamoto Musashi", dan varian desain grafis lainnya seharga Rp79.000–Rp89.000 per potong, bukan hasil pemesanan sablon kustom sesuai keinginan pelanggan — kondisi ini sejalan dengan temuan Hananto dkk. (2024) bahwa keterbatasan kemampuan visualisasi membuat UMKM belum dapat melayani pemesanan sesuai keinginan konsumen pada media *online* yang tersedia.

Dampak dari keterbatasan tersebut terlihat jelas pada data kinerja bisnis UMKM Kaos Kami di *dashboard* penjual Shopee. Pada periode observasi, jumlah pengunjung toko meningkat tajam dari 234 pengunjung menjadi 437 pengunjung (naik 86,8 persen), namun jumlah pesanan yang masuk hanya bertambah dari 16 menjadi 22 pesanan (naik 37,5 persen) — dengan kata lain, pertumbuhan trafik kunjungan 2,3 kali lebih cepat dibandingkan pertumbuhan transaksi. Tingkat konversi kunjungan menjadi transaksi tercatat hanya sebesar 4,81 persen dengan total penjualan sekitar Rp2,5 juta. Kesenjangan antara harapan (pertumbuhan transaksi yang sebanding dengan pertumbuhan trafik, serta kemampuan melayani pesanan sablon kustom) dan kenyataan (konversi rendah serta etalase yang hanya berisi desain siap pakai) inilah yang menjadi persoalan mendasar yang perlu dipecahkan.

Sejumlah upaya sesungguhnya telah ditempuh UMKM Kaos Kami untuk mempercepat transaksi pemesanan kustom dan memperluas jangkauan pasar secara mandiri, yaitu: menerima pemesanan melalui *chat* WhatsApp, mengandalkan dua *marketplace* (Shopee dan Tokopedia) sebagai satu-satunya kanal penjualan, dan melakukan promosi melalui satu grup komunitas Facebook beranggotakan 391,9 ribu orang. Namun, evaluasi menunjukkan bahwa ketiga upaya tersebut belum menjawab kesenjangan yang ada: pesanan kustom tetap dikerjakan secara manual, kanal penjualan tetap sepenuhnya bergantung pada *marketplace* pihak ketiga (dengan potongan biaya hingga 20 persen), dan pelanggan masih belum memperoleh media pratinjau desain yang presisi sebelum memutuskan membeli.

Perkembangan teknologi grafika tiga dimensi (3D) berbasis web (*Web3D*) menawarkan solusi yang secara empiris telah terbukti mampu menjawab persoalan di atas. Surahman, Wahyudi, dan Sintaro (2020) dalam penelitiannya mengenai implementasi visual 3D objek sebagai media promosi produk *e-marketplace* melaporkan skor kualitas informasi sebesar 88,9 persen dengan kategori "Sangat Baik", yang menunjukkan bahwa visualisasi 3D mampu meningkatkan pengalaman pelanggan dan menjadi keunggulan bersaing (*competitive advantage*) dibandingkan visualisasi foto maupun video konvensional. Lebih jauh, Hananto dkk. (2024) membuktikan bahwa layanan kustomisasi produk yang menampilkan hasil susunan pilihan pengguna secara 3D dapat direalisasikan secara sederhana dan terjangkau bagi kalangan UMKM, dengan hasil uji Beta pengguna sebesar 1752 dari skor maksimal 2000 (kategori "Sangat Setuju") — menunjukkan tingkat penerimaan yang sangat tinggi terhadap layanan kustomisasi 3D sebagai solusi pemesanan *online* UMKM. Dari sisi pemesanan berbasis kanvas digital, Luthfi dan Asmunin membangun aplikasi pemesanan kaos *custom* menggunakan *library* FabricJS yang memungkinkan pengguna mendesain kaos secara mandiri di atas kanvas serta melakukan pembayaran melalui *Midtrans payment gateway* — namun implementasi ini masih terbatas pada kanvas dua dimensi (2D), belum menghadirkan visualisasi hasil kustomisasi secara 3D yang dapat diamati dari berbagai sudut pandang.

Bukti empiris dari ranah internasional turut memperkuat urgensi integrasi visualisasi 3D interaktif ke dalam alur *e-commerce*. Hwangbo, Kim, Lee, dan Jang (2020) yang menganalisis data transaksi nyata sebuah toko fesyen *online* yang menerapkan fitur *3D virtual try-on* menemukan bahwa rata-rata penjualan per pelanggan meningkat dan tingkat retur (pengembalian barang) turun sebesar 27 persen karena ketidaksesuaian ukuran dan bentuk dapat tersaring lebih awal sebelum pembelian dilakukan. Sejalan dengan itu, Kim, Baek, dan Yoon (2020) melalui tiga eksperimen membuktikan bahwa niat beli (*purchase intention*) konsumen secara signifikan lebih tinggi pada tampilan produk yang dapat diputar 360 derajat dibandingkan gambar statis dua dimensi, dengan efek tersebut dimediasi oleh kejelasan sensoris (*sensory vividness*) yang dirasakan konsumen. Dari sisi kelayakan teknis, Hamzaturrazak, Jabbar, Perdana, dan Pinandito (2024) membuktikan melalui pengukuran performa *rendering* bahwa objek 3D kini dapat dirender langsung di dalam *browser* tanpa memerlukan *plugin* tambahan menggunakan teknologi *WebGL*/*GLSL*, sehingga solusi berbasis situs web dapat diakses lintas perangkat tanpa hambatan instalasi.

Berdasarkan pemaparan latar belakang di atas, dapat disimpulkan bahwa terdapat kesenjangan (*gap*) yang nyata antara kebutuhan UMKM Kaos Kami untuk menghadirkan layanan pemesanan kaos sablon *custom* yang dapat dipratinjau secara akurat dan interaktif oleh calon pembeli, dengan kondisi eksisting yang masih mengandalkan komunikasi manual dan etalase *marketplace* berisi desain siap pakai. Di sisi lain, tujuh penelitian terdahulu (lima nasional dan dua internasional) yang telah dipaparkan secara konsisten membuktikan bahwa integrasi visualisasi dan kustomisasi produk secara 3D interaktif ke dalam media penjualan *online* mampu meningkatkan pengalaman pelanggan, menekan tingkat kesalahan pemesanan, menurunkan tingkat retur, dan berpotensi meningkatkan konversi penjualan. Namun demikian, visualisasi dan kustomisasi 3D pada penelitian-penelitian tersebut umumnya baru diterapkan pada produk mebel dan *e-marketplace* skala umum (Surahman dkk., 2020), sedangkan aplikasi pemesanan kaos *custom* yang sudah ada (Luthfi & Asmunin) masih menggunakan kanvas 2D, belum menggabungkan keduanya — yaitu *3D interactive mockup* yang terintegrasi langsung ke dalam alur *e-commerce* (mulai dari kustomisasi, konfirmasi, hingga pembayaran) — pada konteks spesifik UMKM sablon kaos.

Atas dasar kesenjangan teoritis dan praktis tersebut, penelitian ini bermaksud melakukan penelitian dan pengembangan (*Research and Development*) berupa **rancang bangun sistem *e-commerce* berbasis *3D interactive mockup*** yang memungkinkan calon pembeli memutar, memperbesar, dan memposisikan desain sablon pada model 3D kaos secara *real-time* dari berbagai sudut pandang sebelum melakukan pemesanan, sekaligus menyatukan proses konfirmasi desain dan pembayaran dalam satu sistem digital tanpa lagi bergantung sepenuhnya pada komunikasi manual maupun *marketplace* pihak ketiga. Produk yang dihasilkan dari penelitian ini secara teknis telah dikembangkan dan dipublikasikan pada domain **kaoskami.biz.id** menggunakan kerangka kerja web modern (*Next.js* dan *React Three Fiber/Three.js*) — sebuah pendekatan implementasi yang berbeda dari teknologi *Web3D* generasi sebelumnya (*X3DOM*, *WebGL* murni, maupun kanvas 2D *FabricJS*) yang digunakan pada ketujuh penelitian terdahulu — sehingga penelitian ini juga memberikan kontribusi kebaruan (*novelty*) dari sisi pendekatan teknologi implementasi sekaligus dari sisi konteks objek penelitian, yaitu UMKM sablon kaos di Kota Makassar.

`[[ISI:BAB1-SPESIFIKASI-PRODUK]]`

*(Paragraf penutup latar belakang — opsional, bisa ditambahkan 1 paragraf ringkas yang menyebutkan secara singkat bahwa produk sudah berjalan (live) di kaoskami.biz.id dengan fitur inti apa saja, sebagai jembatan menuju rumusan masalah. Lihat instruksi pada FILE 2 tag yang sama.)*

## B. Rumusan Masalah

Berdasarkan latar belakang masalah di atas, rumusan masalah dalam penelitian dan pengembangan ini adalah sebagai berikut.

1. Bagaimana proses rancang bangun sistem *e-commerce* berbasis *3D interactive mockup* untuk optimalisasi pemesanan pada UMKM Kaos Kami?
2. Bagaimana tingkat kelayakan (validitas) sistem *e-commerce* berbasis *3D interactive mockup* yang dikembangkan berdasarkan penilaian ahli (*expert judgment*)?
3. Bagaimana tingkat penerimaan (efektivitas dan kepraktisan) sistem *e-commerce* berbasis *3D interactive mockup* menurut penilaian pemilik UMKM Kaos Kami dan calon konsumen sebagai pengguna?
4. Bagaimana sistem *e-commerce* berbasis *3D interactive mockup* yang dikembangkan berkontribusi terhadap optimalisasi proses pemesanan kaos *custom* pada UMKM Kaos Kami dibandingkan proses pemesanan manual yang berjalan sebelumnya?

> *Catatan: sesuaikan jumlah dan redaksi rumusan masalah dengan arahan pembimbing. Sebagian pedoman R&D tidak mewajibkan rumusan masalah berupa kalimat tanya formal seperti penelitian kuantitatif — ada yang cukup memakai "Tujuan Penelitian dan Pengembangan" sebagai pengganti. Tanyakan preferensi pembimbing.*

## C. Tujuan Penelitian dan Pengembangan

Tujuan penelitian dan pengembangan ini adalah sebagai berikut.

1. Menghasilkan rancang bangun sistem *e-commerce* berbasis *3D interactive mockup* yang dapat mengoptimalkan proses pemesanan kaos *custom* pada UMKM Kaos Kami.
2. Mengetahui tingkat kelayakan (validitas) sistem yang dikembangkan berdasarkan penilaian ahli materi (bisnis/UMKM) dan ahli media (teknologi/sistem informasi).
3. Mengetahui tingkat penerimaan pengguna (pemilik UMKM dan calon konsumen) terhadap sistem *e-commerce* berbasis *3D interactive mockup* yang dikembangkan.
4. Mengetahui kontribusi sistem yang dikembangkan terhadap optimalisasi proses pemesanan kaos *custom* dibandingkan dengan proses manual yang berjalan sebelumnya pada UMKM Kaos Kami.

## D. Spesifikasi Produk yang Diharapkan

Produk yang dihasilkan dari penelitian dan pengembangan ini adalah sebuah sistem *e-commerce* berbasis web dengan fitur utama *3D interactive mockup* untuk UMKM Kaos Kami, dengan spesifikasi umum sebagai berikut.

1. Sistem berbasis web (dapat diakses lintas perangkat: komputer/laptop dan perangkat bergerak/*mobile*) tanpa memerlukan instalasi *plugin* tambahan.
2. Menyediakan katalog produk siap beli (*ready stock*) sekaligus jalur kustomisasi produk (*custom order*).
3. Menyediakan modul **Studio 3D** yang memungkinkan pengunjung: (a) memilih jenis produk dasar (kaos, hoodie, crewneck, jaket, dst.), (b) mengunggah desain/gambar sablon sendiri, (c) memposisikan dan mengatur skala desain pada area cetak yang presisi, (d) memilih warna/varian bahan, (e) memilih ukuran, dan (f) mengamati hasil akhir kaos secara 3D dengan navigasi putar 360 derajat (*orbit*) secara *real-time* sebelum memutuskan checkout.
4. Menyediakan alur transaksi terintegrasi (keranjang belanja, checkout, dan pembayaran daring) tanpa harus berpindah ke aplikasi percakapan pihak ketiga untuk konfirmasi manual.
5. Menyediakan fitur pelacakan pesanan (*order tracking*) bagi pembeli.
6. Menyediakan halaman informasi pendukung (kalkulator estimasi biaya sablon, kebijakan privasi, kredit aset 3D, dan kontak dukungan pelanggan).
7. `[[ISI:BAB1-SPESIFIKASI-PRODUK]]` *(lengkapi dengan rincian teknis final: format model 3D yang dipakai, mekanisme fallback bila perangkat tidak mendukung WebGL, ketersediaan versi aplikasi Android, metode pembayaran yang didukung, dsb — lihat instruksi detail pada FILE 2)*

## E. Manfaat Penelitian dan Pengembangan

### 1. Manfaat Teoritis

a. Penelitian ini diharapkan dapat memperkaya kajian ilmiah pada bidang bisnis digital, khususnya pada topik implementasi teknologi visualisasi dan kustomisasi produk berbasis 3D (*Web3D*/*3D interactive mockup*) dalam konteks optimalisasi proses bisnis *e-commerce* UMKM.

b. Hasil penelitian ini diharapkan dapat menjadi rujukan bagi penelitian selanjutnya yang mengkaji integrasi teknologi *3D interactive mockup* dengan kerangka kerja web modern (*Next.js*, *React Three Fiber*) pada konteks UMKM sejenis, melengkapi kajian-kajian sebelumnya yang lebih banyak menggunakan pendekatan *X3DOM*, *WebGL* murni, maupun kanvas 2D.

c. Penelitian ini diharapkan memperkuat pemahaman mengenai keterkaitan antara visualisasi produk interaktif dengan perilaku dan pengalaman konsumen daring (*consumer online purchasing experience*) dalam disiplin bisnis digital.

### 2. Manfaat Praktis

a. **Bagi UMKM Kaos Kami**, sistem yang dihasilkan diharapkan dapat mengoptimalkan proses pemesanan kaos *custom*, meningkatkan konversi kunjungan menjadi transaksi, mengurangi kesalahan produksi akibat komunikasi manual yang tidak presisi, serta membuka kanal penjualan mandiri yang tidak sepenuhnya bergantung pada *marketplace* pihak ketiga.

b. **Bagi konsumen/calon pembeli**, sistem ini diharapkan memberikan pengalaman berbelanja yang lebih meyakinkan melalui kemampuan mencermati hasil desain sablon secara akurat dari berbagai sudut pandang sebelum melakukan pembelian.

c. **Bagi pelaku UMKM sejenis**, hasil penelitian ini diharapkan dapat menjadi referensi model pengembangan media penjualan *online* berbasis 3D yang sederhana dan terjangkau untuk diterapkan pada usaha sejenis dengan sumber daya terbatas.

d. **Bagi Program Studi Bisnis Digital Universitas Negeri Makassar**, penelitian ini diharapkan menjadi salah satu referensi/dokumentasi ilmiah mengenai implementasi teknologi digital dalam optimalisasi proses bisnis UMKM yang dapat digunakan dalam kegiatan akademik maupun pengabdian masyarakat.

## F. Asumsi dan Keterbatasan Penelitian dan Pengembangan

### 1. Asumsi Pengembangan

a. Ketersediaan koneksi internet dan perangkat (komputer/*smartphone*) yang mendukung standar web modern (HTML5 dan WebGL) diasumsikan dimiliki oleh mayoritas calon konsumen UMKM Kaos Kami, mengingat target pasar merupakan segmen komunitas dan anak muda perkotaan yang akrab dengan belanja daring.

b. Pemilik UMKM Kaos Kami diasumsikan bersedia dan mampu mengadopsi sistem baru menggantikan sebagian alur kerja manual (WhatsApp dan *marketplace*) yang telah berjalan sebelumnya.

c. Model 3D generik yang digunakan sebagai dasar kustomisasi (kaos, hoodie, crewneck, dsb.) diasumsikan cukup merepresentasikan bentuk fisik produk nyata UMKM Kaos Kami sehingga hasil pratinjau 3D tetap relevan dengan produk yang akan diterima pembeli.

### 2. Keterbatasan Pengembangan

a. Uji coba produk dalam penelitian ini dibatasi pada lingkup UMKM Kaos Kami sebagai objek tunggal (studi kasus), sehingga generalisasi hasil ke UMKM sablon kaos lain perlu dilakukan dengan kehati-hatian.

b. Penelitian ini tidak sampai pada tahap produksi masal sebagaimana langkah kesepuluh model Sugiyono, mengingat produk yang dikembangkan adalah perangkat lunak berbasis web yang didistribusikan melalui publikasi daring (*deployment*), bukan barang fisik yang memerlukan produksi bertahap dalam jumlah besar.

c. `[[ISI:BAB3-RENCANA-UJI-TEKNIS]]` *(sebutkan keterbatasan teknis riil bila ada — misalnya keterbatasan jumlah komponen 3D yang dapat ditampilkan bersamaan, kompatibilitas perangkat tertentu, atau ukuran berkas model 3D — sebagaimana ditemukan pada penelitian Hananto dkk. (2024) dan Hamzaturrazak dkk. (2024). Lihat instruksi pada FILE 2.)*

d. Uji coba pemakaian dalam penelitian ini dilakukan pada jumlah responden terbatas sesuai kelaziman skala penelitian skripsi, sehingga bersifat indikatif dan bukan generalisasi statistik berskala besar.

## G. Definisi Istilah/Operasional

| Istilah | Definisi Operasional |
|---|---|
| **E-Commerce** | Sistem perdagangan elektronik yang memungkinkan transaksi jual beli produk UMKM Kaos Kami dilakukan secara daring, mencakup katalog produk, kustomisasi, keranjang belanja, dan pembayaran. |
| **3D Interactive Mockup** | Representasi visual tiga dimensi dari produk kaos/pakaian yang dapat dimanipulasi secara langsung (real-time) oleh pengguna — diputar (orbit), diperbesar/diperkecil (zoom), diberi desain sablon, diganti warna dan ukurannya — sebelum produk tersebut benar-benar dipesan atau diproduksi. |
| **Kustomisasi Produk (Product Customization)** | Layanan yang memungkinkan konsumen menyusun sendiri spesifikasi produk (desain, warna, ukuran) sesuai preferensi masing-masing melalui sistem, alih-alih memilih dari stok jadi yang terbatas. |
| **UMKM Kaos Kami** | Usaha Mikro, Kecil, dan Menengah yang bergerak di bidang produksi dan penjualan kaos sablon komunitas, berlokasi di Jalan Galangan Kapal, Kelurahan Tallo, Kota Makassar, menjadi objek/subjek dalam penelitian dan pengembangan ini. |
| **Penelitian dan Pengembangan (R&D)** | Metode penelitian yang digunakan untuk menghasilkan produk tertentu (dalam hal ini sistem *e-commerce* berbasis *3D interactive mockup*) sekaligus menguji kelayakan dan efektivitas produk tersebut (Sugiyono, 2019). |
| `[[ISI:BAB1-DEFINISI-ISTILAH-TEKNIS]]` | *(lengkapi tabel ini dengan istilah teknis spesifik implementasi — mis. React Three Fiber, GLB/Draco, Decal, WebGL Fallback, Duitku Payment Gateway, Capacitor/APK — lihat instruksi pada FILE 2)* |

---

# BAB II
# KAJIAN PUSTAKA

## A. Kajian Teori

### 1. Bisnis Digital dan Transformasi Digital UMKM

Bisnis digital dapat dipahami sebagai penerapan teknologi informasi dan komunikasi untuk menciptakan, mengubah, atau mengoptimalkan proses dan model bisnis guna menghasilkan nilai tambah bagi pelaku usaha maupun konsumen. Transformasi digital pada UMKM menjadi kebutuhan yang mendesak, terutama pasca meningkatnya adopsi belanja *online* oleh masyarakat. Namun demikian, transformasi digital tidak cukup hanya dengan memindahkan aktivitas penjualan ke kanal *online* (media sosial, *marketplace*), sebagaimana ditunjukkan oleh temuan Hananto dkk. (2021, 2024) bahwa kanal *online* konvensional tersebut tetap memiliki keterbatasan mendasar pada aspek visualisasi dan personalisasi produk. Oleh karena itu, transformasi digital yang efektif bagi UMKM idealnya turut mencakup peningkatan kualitas pengalaman digital (*digital customer experience*) melalui pemanfaatan teknologi yang lebih maju seperti visualisasi 3D interaktif, bukan sekadar migrasi kanal penjualan semata.

*(Tambahkan 1–2 paragraf dengan sumber buku/jurnal teori bisnis digital atau transformasi digital UMKM sesuai anjuran pembimbing — misalnya konsep digitalisasi UMKM, e-business strategy, atau digital business model canvas, bila diwajibkan program studi.)*

### 2. E-Commerce dan Perilaku Konsumen Daring

*E-commerce* merupakan proses jual beli produk atau jasa yang dilakukan melalui jaringan elektronik, khususnya internet. Dalam praktiknya, keberhasilan sebuah sistem *e-commerce* tidak hanya ditentukan oleh kemudahan transaksi, tetapi juga oleh kualitas pengalaman yang dirasakan konsumen ketika mengevaluasi produk sebelum membeli. Choi dan Taylor (2014, dalam Kim, Baek, & Yoon, 2020) mengemukakan konsep *telepresence* — perasaan "hadir secara nyata" pada lingkungan yang dimediasi komputer — sebagai salah satu mekanisme yang menjelaskan mengapa presentasi visual tiga dimensi mampu meningkatkan sikap terhadap merek (*brand attitude*) dan niat beli (*purchase intention*) dibandingkan presentasi visual dua dimensi konvensional. Kim, Baek, dan Yoon (2020) memperkuat hal ini melalui tiga eksperimen yang membuktikan bahwa citra produk yang dapat diputar 360 derajat menghasilkan niat beli yang lebih tinggi dibandingkan gambar statis, dengan efek tersebut dimediasi oleh *sensory vividness* — yaitu kejelasan informasi sensoris yang tersimpan dalam ingatan kerja konsumen ketika mengamati produk secara virtual.

Pada konteks pakaian, Hwangbo, Kim, Lee, dan Jang (2020) menegaskan bahwa dua persoalan utama pada *e-commerce* fesyen adalah tingginya tingkat retur produk dan keraguan konsumen untuk membeli, yang keduanya banyak disebabkan oleh ketidakpastian ukuran dan kesesuaian bentuk produk saat dibeli secara daring. Teknologi *virtual try-on* tiga dimensi terbukti mampu menekan persoalan tersebut karena memberikan interaksi impersonal antara konsumen dengan model virtual dari tubuhnya sendiri, sehingga dapat menyaring ketidaksesuaian ukuran dan bentuk lebih awal sebelum transaksi terjadi.

### 3. Usaha Mikro, Kecil, dan Menengah (UMKM)

UMKM merupakan unit usaha produktif yang berdiri sendiri, dijalankan oleh perorangan atau badan usaha dengan kriteria tertentu sebagaimana diatur dalam peraturan perundang-undangan di Indonesia. Karakteristik umum UMKM — termasuk UMKM Kaos Kami — adalah keterbatasan modal, sumber daya manusia, dan kapasitas produksi, yang berimplikasi pada pola bisnis "memproduksi berdasarkan pesanan" (*made-to-order*) alih-alih menyetok produk dalam jumlah besar. Karakteristik inilah yang menjadikan kemampuan visualisasi dan kustomisasi produk sebelum produksi menjadi sangat krusial bagi keberlangsungan UMKM berbasis pesanan seperti usaha sablon kaos.

*(Tambahkan definisi UMKM berdasarkan UU/PP terbaru — misalnya UU No. 20 Tahun 2008 tentang UMKM atau peraturan turunannya — untuk memperkuat landasan yuridis-teoritis.)*

### 4. Visualisasi Produk 3D dan Teknologi Web3D

Grafika tiga dimensi (3D) merupakan teknik representasi visual yang mampu menampilkan objek dengan informasi kedalaman, volume, dan sudut pandang yang menyerupai kondisi objek tersebut di dunia nyata — sebuah kapasitas yang tidak dimiliki oleh visualisasi dua dimensi konvensional berbasis foto maupun video. Surahman, Wahyudi, dan Sintaro (2020) membuktikan melalui pengukuran kualitas informasi (*information quality*) berdasarkan lima dimensi — kelengkapan (*completeness*), ketepatan (*precision*), keandalan (*reliability*), keterkinian (*currency*), dan bentuk keluaran (*format of output*) — bahwa penerapan visual 3D objek pada produk *e-marketplace* memperoleh skor 88,9 persen (kategori "Sangat Baik"), yang menegaskan bahwa visualisasi 3D dapat menjadi keunggulan bersaing (*competitive advantage*, mengacu pada kerangka Porter, 1998) bagi pelaku *e-commerce*.

Teknologi untuk menghadirkan grafika 3D pada web (*Web3D*) terus berkembang. Hananto, Susilo, Ahmad, dan Rahman (2021) serta Hananto, Haryadi, Nour, Hasbi, dan Syam (2024) menggunakan kerangka kerja **X3DOM**, sebuah implementasi *Declarative 3D* yang menggabungkan format standar konsorsium Web3D (X3D) dengan HTML5, sehingga model 3D dapat disisipkan ke halaman web tanpa memerlukan pengkodean interaksi 3D yang kompleks. Sementara itu, Hamzaturrazak, Jabbar, Perdana, dan Pinandito (2024) mengkaji **WebGL** (*Web Graphics Library*) sebagai standar rendering grafis 3D pada *browser* berbasis *Imperative 3D*, dipadukan dengan **GLSL** (*OpenGL Shading Language*) untuk mengontrol *shader* secara langsung pada GPU. Hasil pengujian mereka menunjukkan bahwa pada tingkat kepadatan poligon tinggi, pendekatan GLSL secara konsisten lebih hemat penggunaan memori (580,32 MB) dibandingkan WebGL murni (589 MB), meskipun keduanya tetap lebih boros memori dibandingkan *rendering native* di luar *browser* (380 MB) — namun perbedaan ini dinilai wajar dan tetap dalam batas yang dapat diterima untuk aplikasi berbasis web.

Berbeda dari pendekatan *Declarative 3D* (X3DOM) maupun *Imperative 3D* murni (WebGL/GLSL) yang digunakan pada penelitian-penelitian tersebut, penelitian ini mengimplementasikan visualisasi 3D menggunakan **Three.js** yang diorkestrasi melalui **React Three Fiber** — sebuah *renderer* React yang memetakan *scene graph* Three.js ke dalam komponen React deklaratif. Pendekatan ini pada dasarnya tetap berjalan di atas mesin WebGL milik *browser* (sehingga tetap mewarisi karakteristik kinerja *rendering* WebGL yang dibahas Hamzaturrazak dkk., 2024), namun memungkinkan integrasi *scene* 3D dengan komponen antarmuka aplikasi *e-commerce* (keranjang belanja, checkout, manajemen status pengguna) dalam satu basis kode modern (*Next.js*/React) yang terpadu dan mudah dipelihara.

`[[ISI:BAB2-TEKNOLOGI-3D-YANG-DIGUNAKAN]]`

### 5. Kustomisasi Produk dan Product Configurator

Kustomisasi produk (*product customization*) adalah kemampuan sebuah sistem penjualan untuk memungkinkan konsumen menyusun sendiri atribut produk (desain, warna, ukuran, bahan, dan sebagainya) sesuai preferensi masing-masing sebelum produk diproduksi atau dibeli, yang dalam ranah *e-commerce* sering disebut sebagai *konfigurator produk* (*product configurator*). Hananto dkk. (2024) menekankan bahwa layanan kustomisasi berbasis grafika 3D umumnya hanya dapat diakses oleh pelaku usaha besar karena kompleksitas teknologi (umumnya berbasis WebGL) dan biaya implementasi yang tinggi dari penyedia jasa spesialis, sehingga tampak mustahil diterapkan oleh kalangan UMKM yang sumber dayanya sangat terbatas. Untuk mengatasi hal tersebut, mereka mengembangkan metode *konkatenasi elemen* (*element concatenation*) — yaitu menggabungkan beberapa model 3D komponen produk menjadi satu model utuh berdasarkan pilihan pengguna — sebagai solusi kustomisasi 3D yang sederhana, mudah dikelola, dan tidak menuntut penguasaan teknologi mendalam dari pihak UMKM.

### 6. Keunggulan Bersaing (Competitive Advantage)

Porter (1998, dalam Surahman dkk., 2020) mendefinisikan keunggulan bersaing sebagai kondisi ketika sebuah perusahaan menjadi pilihan konsumen di pasar karena dipersepsikan mampu memberikan nilai yang lebih menguntungkan dibandingkan pesaing, yang dapat dicapai melalui strategi kepemimpinan biaya (*cost leadership*) maupun diferensiasi (*differentiation*). Dalam konteks penelitian ini, penyediaan fitur *3D interactive mockup* pada sistem *e-commerce* UMKM Kaos Kami merupakan bentuk strategi diferensiasi yang membedakan UMKM Kaos Kami dari kompetitor sejenis (baik UMKM sablon lain maupun toko di *marketplace* umum) yang masih mengandalkan visualisasi foto/video konvensional.

## B. Penelitian yang Relevan

Berikut disajikan sintesis tujuh penelitian terdahulu (lima nasional dan dua internasional) yang menjadi landasan empiris sekaligus posisi kebaruan (*novelty*) penelitian ini.

| No. | Peneliti (Tahun) — Sumber | Fokus & Metode | Temuan Utama | Keterkaitan dengan Penelitian Ini |
|---|---|---|---|---|
| 1 | Surahman, Wahyudi, & Sintaro (2020) — *Jurnal Buana Informatika* Vol. 11 No. 2 | Implementasi visual 3D objek sebagai media promosi produk *e-marketplace* menggunakan *3D Warehouse* (SketchUp), metode *Extreme Programming* | Skor kualitas informasi 88,9% ("Sangat Baik"); visual 3D meningkatkan pengalaman pelanggan dan menjadi keunggulan bersaing | Mendasari argumen bahwa visualisasi 3D secara empiris meningkatkan kualitas informasi produk (Bab I & II.A.4/6) |
| 2 | Hananto, Susilo, Ahmad, & Rahman (2021) — *Journal of Information System, Graphics, Hospitality and Technology (INSIGHT)* Vol. 3 No. 1 | Visualisasi produk 3D pada media promosi & pemesanan *online* berbasis X3DOM + PHP/MySQL, metode *Evolutionary Prototyping* | Uji akses 334/400 dan uji fitur 328/400 (kategori "Sangat Setuju"/"Sangat Suka"); pengunjung lebih memahami fisik produk lewat model 3D dibanding foto | Menjadi dasar identifikasi tantangan (Bab I.A) dan model instrumen uji Beta skala Likert (Bab III) |
| 3 | Hananto, Haryadi, Nour, Hasbi, & Syam (2024) — *JIPI* Vol. 9 No. 3 | Kustomisasi produk 3D (metode konkatenasi elemen berbasis X3DOM) pada media *online* penjualan UMKM, metode *incremental*, UAT Alpha & Beta | Uji Beta pengguna 1752/2000 dan pengelola 219/250 (kategori "Sangat Setuju"); kustomisasi 3D dapat direalisasikan, sederhana, dan terjangkau bagi UMKM | Rujukan utama argumen kelayakan kustomisasi 3D untuk UMKM (Bab I & II.A.5); rujukan model perhitungan skala Likert (Bab III.C.5) |
| 4 | Luthfi & Asmunin — Universitas Negeri Surabaya | Rancang bangun aplikasi pemesanan kaos *custom* berbasis web menggunakan FabricJS (kanvas 2D) dan pembayaran via *Midtrans payment gateway* | Pemesan dapat mendesain & memesan kaos sendiri; admin memantau & memanajemeni pesanan; **masih berbasis kanvas 2D, belum 3D** | Menjadi pembanding langsung yang menunjukkan *gap* teknologi (2D vs 3D) — dasar utama kebaruan penelitian ini (Bab I & II.C) |
| 5 | Hamzaturrazak, Jabbar, Perdana, & Pinandito (2024) — *JTIIK* Vol. 11 No. 5 | Analisis kinerja *rendering* objek 3D di web (WebGL vs GLSL vs *native*), uji Shapiro-Wilk & Wilcoxon | Pada poligon tinggi, GLSL lebih hemat memori (580,32 MB) dibanding WebGL (589 MB); *rendering* 3D layak dijalankan di dalam *browser* tanpa *plugin* | Mendasari argumen kelayakan teknis rendering 3D berbasis browser (Bab II.A.4); rujukan rencana uji performa teknis (Bab III) |
| 6 | Hwangbo, Kim, Lee, & Jang (2020) — *IEEE Access* Vol. 8 | Analisis data transaksi nyata toko fesyen *online* ber-fitur *3D virtual try-on*, dilengkapi wawancara kualitatif | Rata-rata penjualan per pelanggan naik; tingkat retur turun 27% karena ketidaksesuaian ukuran/bentuk tersaring lebih awal | Bukti empiris internasional bahwa pratinjau 3D menekan salah persepsi dan potensi retur (Bab I & II.A.2) |
| 7 | Kim, Baek, & Yoon (2020) — *Journal of Retailing and Consumer Services* Vol. 55 | Tiga eksperimen membandingkan citra produk putar 360° dengan gambar statis 2D pada situs ritel | Niat beli (*purchase intention*) lebih tinggi pada tampilan putar 360°; efek dimediasi oleh kejelasan sensoris (*sensory vividness*), dan melemah pada konsumen dengan beban kognitif tinggi | Bukti empiris internasional bahwa interaksi 360° meningkatkan niat beli (Bab I & II.A.2); dasar argumen kebutuhan navigasi *orbit* 3D yang mudah pada Studio 3D |

### Posisi dan Kebaruan Penelitian (Research Gap)

Ketujuh penelitian di atas secara konsisten membuktikan bahwa visualisasi dan kustomisasi produk berbasis 3D meningkatkan kualitas informasi, pengalaman pelanggan, dan niat beli, serta menurunkan tingkat retur pada *e-commerce*. Namun, visualisasi dan kustomisasi 3D pada penelitian-penelitian tersebut baru diterapkan pada produk mebel (Surahman dkk., 2020; Hananto dkk., 2021, 2024) dan *e-marketplace*/fesyen skala besar (Hwangbo dkk., 2020; Kim dkk., 2020), menggunakan teknologi *Declarative 3D* (X3DOM) atau *Imperative 3D* murni (WebGL/GLSL); sementara aplikasi pemesanan kaos *custom* berbasis web yang telah ada (Luthfi & Asmunin) masih menggunakan kanvas 2D (FabricJS), belum menggabungkan visualisasi 3D interaktif ke dalam alur pemesanannya. Penelitian ini memposisikan diri untuk mengisi kekosongan tersebut dengan menggabungkan **visualisasi dan kustomisasi 3D interaktif** (*3D interactive mockup*) **ke dalam satu alur *e-commerce* yang utuh** (mulai dari kustomisasi desain, konfirmasi, hingga pembayaran), diimplementasikan menggunakan pendekatan kerangka kerja web modern (*Next.js* + *React Three Fiber*/*Three.js*), pada konteks objek penelitian yang spesifik yaitu **UMKM sablon kaos di Kota Makassar** — sebuah kombinasi konteks objek, cakupan fitur, dan pendekatan teknologi implementasi yang belum ditemukan pada ketujuh penelitian terdahulu.

`[[ISI:BAB2-TABEL-PERBANDINGAN-FITUR]]`

## C. Kerangka Berpikir

Kerangka berpikir penelitian ini disusun mengikuti alur logika sebab-akibat sebagai berikut, dan sebaiknya divisualisasikan dalam bentuk bagan/diagram pada naskah akhir.

1. **Kondisi ideal (harapan):** UMKM Kaos Kami dapat melayani pemesanan sablon kustom secara daring dengan pratinjau desain yang akurat, sehingga pertumbuhan trafik kunjungan sebanding dengan pertumbuhan transaksi, konversi penjualan tinggi dan stabil, serta kanal penjualan mandiri yang minim potongan biaya pihak ketiga.
2. **Kondisi nyata (fakta):** Etalase *marketplace* UMKM Kaos Kami hanya berisi desain siap pakai; pesanan kustom masih dikomunikasikan manual lewat *chat* pribadi; trafik kunjungan tumbuh 86,8% namun pesanan hanya tumbuh 37,5% (konversi 4,81%); kanal penjualan sepenuhnya bergantung pada *marketplace* berpotongan biaya hingga 20%.
3. **Kesenjangan (*gap*):** Ketimpangan antara pertumbuhan trafik dan pertumbuhan transaksi, serta ketiadaan media visualisasi pratinjau desain yang presisi sebelum pemesanan.
4. **Landasan teori dan bukti empiris:** Tujuh penelitian terdahulu membuktikan bahwa visualisasi dan kustomisasi 3D interaktif dapat meningkatkan kualitas informasi, pengalaman pelanggan, niat beli, dan menurunkan tingkat retur; sementara aplikasi kaos *custom* yang ada masih terbatas pada kanvas 2D.
5. **Solusi yang ditawarkan:** Rancang bangun sistem *e-commerce* berbasis *3D interactive mockup* yang mengintegrasikan pratinjau 3D interaktif, alur pemesanan otomatis, dan pembayaran daring dalam satu sistem, dikembangkan melalui metode Penelitian dan Pengembangan (R&D).
6. **Hasil yang diharapkan:** Sistem yang valid (menurut ahli), diterima dengan baik (menurut pengguna), dan berkontribusi terhadap optimalisasi proses pemesanan (meningkatnya kemudahan, akurasi, dan potensi konversi) pada UMKM Kaos Kami.

```
[Kondisi Ideal]              [Kondisi Nyata/Fakta]
      |                              |
      +-------------> [GAP] <--------+
                        |
        [Kajian Teori & Penelitian Terdahulu]
                        |
     [Solusi: E-Commerce Berbasis 3D Interactive
              Mockup - Metode R&D]
                        |
       [Validasi Ahli -> Uji Coba Produk -> Revisi]
                        |
     [Produk Akhir: Sistem Teruji Valid & Diterima
        -> Optimalisasi Pemesanan UMKM Kaos Kami]
```

## D. Hipotesis Penelitian

Penelitian dan pengembangan (R&D) pada dasarnya bersifat deskriptif-evaluatif dan tidak dimaksudkan untuk menguji hubungan sebab-akibat antarvariabel sebagaimana penelitian kuantitatif, sehingga **hipotesis penelitian tidak diperlukan** dalam penelitian ini. Sebagai gantinya, keberhasilan pengembangan diukur melalui tingkat validitas (penilaian ahli) dan tingkat penerimaan/efektivitas (penilaian pengguna) sebagaimana akan dijelaskan pada Bab III.

---

# BAB III
# METODE PENELITIAN DAN PENGEMBANGAN

## A. Model Penelitian dan Pengembangan

Penelitian ini menggunakan metode **Penelitian dan Pengembangan** (*Research and Development*/R&D). Menurut Sugiyono (2019), metode penelitian dan pengembangan adalah metode penelitian yang digunakan untuk menghasilkan produk tertentu, sekaligus menguji keefektifan produk tersebut. Model pengembangan yang digunakan sebagai kerangka acuan adalah **model prosedural Sugiyono** yang terdiri atas sepuluh langkah: (1) potensi dan masalah, (2) pengumpulan data, (3) desain produk, (4) validasi desain, (5) revisi desain, (6) uji coba produk, (7) revisi produk, (8) uji coba pemakaian, (9) revisi produk, dan (10) produksi masal.

Sejalan dengan kelaziman pada penelitian dan pengembangan berskala skripsi — sebagaimana juga ditempuh oleh sejumlah penelitian sejenis yang menyesuaikan sepuluh langkah Sugiyono dengan keterbatasan waktu, tenaga, dan biaya — penelitian ini **mengadaptasi langkah kesatu sampai kesembilan**, dan **tidak melaksanakan langkah kesepuluh (produksi masal)** dengan pertimbangan bahwa produk yang dihasilkan berupa sistem perangkat lunak berbasis web yang didistribusikan melalui publikasi/*deployment* daring, bukan produk fisik yang memerlukan tahapan produksi massal dalam pengertian manufaktur konvensional.

Untuk tahapan teknis pengembangan produk (langkah 3 dan 6 pada model Sugiyono, yaitu desain produk dan pengembangan produk awal), penelitian ini memadukan model Sugiyono dengan **metode *Prototyping*** sebagai metode pengembangan sistem/perangkat lunak. Pemilihan metode *Prototyping* didasarkan pada beberapa pertimbangan:

1. Metode ini memungkinkan produk fungsional (prototipe) untuk dapat segera diuji dan digunakan pengguna sejak tahap awal, sejalan dengan prinsip R&D yang menuntut adanya produk nyata untuk divalidasi dan diujicobakan — bukan sekadar rancangan konseptual.
2. Pengembang bertindak sebagai pengembang tunggal (*solo developer*), sehingga metode yang menuntut kolaborasi tim besar seperti *Extreme Programming* (sebagaimana digunakan Surahman dkk., 2020) atau pembagian tugas ketat model *incremental* multi-anggota (Hananto dkk., 2024) kurang relevan diterapkan secara penuh.
3. Sifat *Prototyping* yang iteratif (membangun purwarupa → mendapat umpan balik → menyempurnakan) selaras dengan siklus "desain → validasi → revisi → uji coba → revisi" pada model Sugiyono.
4. Produk penelitian ini pada dasarnya telah mencapai tahap **purwarupa fungsional yang telah dipublikasikan** (*live prototype*) pada domain **kaoskami.biz.id**, sehingga metode Prototyping merepresentasikan proses pengembangan yang benar-benar ditempuh peneliti secara akurat.

`[[ISI:BAB3-PROSES-PENGEMBANGAN-PRODUK-AWAL]]`

## B. Prosedur Penelitian dan Pengembangan

Prosedur penelitian dan pengembangan yang ditempuh dalam penelitian ini dijabarkan sebagai berikut.

### 1. Potensi dan Masalah

Tahap ini telah diuraikan secara rinci pada Bab I Latar Belakang Masalah, mencakup potensi besar sektor UMKM pakaian jadi di Indonesia dan Kota Makassar, serta masalah keterbatasan visualisasi dan kustomisasi produk pada media penjualan *online* UMKM Kaos Kami yang berdampak pada rendahnya konversi penjualan (4,81%) di tengah tingginya pertumbuhan trafik kunjungan (86,8%).

### 2. Pengumpulan Data

Pengumpulan data pada tahap ini dilakukan melalui:

a. **Observasi**, terhadap proses produksi dan alur pemesanan yang berjalan di UMKM Kaos Kami (Jl. Galangan Kapal, Tallo, Makassar), meliputi proses sablon manual (beli kaos polos → cetak desain DTF → sablon *heat press* → kemas → kirim) dan pola komunikasi pemesanan via WhatsApp.

b. **Wawancara**, dengan pemilik UMKM Kaos Kami untuk menggali kebutuhan, kendala operasional, dan harapan terhadap sistem baru.

c. **Dokumentasi**, berupa data kinerja toko dari *dashboard* penjual Shopee (data pengunjung, pesanan, dan konversi bulan berjalan vs. bulan sebelumnya) serta dokumentasi etalase produk yang tayang di *marketplace*.

d. **Studi literatur**, terhadap tujuh penelitian terdahulu (nasional dan internasional) sebagaimana dipaparkan pada Bab II, sebagai dasar penentuan spesifikasi fitur dan pendekatan teknologi yang akan digunakan.

### 3. Desain Produk

Berdasarkan hasil analisis kebutuhan pada tahap sebelumnya, dirancang spesifikasi produk sebagai berikut (dijabarkan lebih rinci pada Bab I bagian D):

a. Rancangan arsitektur sistem (front-end, integrasi 3D, dan alur data).
b. Rancangan struktur/peta situs (*sitemap*) dan alur pengguna (*user flow*) mulai dari kustomisasi hingga pembayaran.
c. Rancangan antarmuka (UI/UX) untuk modul Studio 3D, katalog, keranjang, checkout, dan pelacakan pesanan.
d. Penentuan teknologi implementasi: kerangka kerja *Next.js* untuk aplikasi web, *Three.js*/*React Three Fiber* untuk *rendering* 3D, serta integrasi gerbang pembayaran (*payment gateway*) untuk transaksi daring.

`[[ISI:BAB3-ARSITEKTUR-SISTEM]]`

`[[ISI:BAB3-STRUKTUR-DATA]]`

`[[ISI:BAB3-PETA-SITUS-DAN-FITUR]]`

`[[ISI:BAB3-ALUR-KUSTOMISASI-3D]]`

### 4. Validasi Desain

Rancangan produk yang telah disusun selanjutnya divalidasi oleh ahli (*expert judgment*) sebelum dikembangkan menjadi produk fungsional, guna memperoleh masukan awal terhadap kesesuaian rancangan dengan kebutuhan bisnis maupun kelayakan teknis. Validasi dilakukan oleh minimal dua kategori ahli:

a. **Ahli Materi/Bisnis** — dosen bidang bisnis digital/manajemen pemasaran atau praktisi UMKM, untuk menilai kesesuaian alur bisnis, relevansi fitur dengan kebutuhan optimalisasi pemesanan, dan kejelasan informasi produk.

b. **Ahli Media/Sistem** — dosen atau praktisi bidang sistem informasi/pengembangan web, untuk menilai kelayakan teknis, antarmuka pengguna, dan fungsionalitas fitur 3D interaktif.

Instrumen validasi ahli disusun dalam bentuk angket berskala Likert (1–5) sebagaimana dijelaskan pada bagian C.4.

### 5. Revisi Desain

Rancangan produk diperbaiki berdasarkan masukan, kritik, dan saran yang diperoleh dari proses validasi ahli pada tahap sebelumnya, sebelum dilanjutkan ke tahap pengembangan produk.

### 6. Pengembangan Produk Awal (Uji Coba Produk Tahap I)

Pada tahap ini, rancangan yang telah divalidasi dan direvisi dikembangkan menjadi produk/purwarupa fungsional menggunakan metode *Prototyping* sebagaimana dijelaskan pada bagian A. Produk kemudian diujicobakan secara terbatas (*uji lapangan terbatas*) untuk memastikan seluruh fungsi utama berjalan sesuai rancangan sebelum diujicobakan kepada pengguna yang lebih luas. Pengujian teknis pada tahap ini mencakup pengujian fungsional (*black-box testing*) terhadap setiap fitur dan pengujian kompatibilitas lintas perangkat/*browser*.

`[[ISI:BAB3-SPESIFIKASI-KEBUTUHAN-SISTEM]]`

`[[ISI:BAB3-RENCANA-UJI-TEKNIS]]`

### 7. Revisi Produk

Produk diperbaiki berdasarkan temuan pada uji coba produk tahap I, baik dari aspek fungsional (*bug*/kesalahan fungsi) maupun aspek non-fungsional (kinerja, tampilan, kemudahan penggunaan).

### 8. Uji Coba Pemakaian (Uji Coba Produk Tahap II)

Produk yang telah direvisi selanjutnya diujicobakan kepada subjek uji coba yang lebih luas — mencakup pemilik UMKM Kaos Kami sebagai pengelola dan sejumlah calon konsumen sebagai pengguna/pengunjung — menggunakan metode *User Acceptance Test* (UAT) melalui uji Alpha dan uji Beta, mengikuti pola yang ditempuh Hananto dkk. (2021, 2024). Uji Alpha dilakukan dalam lingkungan terkendali oleh peneliti bersama perwakilan mitra UMKM untuk memverifikasi kesesuaian fungsi dengan rancangan; uji Beta dilakukan dalam lingkungan penggunaan nyata (produk telah dipublikasikan secara daring) oleh pengguna di luar tim pengembang.

### 9. Revisi Produk Akhir

Produk disempurnakan kembali berdasarkan hasil uji coba pemakaian sebelum ditetapkan sebagai produk akhir penelitian.

### 10. Produksi Masal *(tidak dilaksanakan)*

Sebagaimana dijelaskan pada Bab I bagian F (Keterbatasan Penelitian), tahap ini tidak dilaksanakan karena karakteristik produk berupa sistem perangkat lunak berbasis web yang telah didistribusikan melalui publikasi daring pada domain kaoskami.biz.id, sehingga konsep "produksi masal" pada konteks perangkat lunak setara dengan ketersediaan produk yang dapat diakses secara terus-menerus oleh siapa pun tanpa perlu proses reproduksi fisik bertahap.

```
Potensi & Masalah -> Pengumpulan Data -> Desain Produk -> Validasi Desain (Ahli)
        -> Revisi Desain -> Pengembangan Produk Awal (Prototyping) & Uji Coba Terbatas
        -> Revisi Produk -> Uji Coba Pemakaian (UAT Alpha & Beta) -> Revisi Produk Akhir
        -> [Produksi Masal: TIDAK DILAKSANAKAN - lihat keterbatasan penelitian]
```

## C. Uji Coba Produk

### 1. Desain Uji Coba

Uji coba produk dalam penelitian ini menggunakan metode ***User Acceptance Test* (UAT)** yang terdiri atas dua tahap pengujian:

a. **Uji Alpha**, yaitu pengujian fungsional (*black-box testing*) yang dilakukan dalam lingkungan terkendali oleh peneliti bersama perwakilan mitra (pemilik UMKM Kaos Kami), untuk memverifikasi bahwa setiap fitur utama sistem — Studio 3D (kustomisasi, unggah desain, perubahan warna/ukuran, navigasi *orbit* 360°), katalog, keranjang belanja, checkout, pembayaran, dan pelacakan pesanan — berfungsi sesuai rancangan.

b. **Uji Beta**, yaitu pengujian penerimaan pengguna yang dilakukan pada lingkungan penggunaan nyata (produk telah dipublikasikan secara daring), melibatkan dua kelompok responden: (1) kelompok pengelola (pemilik UMKM Kaos Kami), dan (2) kelompok pengguna/pengunjung (calon konsumen).

### 2. Subjek Uji Coba

| Kelompok | Peran | Jumlah (indikatif) |
|---|---|---|
| Ahli Materi/Bisnis | Validasi kesesuaian bisnis & UMKM | 1 orang (dosen/praktisi) |
| Ahli Media/Sistem | Validasi kelayakan teknis & UI/UX | 1 orang (dosen/praktisi) |
| Pengelola | Pemilik UMKM Kaos Kami | 1–2 orang |
| Pengguna/Pengunjung | Calon konsumen (mahasiswa/masyarakat umum segmen komunitas & anak muda) | Menyesuaikan arahan pembimbing (jurnal acuan Hananto dkk. menggunakan 20 responden pengguna) |

*Catatan: jumlah dan kriteria pemilihan subjek uji coba (mis. teknik convenience sampling/purposive sampling) sebaiknya dikonfirmasi ke pembimbing metodologi sesuai kelaziman skripsi Bisnis Digital UNM.*

### 3. Jenis Data

Penelitian ini menggunakan dua jenis data:

a. **Data kualitatif**, berupa deskripsi hasil observasi, wawancara, catatan validasi ahli, serta komentar/masukan terbuka dari responden uji coba.

b. **Data kuantitatif**, berupa skor angket berskala Likert dari hasil validasi ahli dan uji coba pemakaian, serta data kinerja bisnis (jumlah kunjungan, pesanan, dan tingkat konversi) sebagai pembanding sebelum dan sesudah penerapan sistem.

### 4. Instrumen Pengumpulan Data

Instrumen yang digunakan dalam penelitian ini meliputi:

a. **Pedoman observasi** dan **pedoman wawancara** (tahap pengumpulan data awal).

b. **Angket validasi ahli** berskala Likert 1–5 (Sangat Tidak Setuju/Sangat Tidak Layak s.d. Sangat Setuju/Sangat Layak), untuk menilai kelayakan produk dari aspek bisnis dan aspek teknis.

c. **Angket uji coba pemakaian (UAT)** berskala Likert 1–5 (Sangat Tidak Setuju s.d. Sangat Setuju), mengadaptasi pola instrumen Hananto dkk. (2021, 2024) yang menggunakan lima pilihan sikap ("Sangat Tidak Setuju", "Tidak Setuju", "Tidak Tahu", "Setuju", "Sangat Setuju") dengan skor 1–5.

**Kisi-kisi instrumen (draf awal — lengkapi dan sesuaikan dengan fitur riil produk):**

| Aspek | Indikator (contoh) |
|---|---|
| Fungsi & Fitur | Kemudahan mengakses Studio 3D; ketepatan hasil unggah desain pada model 3D; kelancaran navigasi orbit 360° |
| Tampilan/UI | Kejelasan tata letak; kesesuaian warna & tipografi; keterbacaan informasi produk |
| Kinerja | Kecepatan memuat model 3D; kestabilan aplikasi saat digunakan pada perangkat mobile |
| Kepercayaan & Kepuasan | Keyakinan terhadap hasil akhir produk yang akan diterima; kepuasan dibanding melihat foto/video biasa |
| Proses Transaksi | Kemudahan checkout; kejelasan metode pembayaran; kemudahan pelacakan pesanan |

`[[ISI:BAB3-INSTRUMEN-KISI-KISI]]`

### 5. Teknik Analisis Data

Data kuantitatif hasil angket dianalisis menggunakan **Skala Likert**, mengikuti prosedur perhitungan sebagaimana diterapkan oleh Hananto dkk. (2021, 2024), dengan langkah sebagai berikut.

Diketahui: *b* = skor terendah, *a* = skor tertinggi, *t* = jumlah responden, *p* = jumlah pernyataan, dengan:

- **Skor Minimal (mn)** = t × p × b
- **Skor Maksimal (ml)** = t × p × a
- **Median (md)** = (ml + mn) / 2
- **Kuartil 1 (k1)** = (mn + md) / 2
- **Kuartil 3 (k3)** = (ml + md) / 2

Kategori sikap ditentukan berdasarkan jangkauan nilai berikut:

| Kategori | Batas Skor |
|---|---|
| Sangat Setuju (SS) | Kuartil 3 ≤ n ≤ Skor Maksimal |
| Setuju (S) | Median ≤ n < Kuartil 3 |
| Tidak Setuju (TS) | Kuartil 1 ≤ n < Median |
| Sangat Tidak Setuju (STS) | Skor Minimal ≤ n < Kuartil 1 |

Skor total hasil angket kemudian diposisikan pada jangkauan nilai tersebut untuk menentukan tingkat penerimaan/kelayakan produk secara keseluruhan. Adapun data kualitatif (hasil wawancara, observasi, dan komentar terbuka responden) dianalisis secara deskriptif untuk memperkaya dan menginterpretasi temuan kuantitatif.

Sebagai indikator pendukung tambahan yang bersifat kontekstual-bisnis (bukan bagian formal dari skala Likert), penelitian ini juga akan membandingkan data kinerja bisnis UMKM Kaos Kami sebelum dan sesudah penerapan sistem (jumlah kunjungan, jumlah pesanan, dan tingkat konversi) sebagai pelengkap analisis kontribusi produk terhadap optimalisasi pemesanan, sebagaimana disebutkan dalam tujuan penelitian keempat (Bab I.C.4).

## D. Lokasi dan Waktu Penelitian

**Lokasi penelitian:** UMKM Kaos Kami, Jalan Galangan Kapal, Lorong Permandian 1, Kelurahan Kaluku Bodoa, Kecamatan Tallo, Kota Makassar, Provinsi Sulawesi Selatan.

**Waktu penelitian:** `[ISI: rentang bulan pelaksanaan penelitian, mis. bulan X s.d. bulan Y tahun berjalan]`, mencakup tahap pengumpulan data, pengembangan, uji coba, hingga penyusunan laporan.

## E. Objek dan Subjek Penelitian

**Objek penelitian:** Sistem *e-commerce* berbasis *3D interactive mockup* yang dikembangkan untuk UMKM Kaos Kami.

**Subjek penelitian:** Pemilik UMKM Kaos Kami (sebagai pengelola/mitra penelitian) dan calon konsumen (sebagai pengguna/pengunjung sistem).

---

# DAFTAR PUSTAKA

*(Format berikut mengikuti gaya APA yang lazim digunakan pada pedoman skripsi FEB — cross-check gaya sitasi resmi ke pedoman prodi. Lengkapi data yang masih bertanda kurung siku.)*

Fachri, M., & Darmawan, R. (2022). Visualisasi Model 3D Dinamis Berbasis Web Menggunakan WebGL. *Jurnal Syntax Literate*, 7(10), 15300–15310.

Hamzaturrazak, M., Jabbar, A., Perdana, R. S., & Pinandito, A. (2024). Analisis Kinerja Augmented Reality Hypertext Markup Language dengan Pemanfaatan Web Graphics Library dan OpenGL Shading Language untuk Pengembangan 3D. *Jurnal Teknologi Informasi dan Ilmu Komputer (JTIIK)*, 11(5), 1145–1150. https://doi.org/10.25126/jtiik.2024118040

Hananto, M. W., Susilo, H. P., Ahmad, S. N., & Rahman, A. (2021). Visualisasi Produk secara 3D dalam Media Promosi dan Pemesanan Online. *Journal of Information System, Graphics, Hospitality and Technology (INSIGHT)*, 3(1), 1–8. https://doi.org/10.37823/insight.v3i01.138

Hananto, M. W., Haryadi, B., Nour, A. A., Hasbi, M. F., & Syam, F. (2024). Kustomisasi Secara 3D Sebagai Layanan Konsumen Pada Media Online Penjualan Produk UMKM. *Jurnal Ilmiah Penelitian dan Pembelajaran Informatika (JIPI)*, 9(3), 1725–1738. https://doi.org/10.29100/jipi.v9i3.6556

Hwangbo, H., Kim, E. H., Lee, S.-H., & Jang, Y. J. (2020). Effects of 3D Virtual "Try-On" on Online Sales and Customers' Purchasing Experiences. *IEEE Access*, 8, 189479–189489. https://doi.org/10.1109/ACCESS.2020.3023040

Kim, S., Baek, T. H., & Yoon, S. (2020). The Effect of 360-Degree Rotatable Product Images on Purchase Intention. *Journal of Retailing and Consumer Services*, 55, 102062. https://doi.org/10.1016/j.jretconser.2020.102062

Luthfi, M., & Asmunin. (t.t.). *Rancang Bangun Aplikasi Pemesanan Kaos Custom Menggunakan Fabric JS dan Pembayaran Melalui Midtrans Payment Gateway*. Universitas Negeri Surabaya.

Surahman, A., Wahyudi, A. D., & Sintaro, S. (2020). Implementasi Teknologi Visual 3D Objek sebagai Media Peningkatan Promosi Produk E-Marketplace. *Jurnal Buana Informatika*, 11(2), 122–130.

Sugiyono. (2019). *Metode Penelitian Pendidikan: Pendekatan Kuantitatif, Kualitatif, dan R&D* [ISI: cek edisi/tahun cetakan terbaru yang tersedia di perpustakaan UNM]. Alfabeta.

Porter, M. E. (1998). *Competitive Advantage: Creating and Sustaining Superior Performance*. Free Press.

Kementerian Koordinator Bidang Perekonomian Republik Indonesia. (2024). *[ISI: judul rilis data UMKM lengkap]*. Diakses dari https://ekon.go.id `[ISI: tanggal akses]`

Kementerian Perindustrian Republik Indonesia. (2025, 17 Maret). *[ISI: judul artikel]*. Kompas.com. `[ISI: URL & tanggal akses]`

Dinas Koperasi dan UKM Kota Makassar. (2024, 7 November). *[ISI: judul artikel]*. ANTARA News. `[ISI: URL & tanggal akses]`

`[ISI: tambahkan referensi UU/PP tentang UMKM, buku teori bisnis digital/e-commerce/digital marketing yang diwajibkan pembimbing, dan buku metodologi penelitian R&D tambahan seperti Borg & Gall bila diperlukan]`

---

## LAMPIRAN (disiapkan menyusul, di luar cakupan Bab I–III)

- Lampiran 1: Pedoman wawancara dan hasil wawancara pemilik UMKM Kaos Kami
- Lampiran 2: Angket validasi ahli
- Lampiran 3: Angket uji coba pemakaian (UAT)
- Lampiran 4: Tangkapan layar (*screenshot*) sistem
- Lampiran 5: Surat izin penelitian
- Lampiran 6: Dokumentasi kegiatan
- Lampiran 7: Riwayat hidup peneliti

---
**— SELESAI DRAF FILE 1 —**
Jangan lupa: setelah semua tag `[[ISI:...]]` diisi memakai hasil dari FILE 2, baca ulang seluruh naskah untuk memastikan alur antar-paragraf tetap nyambung (kadang perlu kalimat penghubung tambahan), lalu konsultasikan ke dosen pembimbing sebelum didaftarkan seminar proposal.
