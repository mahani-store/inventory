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

// Variabel global untuk produk yang sedang dilihat/diedit
let currentProduct = null;

// Fungsi pencarian (real-time + tombol cari)
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
        "bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-1 cursor-pointer";

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
          </div>
        `;

      // Klik kartu untuk buka modal detail
      card.addEventListener("click", () => openProductModal(p.nama));

      resultsDiv.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading products:", err);
    resultsDiv.innerHTML =
      '<p class="text-center text-red-600 py-10">Gagal memuat produk. Coba refresh.</p>';
  }
}

// Buka modal detail/view
async function openProductModal(nama) {
  const db = await openDB();
  const prod = await db.get("products", nama);
  if (!prod) {
    alert("Produk tidak ditemukan!");
    return;
  }

  currentProduct = prod;
  document.getElementById("modalTitle").textContent = prod.nama;

  showViewMode(prod);
  document.getElementById("productModal").classList.remove("hidden");
}

// Mode View (detail)
function showViewMode(prod) {
  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="w-full h-64 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
        ${
          prod.gambar && prod.gambar.startsWith("data:image")
            ? `<img src="${prod.gambar}" alt="${prod.nama}" class="w-full h-full object-contain">`
            : `
              <div class="text-center text-gray-500">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="mt-2">Belum ada foto</p>
              </div>
            `
        }
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Merk</label>
          <p class="mt-1 text-gray-900">${prod.merk || "-"}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Varian</label>
          <p class="mt-1 text-gray-900">${prod.varian || "-"}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Kategori</label>
          <p class="mt-1 text-gray-900">${prod.kategori || "-"}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Harga Jual</label>
          <p class="mt-1 text-gray-900">Rp ${Number(prod.harga || 0).toLocaleString("id-ID")}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Stok</label>
          <p class="mt-1 text-gray-900">${prod.stok || 0}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">SKU</label>
          <p class="mt-1 text-gray-900">${prod.sku || "-"}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Barcode</label>
          <p class="mt-1 text-gray-900">${prod.barcode || "-"}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Deskripsi</label>
          <p class="mt-1 text-gray-900">${prod.deskripsi || "-"}</p>
        </div>
      </div>
    </div>
  `;

  const actions = document.getElementById("modalActions");
  actions.innerHTML = `
    <button onclick="editProduct()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
      Edit Produk
    </button>
    <button onclick="closeModal()" class="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">
      Tutup
    </button>
  `;
}

// Mode Edit
function editProduct() {
  const prod = currentProduct;

  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <form id="editForm" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700">Nama Produk *</label>
        <input type="text" id="editNama" value="${prod.nama}" class="w-full p-3 border rounded" required />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Merk</label>
        <input type="text" id="editMerk" value="${prod.merk || ""}" class="w-full p-3 border rounded" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Varian</label>
        <input type="text" id="editVarian" value="${prod.varian || ""}" class="w-full p-3 border rounded" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Kategori</label>
        <input type="text" id="editKategori" value="${prod.kategori || ""}" class="w-full p-3 border rounded" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Harga Jual *</label>
        <input type="number" id="editHarga" value="${prod.harga || 0}" class="w-full p-3 border rounded" required min="0" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Stok</label>
        <input type="number" id="editStok" value="${prod.stok || 0}" class="w-full p-3 border rounded" min="0" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Deskripsi</label>
        <textarea id="editDeskripsi" class="w-full p-3 border rounded" rows="3">${prod.deskripsi || ""}</textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">SKU</label>
        <input type="text" id="editSku" value="${prod.sku || ""}" class="w-full p-3 border rounded" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Barcode</label>
        <input type="text" id="editBarcode" value="${prod.barcode || ""}" class="w-full p-3 border rounded" />
      </div>

      <!-- Fitur Edit Foto -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Foto Produk (opsional)</label>
        <input type="file" id="editGambarInput" accept="image/*" class="w-full p-3 border rounded mt-1" />
        <p class="text-xs text-gray-500 mt-1">Maks 5MB (JPG/PNG). Kosongkan untuk tetap pakai foto lama.</p>

        <!-- Preview foto baru atau lama -->
        <div id="editImagePreview" class="mt-4 hidden">
          <img id="editPreviewImg" class="w-full max-h-64 object-contain rounded-lg border border-gray-300" alt="Preview foto produk" />
        </div>

        <!-- Tombol hapus foto (jika ada foto lama) -->
        ${
          prod.gambar && prod.gambar.startsWith("data:image")
            ? `<button type="button" onclick="removeCurrentImage()" class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                Hapus Foto Saat Ini
              </button>`
            : ""
        }
      </div>
    </form>
  `;

  const actions = document.getElementById("modalActions");
  actions.innerHTML = `
    <button onclick="saveEdit()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
      Simpan Perubahan
    </button>
    <button onclick="showViewMode(currentProduct)" class="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">
      Batal
    </button>
  `;

  // Preview foto baru saat upload
  const gambarInput = document.getElementById("editGambarInput");
  gambarInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran gambar maksimal 5MB!");
        this.value = "";
        document.getElementById("editImagePreview").classList.add("hidden");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (ev) {
        const preview = document.getElementById("editImagePreview");
        const img = document.getElementById("editPreviewImg");
        img.src = ev.target.result;
        preview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      document.getElementById("editImagePreview").classList.add("hidden");
    }
  });
}

// Hapus foto saat ini (set ke kosong)
function removeCurrentImage() {
  if (confirm("Yakin hapus foto produk ini?")) {
    currentProduct.gambar = ""; // hapus base64
    alert("Foto akan dihapus saat simpan perubahan.");
  }
}

// Simpan edit ke IndexedDB
async function saveEdit() {
  const nama = document.getElementById("editNama").value.trim();
  if (!nama) {
    alert("Nama produk wajib diisi!");
    return;
  }

  let gambar = currentProduct.gambar || ""; // default foto lama

  // Kalau ada file baru diupload
  const gambarInput = document.getElementById("editGambarInput");
  const file = gambarInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      gambar = e.target.result; // base64 baru
      await doSave(nama, gambar);
    };
    reader.readAsDataURL(file);
  } else {
    // Tidak ada file baru → pakai lama (atau kosong kalau sudah dihapus)
    await doSave(nama, gambar);
  }
}

// Fungsi simpan sebenarnya (dipisah supaya bisa await reader)
async function doSave(nama, gambar) {
  const updatedProd = {
    nama,
    merk: document.getElementById("editMerk").value.trim(),
    varian: document.getElementById("editVarian").value.trim(),
    kategori: document.getElementById("editKategori").value.trim(),
    harga: Number(document.getElementById("editHarga").value) || 0,
    stok: Number(document.getElementById("editStok").value) || 0,
    deskripsi: document.getElementById("editDeskripsi").value.trim(),
    sku: document.getElementById("editSku").value.trim(),
    barcode: document.getElementById("editBarcode").value.trim(),
    gambar, // base64 baru atau lama
  };

  try {
    const db = await openDB();
    const tx = db.transaction("products", "readwrite");
    await tx.objectStore("products").put(updatedProd);
    await tx.done;

    alert("Produk berhasil diupdate!");
    closeModal();
    performSearch(); // refresh hasil pencarian
  } catch (err) {
    console.error("Gagal update produk:", err);
    alert("Gagal menyimpan perubahan. Coba lagi.");
  }
}

function closeModal() {
  document.getElementById("productModal").classList.add("hidden");
  currentProduct = null;
}

// Real-time search
document.getElementById("searchNama").addEventListener("input", performSearch);

// Tombol Cari (opsional, kalau mau manual)
document
  .querySelector('button[type="submit"]')
  ?.addEventListener("click", (e) => {
    e.preventDefault();
    performSearch();
  });

// Init pencarian saat load
window.addEventListener("load", performSearch);
