const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

if (hamburgerBtn) {
  hamburgerBtn.addEventListener("click", () => {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
  });
}

if (closeSidebar || overlay) {
  const closeMenu = () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  };

  if (closeSidebar) closeSidebar.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", closeMenu);
}

async function openDB() {
  return idb.openDB("MahaniInventori", 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "nama" });
      }
    },
  });
}

async function loadProdukSelect() {
  const db = await openDB();
  const products = await db.getAll("products");

  const select = document.getElementById("produkSelect");
  products.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.nama;
    option.text = `${p.nama} (Stok: ${p.stok || 0}, HPP saat ini: Rp ${(p.hargaPokok || 0).toLocaleString("id-ID")})`;
    select.add(option);
  });
}

async function restockProduk() {
  const nama = document.getElementById("produkSelect").value;
  const qty = Number(document.getElementById("restockQty").value);
  const totalHargaSupplier =
    Number(document.getElementById("totalHargaSupplier").value) || 0;
  const hargaPerUnit =
    Number(document.getElementById("hargaPerUnit").value) || 0;

  if (!nama || qty <= 0) return alert("Pilih produk dan jumlah restock!");

  // Validasi: minimal satu harga diisi
  if (totalHargaSupplier <= 0 && hargaPerUnit <= 0) {
    return alert(
      "Isi salah satu: Harga Total dari Supplier atau Harga Pokok per Unit!",
    );
  }

  let hppBaruPerUnit;
  if (hargaPerUnit > 0) {
    hppBaruPerUnit = hargaPerUnit;
  } else {
    hppBaruPerUnit = totalHargaSupplier / qty;
  }

  const db = await openDB();
  const tx = db.transaction("products", "readwrite");
  const prod = await tx.objectStore("products").get(nama);

  if (prod) {
    const stokLama = Number(prod.stok || 0);
    const hppLama = Number(prod.hargaPokok || 0);
    const stokBaru = stokLama + qty;

    // Hitung HPP rata-rata baru
    const hppRataRata = (stokLama * hppLama + qty * hppBaruPerUnit) / stokBaru;

    prod.stok = stokBaru;
    prod.hargaPokok = hppRataRata;

    await tx.objectStore("products").put(prod);
    await tx.done;

    alert(
      `Restock berhasil!\nStok baru: ${stokBaru}\nHPP rata-rata baru: Rp ${hppRataRata.toFixed(2).toLocaleString("id-ID")}`,
    );
    window.location.reload();
  } else {
    alert("Produk tidak ditemukan!");
  }
}

window.addEventListener("load", loadProdukSelect);
