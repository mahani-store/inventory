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

async function loadTransactions() {
  const db = await openDB();
  const transaksi = await db.getAll("transaksi");
  const tableBody = document.getElementById("transactionTableBody");
  const noTransactions = document.getElementById("noTransactions");

  tableBody.innerHTML = "";

  if (transaksi.length === 0) {
    noTransactions.classList.remove("hidden");
    return;
  }

  noTransactions.classList.add("hidden");

  transaksi.forEach((t) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 transition";
    row.innerHTML = `
            <td class="px-6 py-4">${t.id}</td>
            <td class="px-6 py-4">${new Date(t.tanggal).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
            <td class="px-6 py-4 text-right">Rp ${t.total.toLocaleString("id-ID")}</td>
            <td class="px-6 py-4">${t.metodeBayar}</td>
            <td class="px-6 py-4">${t.status}</td>
            <td class="px-6 py-4 text-center">
              <button onclick="showDetail('${t.id}')" class="text-blue-600 hover:text-blue-800">Lihat Detail</button>
            </td>
          `;
    tableBody.appendChild(row);
  });
}

async function showDetail(id) {
  const db = await openDB();
  const transaksi = await db.get("transaksi", id);
  if (!transaksi) return alert("Transaksi tidak ditemukan");

  document.getElementById("modalTitle").textContent = `Detail Transaksi ${id}`;
  let detailHtml = `
          <p><strong>Tanggal:</strong> ${new Date(transaksi.tanggal).toLocaleString("id-ID")}</p>
          <p><strong>Subtotal:</strong> Rp ${transaksi.subtotal.toLocaleString("id-ID")}</p>
          <p><strong>Diskon:</strong> ${transaksi.diskonPersen}% (Rp ${((transaksi.subtotal * transaksi.diskonPersen) / 100).toLocaleString("id-ID")})</p>
          <p><strong>Total:</strong> Rp ${transaksi.total.toLocaleString("id-ID")}</p>
          <p><strong>Metode Bayar:</strong> ${transaksi.metodeBayar}</p>
          ${
            transaksi.metodeBayar === "Cash"
              ? `<p><strong>Uang Dibayarkan:</strong> Rp ${transaksi.uangDibayarkan.toLocaleString("id-ID")}</p>
          <p><strong>Kembalian:</strong> Rp ${(transaksi.uangDibayarkan - transaksi.total).toLocaleString("id-ID")}</p>`
              : ""
          }
          <p><strong>Status:</strong> ${transaksi.status}</p>
          <h4 class="font-semibold mt-4">Item Dibeli:</h4>
          <ul class="space-y-2">
            ${transaksi.items
              .map(
                (item) => `
              <li class="border-b pb-2">
                <p>${item.nama} ${item.varian ? "- " + item.varian : ""} x ${item.qty}</p>
                <p class="text-sm text-gray-600">Subtotal: Rp ${item.subtotal.toLocaleString("id-ID")}</p>
              </li>
            `,
              )
              .join("")}
          </ul>
        `;
  document.getElementById("modalContent").innerHTML = detailHtml;
  document.getElementById("transactionModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("transactionModal").classList.add("hidden");
}

// Init
window.addEventListener("load", loadTransactions);
