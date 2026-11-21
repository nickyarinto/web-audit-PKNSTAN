// ===== Data dan pengaturan =====
let daftarTransaksi = [];
let pewaktuSimulasi = null;
let pewaktuNotif = null;
let indeksBaru = -1; // transaksi yang baru masuk, dipakai buat animasi

const BATAS_NOMINAL = 20000000;
const JAM_KERJA_MULAI = 5;

// bahan buat simulasi
const NAMA_PELAKSANA = ["Budi Santoso", "Siti Rahayu", "Agus Pratama", "Dewi Lestari", "Rizky Ramadhan"];
const DAFTAR_BARANG = [
  "Pembelian ATK kantor",
  "Pembelian laptop dinas",
  "Pembelian kendaraan operasional",
  "Pembelian obat untuk puskesmas",
  "Pembelian meja kursi sekolah negeri",
  "Pembelian alat kebersihan gedung"
];


// ===== Fungsi kecil =====
function rupiah(angka) {
  return "Rp" + angka.toLocaleString("id-ID");
}

function formatJam(jam) {
  return String(jam).padStart(2, "0") + ":00";
}

function acak(batas) {
  return Math.floor(Math.random() * batas);
}

// supaya tulisan dari form tidak dibaca sebagai kode HTML
function amankan(teks) {
  const sementara = document.createElement("div");
  sementara.textContent = teks;
  return sementara.innerHTML;
}

// kalau file logo belum ada, tampilkan kotak kosong bertuliskan LOGO
function logoGagal(gambar) {
  const kotak = document.createElement("div");
  kotak.className = "logo-kosong";
  kotak.textContent = "LOGO";
  gambar.replaceWith(kotak);
}


// ===== Pemeriksaan transaksi =====
// posisi = urutan transaksi di daftar, dipakai buat cari duplikat sebelumnya
function periksa(transaksi, posisi) {
  const temuan = [];

  if (transaksi.nominal > BATAS_NOMINAL) {
    temuan.push({
      judul: "Nominal tidak wajar",
      isi: rupiah(transaksi.nominal) + " melebihi batas wajar " + rupiah(BATAS_NOMINAL) +
           ". Cek apakah ada salah input atau dana yang menumpuk."
    });
  }

  if (transaksi.jam < JAM_KERJA_MULAI) {
    temuan.push({
      judul: "Jam tidak biasa",
      isi: "Terjadi pukul " + formatJam(transaksi.jam) + " (dini hari), di luar jam kerja. Cek siapa yang melakukannya."
    });
  }

  for (let i = 0; i < posisi; i++) {
    const lama = daftarTransaksi[i];
    if (lama.barang === transaksi.barang && lama.nominal === transaksi.nominal) {
      temuan.push({
        judul: "Transaksi duplikat",
        isi: "Barang dan nominalnya sama persis dengan transaksi #" + (i + 1) + ". Bisa jadi dibayar dua kali."
      });
      break;
    }
  }

  return temuan;
}


// ===== Menampilkan daftar =====
function gambarDaftar() {
  let html = "";
  let jumlahCuriga = 0;

  // dari yang terbaru ke yang paling lama
  for (let i = daftarTransaksi.length - 1; i >= 0; i--) {
    const t = daftarTransaksi[i];
    const temuan = periksa(t, i);
    const curiga = temuan.length > 0;
    if (curiga) jumlahCuriga++;

    let kelas = "item";
    if (curiga) kelas += " curiga";
    if (i === indeksBaru) kelas += " baru";

    html += `<div class="${kelas}">`;
    html += `<div class="baris">`;
    html += `<div>`;
    html += `<div class="nama-item">#${i + 1} ${amankan(t.barang)}</div>`;
    html += `<div class="info">Pelaksana: ${amankan(t.pelaksana)}</div>`;
    html += `<div class="info">${rupiah(t.nominal)}, pukul ${formatJam(t.jam)}</div>`;
    html += `</div>`;
    html += curiga
      ? `<span class="status bahaya">Mencurigakan</span>`
      : `<span class="status aman">Aman</span>`;
    html += `</div>`;

    if (curiga) {
      const butir = temuan.map(function (a) {
        return `<li><b>${a.judul}:</b> ${a.isi}</li>`;
      }).join("");
      html += `<div class="alasan"><b>Kenapa mencurigakan?</b><ul>${butir}</ul></div>`;

      if (t.tindak) {
        html += `<div class="aksi"><b>Status: ${t.tindak}</b></div>`;
      } else {
        html += `<div class="aksi">`;
        html += `<button class="polos" onclick="tandai(${i}, 'Sudah dicek')">Sudah dicek</button>`;
        html += `<button onclick="tandai(${i}, 'Diselidiki')">Selidiki</button>`;
        html += `</div>`;
      }
    }

    html += `</div>`;
  }

  if (daftarTransaksi.length === 0) {
    html = `<div class="kosong">Belum ada transaksi tercatat.<br>Isi form di atas, atau klik Simulasi <i>real-time</i>.</div>`;
  }

  document.getElementById("daftar").innerHTML = html;
  document.getElementById("nTotal").textContent = daftarTransaksi.length;
  document.getElementById("nCuriga").textContent = jumlahCuriga;
  document.getElementById("nAman").textContent = daftarTransaksi.length - jumlahCuriga;

  indeksBaru = -1; // animasi cukup sekali
}


// ===== Notifikasi =====
function munculNotif(transaksi, temuan) {
  const kotak = document.getElementById("notif");
  const curiga = temuan.length > 0;

  document.getElementById("notifJudul").textContent = transaksi.pelaksana + " melakukan transaksi";

  let isi = transaksi.barang + " (" + rupiah(transaksi.nominal) + ")";
  if (curiga) {
    isi += ". Mencurigakan: " + temuan.map(function (a) { return a.judul; }).join(", ");
  }
  document.getElementById("notifIsi").textContent = isi;

  // reset kelas dulu supaya animasi bisa mulai dari awal lagi
  kotak.className = curiga ? "curiga" : "aman";
  void kotak.offsetWidth;
  kotak.classList.add("tampil");

  clearTimeout(pewaktuNotif);
  pewaktuNotif = setTimeout(function () {
    kotak.classList.add("keluar");
  }, 2500);
}


// ===== Menambah transaksi =====
function catat(pelaksana, barang, nominal, jam) {
  const baru = { pelaksana: pelaksana, barang: barang, nominal: nominal, jam: jam, tindak: "" };
  daftarTransaksi.push(baru);

  indeksBaru = daftarTransaksi.length - 1;
  const temuan = periksa(baru, indeksBaru);

  gambarDaftar();
  munculNotif(baru, temuan);
}

function kirimForm() {
  const pelaksana = document.getElementById("pelaksana").value.trim();
  const barang = document.getElementById("barang").value.trim();
  const nominal = Number(document.getElementById("nominal").value);
  const jamTeks = document.getElementById("jam").value;
  const jam = Number(jamTeks);

  if (pelaksana === "" || barang === "" || nominal <= 0) {
    alert("Isi nama pelaksana, barang, dan nominal dulu ya.");
    return;
  }
  if (jamTeks === "" || jam < 0 || jam > 23) {
    alert("Jam diisi antara 0 sampai 23 ya.");
    return;
  }

  catat(pelaksana, barang, nominal, jam);

  document.getElementById("pelaksana").value = "";
  document.getElementById("barang").value = "";
  document.getElementById("nominal").value = "";
  document.getElementById("jam").value = "";
}

function tandai(posisi, teks) {
  daftarTransaksi[posisi].tindak = teks;
  gambarDaftar();
}


// ===== Simulasi dan reset =====
function toggleSimulasi() {
  const tombol = document.getElementById("btnSimulasi");

  // kalau sedang jalan, hentikan
  if (pewaktuSimulasi) {
    clearInterval(pewaktuSimulasi);
    pewaktuSimulasi = null;
    tombol.innerHTML = "▶ Simulasi <i>real-time</i>";
    return;
  }

  tombol.textContent = "⏸ Hentikan simulasi";
  pewaktuSimulasi = setInterval(function () {
    const pelaksana = NAMA_PELAKSANA[acak(NAMA_PELAKSANA.length)];
    const barang = DAFTAR_BARANG[acak(DAFTAR_BARANG.length)];

    let nominal = (1 + acak(10)) * 100000;
    if (Math.random() < 0.3) nominal = 25000000 + acak(30000000);

    let jam = 8 + acak(9);
    if (Math.random() < 0.25) jam = acak(5);

    catat(pelaksana, barang, nominal, jam);
  }, 2500);
}

function hapusSemua() {
  daftarTransaksi = [];
  document.getElementById("notif").className = "";
  gambarDaftar();
}

// tampilkan kondisi awal
gambarDaftar();