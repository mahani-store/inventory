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

window.addEventListener("load", async () => {
  const db = await idb.openDB("MahaniInventori", 3);
  const isLoggedIn = await db.get("auth", "isLoggedIn");
  if (isLoggedIn?.value !== true) {
    window.location.href = "login.html";
  }
});

async function openDB() {
  return idb.openDB("MahaniInventori", 3, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 3) {
        // Migrasi data lama: tambah hargaPokok = 0 kalau belum ada
        // Buat semua store yang dibutuhkan
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "nama" });
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "nama" });
        }
        if (!db.objectStoreNames.contains("transaksi")) {
          db.createObjectStore("transaksi", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("auth")) {
          db.createObjectStore("auth", { keyPath: "key" });
        }
        if (db.objectStoreNames.contains("products")) {
          const store = transaction.objectStore("products");
          store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const item = cursor.value;
              if (!item.hargaPokok) {
                item.hargaPokok = 0;
                cursor.update(item);
              }
              cursor.continue();
            }
          };
        }
      }
    },
  });
}

async function performSearch() {
  const query = document
    .getElementById("searchNama")
    .value.toLowerCase()
    .trim();
  const resultsDiv = document.getElementById("searchResults");
  const noResults = document.getElementById("noResults");

  resultsDiv.innerHTML =
    '<div class="text-center py-10 text-gray-500">Memuat...</div>';
  noResults.classList.add("hidden");

  try {
    const db = await openDB();
    const products = await db.getAll("products");

    const filtered = products.filter(
      (p) =>
        p.nama?.toLowerCase().includes(query) ||
        (p.merk || "").toLowerCase().includes(query) ||
        (p.varian || "").toLowerCase().includes(query),
    );

    resultsDiv.innerHTML = "";

    if (filtered.length === 0) {
      noResults.classList.remove("hidden");
      return;
    }

    filtered.forEach((p) => {
      const card = document.createElement("div");
      card.className =
        "bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-1";

      // Cek apakah gambar ada dan valid (base64 biasanya mulai dengan 'data:image')
      const gambarSrc =
        p.gambar && p.gambar.startsWith("data:image") ? p.gambar : "";

      let imageHtml = "";
      if (gambarSrc) {
        imageHtml = `<img src="${gambarSrc}" alt="${p.nama}" class="w-full h-full object-cover">`;
      } else {
        imageHtml = `
      <div class="flex items-center justify-center h-full text-gray-500 text-sm font-medium">
        Belum ada foto
      </div>
    `;
      }

      card.innerHTML = `
    <div class="w-full h-48 bg-gray-200 flex items-center justify-center relative">
      ${imageHtml}
    </div>
    <div class="p-4">
      <h3 class="font-bold text-lg">${p.nama}</h3>
      <p class="text-sm text-gray-600">${p.merk || "-"} - ${p.varian || "-"}</p>
      <p class="text-xl font-semibold text-primary-700 mt-2">Rp ${Number(p.harga || 0).toLocaleString("id-ID")}</p>
      <p class="text-sm text-gray-500">Stok: ${p.stok || 0}</p>
      <button onclick="showDetail('${p.nama}')" class="mt-4 w-full bg-primary-700 text-white py-2 rounded-lg hover:bg-primary-800 transition">
        Lihat Detail
      </button>
    </div>
  `;
      resultsDiv.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading products:", err);
    resultsDiv.innerHTML =
      '<p class="text-center text-red-600 py-10">Gagal memuat produk. Coba refresh.</p>';
  }
}

async function showDetail(nama) {
  try {
    const db = await openDB();
    const product = await db.get("products", nama);
    if (!product) return alert("Produk tidak ditemukan");

    document.getElementById("modalTitle").textContent = product.nama;
    document.getElementById("modalContent").innerHTML = `
  <div class="w-full h-64 bg-gray-200 flex items-center justify-center relative mb-4 rounded-lg overflow-hidden">
    ${
      product.gambar && product.gambar.startsWith("data:image")
        ? `<img src="${product.gambar}" alt="${product.nama}" class="w-full h-full object-contain">`
        : `
        <div class="flex items-center justify-center h-full text-gray-500 text-sm font-medium">
          Belum ada foto
        </div>
        <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      `
    }
  </div>
      <p><strong>Merk:</strong> ${product.merk || "-"}</p>
      <p><strong>Varian:</strong> ${product.varian || "-"}</p>
      <p><strong>Harga:</strong> Rp ${Number(product.harga || 0).toLocaleString("id-ID")}</p>
      <p><strong>Stok:</strong> ${product.stok || 0}</p>
      <p><strong>Kategori:</strong> ${product.kategori || "-"}</p>
      <p><strong>Deskripsi:</strong> ${product.deskripsi || "-"}</p>
      <p><strong>SKU:</strong> ${product.sku || "-"}</p>
      <p><strong>Barcode:</strong> ${product.barcode || "-"}</p>
    `;
    document.getElementById("productModal").classList.remove("hidden");
  } catch (err) {
    console.error("Error loading product detail:", err);
    alert("Gagal memuat detail produk.");
  }
}

function closeModal() {
  document.getElementById("productModal").classList.add("hidden");
}

// Real-time search
document.getElementById("searchNama").addEventListener("input", performSearch);

// Tombol Cari (opsional)
document
  .querySelector('button[type="submit"]')
  ?.addEventListener("click", (e) => {
    e.preventDefault();
    performSearch();
  });

// Init
window.addEventListener("load", performSearch);
