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

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let sortColumn = "nama";
let sortDirection = "asc";

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

async function loadCategoriesIntoFilter() {
  const db = await openDB();
  const products = await db.getAll("products");

  // Ambil semua kategori yang ada di produk, lalu buat unik
  const categories = [
    ...new Set(
      products.map((p) => p.kategori).filter(Boolean), // hilangkan undefined/null/empty
    ),
  ].sort();

  const select = document.getElementById("filterKategori");
  // Kosongkan dulu selain option pertama
  select.innerHTML = '<option value="">Semua Kategori</option>';

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

async function loadProducts(filterCat = "") {
  const loading = document.getElementById("loading");
  loading.classList.remove("hidden");

  try {
    const db = await openDB();
    let products = await db.getAll("products");

    // Ambil kata kunci dari search bar
    const searchText =
      document.getElementById("searchInput")?.value?.toLowerCase().trim() || "";

    // Filter kategori dulu
    let filtered = filterCat
      ? products.filter((p) => p.kategori === filterCat)
      : products;

    // Lalu filter berdasarkan search (jika ada kata kunci)
    if (searchText) {
      filtered = filtered.filter((p) =>
        [p.nama, p.merk || "", p.varian || ""].some((field) =>
          field.toLowerCase().includes(searchText),
        ),
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA, valB;

      switch (sortColumn) {
        case "kategori":
          valA = (a.kategori || "").toLowerCase();
          valB = (b.kategori || "").toLowerCase();
          break;
        case "nama":
          valA = (a.nama || "").toLowerCase();
          valB = (b.nama || "").toLowerCase();
          break;
        case "merk":
          valA = (a.merk || "").toLowerCase();
          valB = (b.merk || "").toLowerCase();
          break;
        case "varian":
          valA = (a.varian || "").toLowerCase();
          valB = (b.varian || "").toLowerCase();
          break;
        case "hargaPokok":
          valA = Number(a.hargaPokok || 0);
          valB = Number(b.hargaPokok || 0);
          break;
        case "harga":
          valA = Number(a.harga || 0);
          valB = Number(b.harga || 0);
          break;
        case "stok":
          valA = Number(a.stok || 0);
          valB = Number(b.stok || 0);
          break;
        case "sku":
          valA = (a.sku || "").toLowerCase();
          valB = (b.sku || "").toLowerCase();
          break;
        default:
          valA = (a.nama || "").toLowerCase();
          valB = (b.nama || "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    const tableBody = document.getElementById("productTableBody");
    tableBody.innerHTML = "";

    filtered.forEach((p) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td class="px-5 py-3">${p.kategori || "-"}</td>
          <td class="px-5 py-3 font-medium">${p.nama}</td>
          <td class="px-5 py-3">${p.merk || "-"}</td>
          <td class="px-5 py-3">${p.varian || "-"}</td>
          <td class="px-5 py-3 text-right">
        ${p.hargaPokok > 0 ? "Rp " + Number(p.hargaPokok).toLocaleString("id-ID") : "-"}
      </td>
          <td class="px-5 py-3 text-right">
            ${
              p.harga > 0
                ? "Rp " + Number(p.harga || 0).toLocaleString("id-ID")
                : "-"
            }
            </td>
          <td class="px-5 py-3 text-right">${p.stok || 0}</td>
          <td class="px-5 py-3">${p.deskripsi || "-"}</td>
          <td class="px-5 py-3">${p.sku || "-"}</td>
          <td class="px-5 py-3">${p.barcode || "-"}</td>
          <td class="px-5 py-3 text-center space-x-2">
            <button onclick="editProduct('${p.nama}')" class="text-blue-600 hover:text-blue-800">Edit</button>
            <button onclick="deleteProduct('${p.nama}')" class="text-red-600 hover:text-red-800">Hapus</button>
          </td>
        `;
      tableBody.appendChild(row);
    });

    updatePagination(filtered.length);
  } catch (err) {
    console.error("Error loading products:", err);
    document.getElementById("productTableBody").innerHTML =
      '<tr><td colspan="10" class="text-center py-10 text-red-600">Gagal memuat data. Coba refresh.</td></tr>';
  } finally {
    loading.classList.add("hidden");
  }
}

function updatePagination(totalItems) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  document.getElementById("paginationInfo").textContent = `Menampilkan ${
    totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  } - ${Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari ${totalItems} produk`;

  const buttonsDiv = document.getElementById("paginationButtons");
  buttonsDiv.innerHTML = "";

  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "Sebelumnya";
  prev.className = `px-4 py-2 rounded-lg ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-primary-700 text-white hover:bg-primary-800"}`;
  prev.disabled = currentPage === 1;
  prev.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      loadProducts();
    }
  };
  buttonsDiv.appendChild(prev);

  const next = document.createElement("button");
  next.textContent = "Selanjutnya";
  next.className = `px-4 py-2 rounded-lg ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-primary-700 text-white hover:bg-primary-800"}`;
  next.disabled = currentPage === totalPages;
  next.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadProducts();
    }
  };
  buttonsDiv.appendChild(next);
}

async function editProduct(nama) {
  alert(`Edit produk: ${nama} (implementasi nanti)`);
}

async function deleteProduct(nama) {
  if (confirm(`Yakin hapus ${nama}?`)) {
    const db = await openDB();
    const tx = db.transaction("products", "readwrite");
    await tx.objectStore("products").delete(nama);
    await tx.done;
    loadProducts();
  }
}

// Event listeners
document
  .getElementById("searchInput")
  ?.addEventListener("input", () => loadProducts());
document
  .getElementById("filterKategori")
  ?.addEventListener("change", (e) => loadProducts(e.target.value));

document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const column = th.getAttribute("data-sort");
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
    loadProducts(); // reload dengan sorting baru (nanti bisa di-optimasi kalau mau)
  });
});

// Init
window.addEventListener("load", async () => {
  await loadCategoriesIntoFilter();
  await loadProducts();
});
