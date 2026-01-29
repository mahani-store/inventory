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

// Autocomplete nama produk
async function setupProductSuggestions(input, dropdown) {
  const db = await openDB();
  const products = await db.getAll("products");

  const uniqueNames = [
    ...new Set(products.map((p) => p.nama?.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  input.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    dropdown.innerHTML = "";
    dropdown.classList.add("hidden");

    if (query.length < 1) return;

    const filtered = uniqueNames.filter((name) =>
      name.toLowerCase().includes(query),
    );

    if (filtered.length > 0) {
      filtered.forEach((name) => {
        const item = document.createElement("div");
        item.className = "px-4 py-2 cursor-pointer hover:bg-gray-100";
        item.textContent = name;
        item.addEventListener("click", async () => {
          input.value = name;
          dropdown.classList.add("hidden");
          const prod = await db.get("products", name);
          if (prod) {
            input.closest("tr").querySelector(".harga").value = prod.harga || 0;
            updateSubtotal(input.closest("tr"));
          }
        });
        dropdown.appendChild(item);
      });
      dropdown.classList.remove("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// Hitung subtotal per baris
function updateSubtotal(row) {
  const qty = Number(row.querySelector(".qty").value) || 0;
  const harga = Number(row.querySelector(".harga").value) || 0;
  row.querySelector(".subtotal").value = (qty * harga).toLocaleString("id-ID");
  updateTotal();
}

// Hitung total semua baris + diskon nominal
function updateTotal() {
  let subtotal = 0;
  document.querySelectorAll(".subtotal").forEach((sub) => {
    subtotal += Number(sub.value.replace(/\./g, "")) || 0;
  });

  const diskonNominal =
    Number(document.getElementById("diskonNominal").value) || 0;

  // Validasi diskon tidak boleh lebih dari subtotal
  if (diskonNominal > subtotal) {
    alert("Diskon tidak boleh melebihi subtotal!");
    document.getElementById("diskonNominal").value = subtotal;
    return;
  }

  const total = subtotal - diskonNominal;
  document.getElementById("total").value = total.toLocaleString("id-ID");
}

// Init semua fitur
window.addEventListener("load", async () => {
  const db = await openDB();

  // Setup autocomplete untuk baris pertama
  const firstRow = document.querySelector(".product-row");
  await setupProductSuggestions(
    firstRow.querySelector(".namaProduk"),
    firstRow.querySelector(".productDropdown"),
  );

  // Event listener qty/harga per baris (delegation)
  document.getElementById("productTable").addEventListener("input", (e) => {
    const target = e.target;
    const row = target.closest("tr");
    if (!row) return;

    if (
      target.classList.contains("qty") ||
      target.classList.contains("harga")
    ) {
      updateSubtotal(row);
    }
  });

  // Event diskon nominal
  document
    .getElementById("diskonNominal")
    .addEventListener("input", updateTotal);

  // Tombol tambah baris
  document.getElementById("addRow").addEventListener("click", async () => {
    const newRow = firstRow.cloneNode(true);
    newRow.querySelector(".namaProduk").value = "";
    newRow.querySelector(".qty").value = 1;
    newRow.querySelector(".harga").value = "";
    newRow.querySelector(".subtotal").value = "";

    await setupProductSuggestions(
      newRow.querySelector(".namaProduk"),
      newRow.querySelector(".productDropdown"),
    );

    document.getElementById("productRows").appendChild(newRow);
    updateSubtotal(newRow);
    updateTotal();
  });

  // Tombol hapus baris
  document.getElementById("productTable").addEventListener("click", (e) => {
    if (e.target.classList.contains("removeRow")) {
      const row = e.target.closest("tr");
      if (document.querySelectorAll(".product-row").length > 1) {
        row.remove();
        updateTotal();
      }
    }
  });
});

// === FITUR SCAN BARCODE & INPUT MANUAL BARCODE ===
const scanBtn = document.getElementById("scanBarcodeBtn");
const scannerModal = document.getElementById("scannerModal");
const closeScanner = document.getElementById("closeScanner");
let currentBarcodeInput = null;

if (scanBtn && scannerModal && closeScanner) {
  scanBtn.addEventListener("click", () => {
    currentBarcodeInput = document.querySelector(
      ".product-row:last-child .barcode",
    );
    scannerModal.classList.remove("hidden");
    startScanner();
  });

  closeScanner.addEventListener("click", () => {
    scannerModal.classList.add("hidden");
    Quagga.stop();
  });
}

function startScanner() {
  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector("#interactive"),
        constraints: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      },
      locator: { patchSize: "medium", halfSample: true },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      frequency: 10,
      decoder: {
        readers: ["ean_reader", "upc_reader", "code_128_reader"],
      },
      locate: true,
    },
    (err) => {
      if (err) {
        console.error("Quagga init error:", err);
        alert("Gagal akses kamera. Pastikan izin kamera diizinkan.");
        scannerModal.classList.add("hidden");
        return;
      }
      Quagga.start();
    },
  );

  Quagga.onDetected(async (data) => {
    const code = data.codeResult.code;
    if (currentBarcodeInput) {
      currentBarcodeInput.value = code;

      const db = await openDB();
      const products = await db.getAll("products");
      const prod = products.find((p) => p.barcode === code);

      if (prod) {
        const row = currentBarcodeInput.closest("tr");
        row.querySelector(".namaProduk").value = prod.nama;
        row.querySelector(".harga").value = prod.harga || 0;
        updateSubtotal(row);
      } else {
        alert("Barcode tidak ditemukan di database.");
      }
    }
    scannerModal.classList.add("hidden");
    Quagga.stop();
  });
}

// Auto-fill saat input barcode manual
document.getElementById("productTable").addEventListener("input", async (e) => {
  if (e.target.classList.contains("barcode")) {
    const code = e.target.value.trim();
    if (code.length > 0) {
      // minimal panjang barcode
      const db = await openDB();
      const products = await db.getAll("products");
      const prod = products.find((p) => p.barcode === code);
      if (prod) {
        const row = e.target.closest("tr");
        row.querySelector(".namaProduk").value = prod.nama;
        row.querySelector(".harga").value = prod.harga || 0;
        updateSubtotal(row);
      }
    }
  }
});

// Submit form
document.getElementById("manualForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const db = await openDB();
  const tx = db.transaction(["transaksi", "products"], "readwrite");

  const items = [];
  let subtotal = 0;
  const rows = document.querySelectorAll(".product-row");
  for (let row of rows) {
    const nama = row.querySelector(".namaProduk").value.trim();
    const qty = Number(row.querySelector(".qty").value);
    const harga = Number(row.querySelector(".harga").value);
    const itemSubtotal = qty * harga;

    if (!nama || qty <= 0 || harga <= 0) {
      document.getElementById("error-message").textContent =
        "Lengkapi nama, qty, dan harga untuk semua produk!";
      document.getElementById("error-message").classList.remove("hidden");
      return;
    }

    items.push({
      nama,
      varian: "",
      qty,
      harga,
      subtotal: itemSubtotal,
    });
    subtotal += itemSubtotal;

    const prod = await tx.objectStore("products").get(nama);
    if (prod) {
      if (prod.stok < qty) {
        document.getElementById("error-message").textContent =
          `Stok "${nama}" hanya ${prod.stok}, kurang dari qty ${qty}!`;
        document.getElementById("error-message").classList.remove("hidden");
        return;
      }
      prod.stok -= qty;
      await tx.objectStore("products").put(prod);
    }
  }

  const diskonNominal =
    Number(document.getElementById("diskonNominal").value) || 0;
  const total = subtotal - diskonNominal;

  const transaksi = {
    id: "TX-" + Date.now(),
    tanggal: new Date().toISOString(),
    items,
    subtotal,
    diskonNominal,
    total,
    metodeBayar: document.getElementById("metodeBayar").value,
    uangDibayarkan: null,
    sumber: document.getElementById("sumber").value,
    status: "completed",
  };

  await tx.objectStore("transaksi").add(transaksi);
  await tx.done;

  document.getElementById("success-message").textContent =
    "Transaksi berhasil disimpan! Stok dikurangi.";
  document.getElementById("success-message").classList.remove("hidden");
  document.getElementById("error-message").classList.add("hidden");

  setTimeout(() => {
    window.location.href = "transaction-history.html";
  }, 2000);
});
