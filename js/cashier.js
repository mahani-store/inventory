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

// Cek login
window.addEventListener("load", async () => {
  const db = await openDB();
  const isLoggedIn = await db.get("auth", "isLoggedIn");
  if (isLoggedIn?.value !== true) {
    window.location.href = "login.html";
  }
  await loadProducts();
  renderCart();
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

let cart = [];
let lastTransaksi = null;

async function loadProducts() {
  const db = await openDB();
  const products = await db.getAll("products");

  const grid = document.getElementById("productGrid");
  if (!grid) return console.error("Element #productGrid tidak ditemukan");

  grid.innerHTML = products
    .map(
      (p) => `
      <div onclick="addToCart('${p.nama.replace(/'/g, "\\'")}', ${p.harga}, '${(p.varian || "").replace(/'/g, "\\'")}')"
           class="bg-white border rounded-xl p-4 cursor-pointer hover:shadow-lg transition flex flex-col">
        <div class="w-full h-32 bg-gray-200 rounded-lg overflow-hidden mb-2 relative">
          ${
            p.gambar && p.gambar.startsWith("data:image")
              ? `<img src="${p.gambar}" alt="${p.nama}" class="w-full h-full object-cover">`
              : `<div class="flex items-center justify-center h-full text-gray-500 text-xs font-medium">Belum ada foto</div>`
          }
        </div>
        <h3 class="font-semibold">${p.nama}</h3>
        <p class="text-sm text-gray-600">${p.merk || ""} - ${p.varian || "-"}</p>
        <p class="text-lg font-bold text-primary-700 mt-2">Rp ${Number(p.harga).toLocaleString("id-ID")}</p>
        <p class="text-sm text-gray-500">Stok: ${p.stok}</p>
      </div>
    `,
    )
    .join("");
}

function addToCart(nama, harga, varian) {
  const existing = cart.find((item) => item.nama === nama);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ nama, harga: Number(harga), qty: 1, varian });
  }
  renderCart();
}

function updateQty(index, delta) {
  cart[index].qty = Math.max(1, cart[index].qty + delta);
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cartItems");
  if (!container) return console.error("Element #cartItems tidak ditemukan");

  container.innerHTML =
    cart.length === 0
      ? '<p class="text-center text-gray-500 py-10">Keranjang kosong</p>'
      : cart
          .map(
            (item, i) => `
          <div class="flex justify-between items-center py-3 border-b">
            <div>
              <p class="font-medium">${item.nama} ${item.varian ? "- " + item.varian : ""}</p>
              <p class="text-sm text-gray-600">Rp ${item.harga.toLocaleString("id-ID")} x ${item.qty}</p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="updateQty(${i}, -1)" class="px-3 py-1 bg-gray-200 rounded">-</button>
              <span>${item.qty}</span>
              <button onclick="updateQty(${i}, 1)" class="px-3 py-1 bg-gray-200 rounded">+</button>
              <button onclick="removeFromCart(${i})" class="text-red-600">Hapus</button>
            </div>
          </div>
        `,
          )
          .join("");

  const subtotal = cart.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const diskonPersen = Number(document.getElementById("diskon").value) || 0;
  const diskonNominal = subtotal * (diskonPersen / 100);
  const total = subtotal - diskonNominal;

  document.getElementById("subtotal").textContent =
    "Rp " + subtotal.toLocaleString("id-ID");
  document.getElementById("total").textContent =
    "Rp " + Math.round(total).toLocaleString("id-ID");
}

function clearCart() {
  if (confirm("Kosongkan keranjang?")) {
    cart = [];
    renderCart();
    document.getElementById("printSection").classList.add("hidden");
  }
}

document.getElementById("metodeBayar").addEventListener("change", function () {
  const cashSection = document.getElementById("cashPaymentSection");
  if (this.value === "Cash") {
    cashSection.classList.remove("hidden");
    setTimeout(() => document.getElementById("uangDibayarkan").focus(), 100);
  } else {
    cashSection.classList.add("hidden");
    document.getElementById("uangDibayarkan").value = "";
    document.getElementById("kembalian").textContent = "Rp 0";
    document.getElementById("kembalian").className = "text-green-600";
  }
});

document
  .getElementById("uangDibayarkan")
  .addEventListener("input", function () {
    const total = parseRupiah(document.getElementById("total").textContent);
    const dibayarkan = parseFloat(this.value) || 0;
    const kembalian = dibayarkan - total;

    const kembalianEl = document.getElementById("kembalian");
    if (kembalian >= 0) {
      kembalianEl.textContent = "Rp " + kembalian.toLocaleString("id-ID");
      kembalianEl.className = "text-green-600 font-bold";
    } else {
      kembalianEl.textContent =
        "Kurang Rp " + Math.abs(kembalian).toLocaleString("id-ID");
      kembalianEl.className = "text-red-600 font-bold";
    }
  });

function parseRupiah(str) {
  if (!str) return 0;
  return (
    parseFloat(
      str.replace(/Rp\s*/g, "").replace(/\./g, "").replace(/,/g, "."),
    ) || 0
  );
}

async function saveTransaksiAndUpdateStock() {
  const db = await openDB();
  const tx = db.transaction(["transaksi", "products"], "readwrite");

  const transaksi = {
    id: "TX-" + Date.now(),
    tanggal: new Date().toISOString(),
    items: cart.map((item) => ({
      nama: item.nama,
      varian: item.varian,
      qty: item.qty,
      harga: item.harga,
      subtotal: item.harga * item.qty,
    })),
    subtotal: parseRupiah(document.getElementById("subtotal").textContent),
    diskonPersen: Number(document.getElementById("diskon").value) || 0,
    total: parseRupiah(document.getElementById("total").textContent),
    metodeBayar: document.getElementById("metodeBayar").value,
    uangDibayarkan:
      document.getElementById("metodeBayar").value === "Cash"
        ? parseFloat(document.getElementById("uangDibayarkan").value) || 0
        : null,
    status: "completed",
  };

  await tx.objectStore("transaksi").add(transaksi);

  const prodStore = tx.objectStore("products");
  for (const item of cart) {
    const prod = await prodStore.get(item.nama);
    if (prod) {
      prod.stok = Math.max(0, Number(prod.stok || 0) - item.qty);
      await prodStore.put(prod);
    }
  }

  await tx.done;
  return transaksi;
}

async function prosesBayar() {
  if (cart.length === 0) return alert("Keranjang kosong!");

  const metode = document.getElementById("metodeBayar").value;
  let dibayarkan = 0;
  const total = parseRupiah(document.getElementById("total").textContent);

  if (metode === "Cash") {
    dibayarkan =
      parseFloat(document.getElementById("uangDibayarkan").value) || 0;
    if (dibayarkan < total) return alert("Uang dibayarkan kurang!");
  }

  if (confirm("Proses pembayaran?")) {
    try {
      const transaksiBaru = await saveTransaksiAndUpdateStock();

      if (
        !transaksiBaru ||
        !transaksiBaru.items ||
        transaksiBaru.items.length === 0
      ) {
        alert("Gagal menyimpan transaksi! Coba lagi.");
        return;
      }

      let msg = `Pembayaran ${metode} berhasil!\nTotal: ${document.getElementById("total").textContent}`;
      if (metode === "Cash") {
        msg += `\nDibayarkan: Rp ${dibayarkan.toLocaleString("id-ID")}\nKembalian: Rp ${(dibayarkan - total).toLocaleString("id-ID")}`;
      }
      alert(msg);

      // Clear cart & reset form DULU sebelum redirect
      cart = [];
      renderCart();
      document.getElementById("diskon").value = 0;
      document.getElementById("uangDibayarkan").value = "";
      document.getElementById("kembalian").textContent = "Rp 0";

      // Redirect ke halaman struk terakhir
      window.location.href = "recent-receipt.html";
    } catch (error) {
      console.error("Error saat proses bayar:", error);
      alert("Terjadi kesalahan saat menyimpan transaksi. Coba lagi.");
    }
  }
}
