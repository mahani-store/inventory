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

async function logout() {
  if (confirm("Yakin ingin logout?")) {
    const db = await openDB();
    const tx = db.transaction("auth", "readwrite");
    await tx.objectStore("auth").delete("isLoggedIn");
    await tx.objectStore("auth").delete("username");
    await tx.done;
    window.location.href = "login.html";
  }
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

window.addEventListener("load", async () => {
  const db = await openDB();
  const isLoggedIn = await db.get("auth", "isLoggedIn");
  if (isLoggedIn?.value !== true) {
    window.location.href = "login.html";
  }
  await loadDashboard();
  updateCharts();
});

let salesChart = null;
let topChart = null;
let currentPeriod = "week"; // default minggu ini

async function loadDashboard() {
  const db = await openDB();
  const products = await db.getAll("products");
  const transaksi = await db.getAll("transaksi");

  // Total Produk & Stok
  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalStock").textContent = products.reduce(
    (sum, p) => sum + Number(p.stok || 0),
    0,
  );

  const low = products.filter(
    (p) => (p.stok = Number(p.stok || 0)) > 0 && p.stok <= 5,
  );
  document.getElementById("lowStock").textContent = low.length;

  document.getElementById("lowStockList").innerHTML =
    low.length === 0
      ? '<p class="text-center text-gray-500 py-8 italic">Tidak ada stok rendah. Aman! 🎉</p>'
      : low
          .map(
            (p) => `
          <div class="flex flex-col sm:flex-row justify-between py-4 border-b hover:bg-gray-50">
            <div>
              <p class="font-semibold">${p.nama}</p>
              <p class="text-sm text-gray-600">${p.merk || ""}${p.varian ? " - " + p.varian : ""}</p>
              <p class="text-sm text-gray-500">Kategori: ${p.kategori || "-"}</p>
            </div>
            <div class="mt-2 sm:mt-0 text-right">
            <span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm mt-2 sm:mt-0">
              Stok: ${p.stok}
            </span>
            </div>
          </div>
        `,
          )
          .join("");

  // Omset Hari Ini (real dari transaksi hari ini)
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayTrans = transaksi.filter(
    (t) => new Date(t.tanggal).getTime() >= todayStart,
  );
  const omsetHariIni = todayTrans.reduce((sum, t) => sum + t.total, 0);
  document.getElementById("omsetHariIni").textContent =
    "Rp " + omsetHariIni.toLocaleString("id-ID");
}

function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  return new Chart(canvas.getContext("2d"), config);
}

async function updateCharts() {
  const db = await openDB();
  const transaksi = await db.getAll("transaksi");

  let labels = [];
  let sales = [];
  const today = new Date();

  if (currentPeriod === "today") {
    labels = ["Hari Ini"];
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayTrans = transaksi.filter(
      (t) => new Date(t.tanggal).getTime() >= todayStart,
    );
    sales = [todayTrans.reduce((sum, t) => sum + t.total, 0)];
  } else if (currentPeriod === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStart = d.setHours(0, 0, 0, 0);
      const dayEnd = d.setHours(23, 59, 59, 999);
      const dayTrans = transaksi.filter((t) => {
        const ts = new Date(t.tanggal).getTime();
        return ts >= dayStart && ts <= dayEnd;
      });
      labels.push(
        d.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
        }),
      );
      sales.push(dayTrans.reduce((sum, t) => sum + t.total, 0));
    }
  } else {
    // month
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStart = d.setHours(0, 0, 0, 0);
      const dayEnd = d.setHours(23, 59, 59, 999);
      const dayTrans = transaksi.filter((t) => {
        const ts = new Date(t.tanggal).getTime();
        return ts >= dayStart && ts <= dayEnd;
      });
      labels.push(d.toLocaleDateString("id-ID", { day: "numeric" }));
      sales.push(dayTrans.reduce((sum, t) => sum + t.total, 0));
    }
  }

  // Sales Chart
  salesChart = createChart("salesChart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Penjualan (Rp)",
          data: sales,
          borderColor: "#1d4ed8",
          backgroundColor: "rgba(29,78,216,0.3)",
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => "Rp " + v.toLocaleString("id-ID") },
        },
      },
    },
  });

  // Top Produk (real dari transaksi)
  const productSales = {};
  transaksi.forEach((t) => {
    t.items.forEach((item) => {
      const key = item.nama + (item.varian ? " - " + item.varian : "");
      productSales[key] = (productSales[key] || 0) + item.qty;
    });
  });

  const topProducts = Object.entries(productSales)
    .map(([name, qty]) => ({ nama: name, terjual: qty }))
    .sort((a, b) => b.terjual - a.terjual)
    .slice(0, 5);

  topChart = createChart("topProductsChart", {
    type: "bar",
    data: {
      labels: topProducts.map((p) => p.nama),
      datasets: [
        {
          label: "Jumlah Terjual",
          data: topProducts.map((p) => p.terjual),
          backgroundColor: [
            "#1d4ed8aa",
            "#9333eaaa",
            "#22c55eaa",
            "#f97316aa",
            "#ef4444aa",
          ],
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: "Jumlah Terjual" },
        },
      },
    },
  });
}

function setPeriod(period) {
  currentPeriod = period;
  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.classList.remove("bg-primary-700", "text-white");
    btn.classList.add("bg-gray-200");
  });
  document
    .querySelector(`[data-period="${period}"]`)
    .classList.add("bg-primary-700", "text-white");
  updateCharts();
}

// Init
window.addEventListener("load", () => {
  loadDashboard();
  updateCharts(); // panggil sekali awal
});
