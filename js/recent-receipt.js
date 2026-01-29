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

async function loadStrukTerakhir() {
  const db = await openDB();
  const transaksiList = await db.getAll("transaksi");

  if (transaksiList.length === 0) {
    document.getElementById("strukPreview").innerHTML = `
      <p class="text-xl text-red-600">Belum ada transaksi tercatat.</p>
      <p class="mt-2">Lakukan pembayaran pertama di kasir.</p>
    `;
    return;
  }

  const terakhir = transaksiList.sort(
    (a, b) => new Date(b.tanggal) - new Date(a.tanggal),
  )[0];

  const tanggal = new Date(terakhir.tanggal).toLocaleString("id-ID");

  const itemsHtml = terakhir.items
    .map((item) => {
      const nama = `${item.nama} ${item.varian ? "- " + item.varian : ""}`
        .padStart(10, "")
        .padEnd(40, " ");
      const qtyHarga =
        `x${item.qty} Rp ${item.harga.toLocaleString("id-ID")}`.padStart(
          10,
          " ",
        );
      const subtotal = `Rp ${item.subtotal.toLocaleString("id-ID")}`.padStart(
        35,
        " ",
      );

      return `${nama}\n${qtyHarga}${subtotal}`;
    })
    .join("\n");

  const strukHTML = `
    <div id="strukPrint" style="width: 80mm; margin: 0 auto; font-family: 'Courier New', monospace; font-size: 11pt; line-height: 1.3; padding: 8mm 4mm; background: white; text-align: left;">
      <div style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 6px;">
        MAHANI STORE
      </div>
      <div style="text-align: center; font-size: 8pt; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
        Telp: 085133144977<br>
        Email: info@mahanistore.com
      </div>
      <div style="text-align: center; font-size: 8pt; margin-bottom: 10px;">
        STRUK TRANSAKSI
      </div>
      <div style="font-size: 7pt; margin-bottom: 6px;">
        No. Transaksi: ${terakhir.id}<br>
        Tanggal: ${tanggal}
      </div>
      <div style="text-align: left; margin-bottom: 10px; white-space: pre; font-size: 7pt">
        ${itemsHtml}
      </div>
      <div style="border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 6px;">
        <div style="text-align: right; font-size: 9pt; font-weight: bold;">
          Subtotal: Rp ${terakhir.subtotal.toLocaleString("id-ID")}<br>
          Diskon (${terakhir.diskonPersen}%): Rp ${Math.round((terakhir.subtotal * terakhir.diskonPersen) / 100).toLocaleString("id-ID")}<br>
          <span style="font-size: 11pt;">TOTAL: Rp ${terakhir.total.toLocaleString("id-ID")}</span>
        </div>
      </div>
      <div style="text-align: center; font-size: 7pt; margin-bottom: 6px;">
        Metode Bayar: ${terakhir.metodeBayar}
        ${
          terakhir.metodeBayar === "Cash"
            ? `
          <br>Uang Dibayarkan: Rp ${terakhir.uangDibayarkan.toLocaleString("id-ID")}
          <br>Kembalian: Rp ${(terakhir.uangDibayarkan - terakhir.total).toLocaleString("id-ID")}
        `
            : ""
        }
      </div>
      <div style="text-align: center; font-size: 8pt; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px;">
        Terima kasih telah berbelanja!<br>
        Semoga harimu menyenangkan 😊
      </div>
    </div>
  `;

  document.getElementById("strukPreview").innerHTML = strukHTML;
}

function cetakStruk() {
  window.print();
}

// Init
window.addEventListener("load", loadStrukTerakhir);
