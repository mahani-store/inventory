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

async function loadCategories() {
  const db = await openDB();
  const categories = await db.getAll("categories");
  const tableBody = document.getElementById("categoryTableBody");
  tableBody.innerHTML = "";

  if (categories.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="2" class="px-6 py-10 text-center text-gray-500 italic">Belum ada kategori. Yuk tambah yang pertama! 📦</td></tr>';
    return;
  }

  categories.forEach((cat) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-blue-100 transition";
    row.innerHTML = `
        <td class="px-6 py-4 text-black">${cat.nama}</td>
        <td class="px-6 py-4 text-right space-x-2">
          <button onclick="editCategory('${cat.nama.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm">Edit</button>
          <button onclick="deleteCategory('${cat.nama.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm">Hapus</button>
        </td>
      `;
    tableBody.appendChild(row);
  });
}

async function addCategory() {
  const form = document.getElementById("addCategoryForm");
  const newCat = document.getElementById("newCategory").value.trim();

  if (!newCat) {
    document.getElementById("error-message").textContent =
      "Nama kategori wajib diisi!";
    document.getElementById("error-message").classList.remove("hidden");
    setTimeout(
      () => document.getElementById("error-message").classList.add("hidden"),
      4000,
    );
    return;
  }

  try {
    const db = await openDB();
    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    // Cek duplikat case-insensitive
    const allCats = await store.getAll();
    const isDuplicate = allCats.some(
      (cat) => cat.nama.toLowerCase() === newCat.toLowerCase(),
    );

    if (isDuplicate) {
      document.getElementById("error-message").textContent =
        "Kategori sudah ada (tidak peduli huruf besar/kecil)!";
      document.getElementById("error-message").classList.remove("hidden");
      setTimeout(
        () => document.getElementById("error-message").classList.add("hidden"),
        4000,
      );
      return;
    }

    await store.add({ nama: newCat });
    await tx.done;

    form.reset();
    document.getElementById("success-message").textContent =
      `Kategori "${newCat}" berhasil ditambahkan!`;
    document.getElementById("success-message").classList.remove("hidden");
    setTimeout(
      () => document.getElementById("success-message").classList.add("hidden"),
      4000,
    );

    loadCategories();
  } catch (err) {
    console.error(err);
    document.getElementById("error-message").textContent =
      "Gagal menambah kategori. Coba lagi.";
    document.getElementById("error-message").classList.remove("hidden");
  }
}

async function editCategory(oldNama) {
  const newNama = prompt("Nama kategori baru:", oldNama);
  if (!newNama || newNama === oldNama) return;

  try {
    const db = await openDB();
    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    // Cek kalau nama baru sudah ada (case-insensitive)
    const allCats = await store.getAll();
    const isDuplicate = allCats.some(
      (cat) =>
        cat.nama.toLowerCase() === newNama.toLowerCase() &&
        cat.nama !== oldNama,
    );

    if (isDuplicate) {
      alert("Nama kategori baru sudah ada (tidak peduli huruf besar/kecil)!");
      return;
    }

    await store.delete(oldNama);
    await store.add({ nama: newNama });
    await tx.done;

    loadCategories();
    document.getElementById("success-message").textContent =
      `Kategori berhasil diubah menjadi "${newNama}"!`;
    document.getElementById("success-message").classList.remove("hidden");
    setTimeout(
      () => document.getElementById("success-message").classList.add("hidden"),
      3000,
    );
  } catch (err) {
    console.error(err);
    alert("Gagal mengedit kategori.");
  }
}

async function deleteCategory(nama) {
  if (!confirm(`Yakin hapus kategori "${nama}"?`)) return;

  try {
    const db = await openDB();
    const tx = db.transaction("categories", "readwrite");
    await tx.objectStore("categories").delete(nama);
    await tx.done;

    loadCategories();
    document.getElementById("success-message").textContent =
      `Kategori "${nama}" berhasil dihapus!`;
    document.getElementById("success-message").classList.remove("hidden");
    setTimeout(
      () => document.getElementById("success-message").classList.add("hidden"),
      3000,
    );
  } catch (err) {
    console.error(err);
    alert("Gagal menghapus kategori.");
  }
}

// Init
window.addEventListener("load", loadCategories);

// Submit form
document
  .getElementById("addCategoryForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    addCategory();
  });
