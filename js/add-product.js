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

      // Load kategori dari IndexedDB
      async function loadCategoriesIntoSelect() {
        const db = await openDB();
        const categories = await db.getAll("categories");
        const select = document.getElementById("kategori");
        select.innerHTML = '<option value="">Pilih Kategori</option>';
        categories.forEach((cat) => {
          const option = document.createElement("option");
          option.value = cat.nama;
          option.textContent = cat.nama;
          select.appendChild(option);
        });
        updateSelectColor();
      }

      // Update warna select
      function updateSelectColor() {
        const select = document.getElementById("kategori");
        if (select) {
          select.style.color = select.value === "" ? "#9ca3af" : "#1f2937";
        }
      }

      // Fungsi baru: Load & setup suggestion merk unik dengan custom dropdown
      async function setupBrandSuggestions() {
        const db = await openDB();
        const products = await db.getAll("products");

        // Kumpulkan merk unik, simpan original case, tapi sort case-insensitive
        const uniqueBrands = [
          ...new Set(
            products
              .map((p) => p.merk?.trim())
              .filter((merk) => merk && merk.length > 0),
          ),
        ].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" }),
        );

        const merkInput = document.getElementById("merk");
        const dropdown = document.getElementById("brandDropdown");

        merkInput.addEventListener("input", (e) => {
          const query = e.target.value.trim().toLowerCase();
          dropdown.innerHTML = ""; // Kosongkan dulu
          dropdown.classList.add("hidden");

          if (query.length < 1) return; // Jangan tampil kalau <1 huruf

          // Filter brands yang match
          const filtered = uniqueBrands.filter((brand) =>
            brand.toLowerCase().includes(query),
          );

          if (filtered.length > 0) {
            filtered.forEach((brand) => {
              const item = document.createElement("div");
              item.className = "px-4 py-2 cursor-pointer hover:bg-gray-100";
              item.textContent = brand;
              item.addEventListener("click", () => {
                merkInput.value = brand;
                dropdown.classList.add("hidden");
              });
              dropdown.appendChild(item);
            });
            dropdown.classList.remove("hidden");
          }
        });

        // Hide dropdown kalau klik luar
        document.addEventListener("click", (e) => {
          if (!merkInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add("hidden");
          }
        });
      }

      async function addProduct() {
        // Submit form → simpan ke IndexedDB dengan gambar real
        document
          .getElementById("addProductForm")
          .addEventListener("submit", async function (e) {
            e.preventDefault();

            const nama = document.getElementById("nama")?.value.trim() || "";
            const merk = document.getElementById("merk")?.value.trim() || "";
            const varian =
              document.getElementById("varian")?.value.trim() || "";
            const kategori = document.getElementById("kategori")?.value || "";
            const hargaStr =
              document.getElementById("harga")?.value.trim() || "0";
            const stokStr =
              document.getElementById("stok")?.value.trim() || "0";
            const deskripsi =
              document.getElementById("deskripsi")?.value.trim() || "";
            const sku = document.getElementById("sku")?.value.trim() || "";
            const barcode =
              document.getElementById("barcode")?.value.trim() || "";

            if (!nama || !hargaStr) {
              document.getElementById("error-message").textContent =
                "Lengkapi field wajib: Nama, Harga, Stok, Kategori!";
              document
                .getElementById("error-message")
                .classList.remove("hidden");
              return;
            }

            const hargaBersih = parseInt(hargaStr.replace(/\./g, ""), 10);
            if (isNaN(hargaBersih) || hargaBersih <= 0) {
              document.getElementById("error-message").textContent =
                "Harga harus lebih dari 0 dan berupa angka!";
              document
                .getElementById("error-message")
                .classList.remove("hidden");
              return;
            }

            const stok = parseInt(stokStr, 10);
            if (isNaN(stok) || stok < 0) {
              document.getElementById("error-message").textContent =
                "Stok harus 0 atau lebih dan berupa angka!";
              document
                .getElementById("error-message")
                .classList.remove("hidden");
              return;
            }

            const hargaPokokTotal =
              Number(document.getElementById("hargaPokokTotal").value) || 0;
            const hargaPokokPerUnit =
              Number(document.getElementById("hargaPokokPerUnit").value) || 0;

            if (hargaPokokTotal > 0 && hargaPokokPerUnit > 0) {
              alert(
                "Isi salah satu saja: Harga Pokok Total atau Harga Pokok per Unit!",
              );
              return;
            }

            let hppPerUnit = 0;
            if (hargaPokokPerUnit > 0) {
              hppPerUnit = hargaPokokPerUnit;
            } else if (hargaPokokTotal > 0) {
              if (stok <= 0) {
                alert("Masukkan stok awal agar bisa hitung HPP!");
                return;
              }
              hppPerUnit = hargaPokokTotal / stok;
            }

            // Ambil gambar dari preview (base64)
            let gambar = "";
            const previewImg = document.getElementById("previewImg");
            if (previewImg.src && previewImg.src.startsWith("data:image")) {
              gambar = previewImg.src; // base64 real dari file yang dipilih
            }

            const produkBaru = {
              nama,
              merk,
              varian,
              kategori,
              hargaPokok: hppPerUnit,
              harga: hargaBersih,
              stok,
              deskripsi,
              sku: sku || "AUTO-" + Date.now().toString().slice(-6),
              barcode,
              gambar, // base64 real atau default
            };

            try {
              const db = await openDB();
              const products = await db.getAll("products");

              // Fungsi helper untuk banding case-insensitive
              const normalize = (str) => (str || "").toLowerCase().trim();

              // Cari apakah ada produk yang "sama" berdasarkan pola
              const similarProduct = products.find(
                (p) =>
                  normalize(p.nama) === normalize(nama) &&
                  normalize(p.merk) === normalize(merk) &&
                  normalize(p.varian) === normalize(varian) &&
                  normalize(p.kategori) === normalize(kategori) &&
                  normalize(p.barcode) === normalize(barcode),
              );

              let shouldOverwrite = false;
              if (similarProduct) {
                // Produk mirip ditemukan → beri warning
                if (
                  !confirm(
                    `Produk mirip dengan "${similarProduct.nama}" sudah ada (nama, merk, varian, kategori, barcode sama persis, ignore case). Overwrite data?`,
                  )
                ) {
                  return; // Batal simpan
                }
                shouldOverwrite = true;
              } else {
                // Cek kalau nama sama tapi yang lain beda → simpan sebagai baru
                const sameName = products.find(
                  (p) => normalize(p.nama) === normalize(nama),
                );
                if (sameName) {
                  // Nama sama, tapi setidaknya satu field beda (merk/kategori/barcode/harga) → lanjut sebagai baru
                  // Tapi karena keyPath = nama, akan conflict → kita ubah jadi update (overwrite)
                  if (
                    !confirm(
                      `Produk dengan nama "${nama}" sudah ada, tapi detail lain beda. Update data?`,
                    )
                  ) {
                    return;
                  }
                  shouldOverwrite = true;
                }
              }

              const tx = db.transaction("products", "readwrite");
              const store = tx.objectStore("products");

              if (shouldOverwrite) {
                await store.put(produkBaru); // Overwrite jika mirip atau nama sama
                document.getElementById("success-message").textContent =
                  `Produk "${nama}" berhasil diupdate!`;
              } else {
                await store.add(produkBaru); // Tambah baru
                document.getElementById("success-message").textContent =
                  `Produk "${nama}" berhasil ditambahkan!`;
              }

              await tx.done;

              document
                .getElementById("success-message")
                .classList.remove("hidden");
              document.getElementById("error-message").classList.add("hidden");

              setTimeout(() => {
                this.reset();
                document.getElementById("imagePreview").classList.add("hidden");
                document
                  .getElementById("success-message")
                  .classList.add("hidden");
                updateSelectColor();
              }, 8000);
            } catch (err) {
              console.error("Gagal simpan produk:", err);
              document.getElementById("error-message").textContent =
                "Gagal menyimpan produk. Coba lagi.";
              document
                .getElementById("error-message")
                .classList.remove("hidden");
            }
          });
      }

      // Scanner Modal
      const scanBtn = document.getElementById("scanBtn");
      const scannerModal = document.getElementById("scannerModal");
      const closeScanner = document.getElementById("closeScanner");
      const barcodeInput = document.getElementById("barcode");

      scanBtn.addEventListener("click", () => {
        scannerModal.classList.remove("hidden");
        startScanner();
      });

      closeScanner.addEventListener("click", () => {
        scannerModal.classList.add("hidden");
        Quagga.stop();
      });

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
              console.error(err);
              alert("Gagal akses kamera. Pastikan izin diberikan.");
              scannerModal.classList.add("hidden");
              return;
            }
            Quagga.start();
          },
        );

        Quagga.onDetected((data) => {
          const code = data.codeResult.code;
          barcodeInput.value = code;
          scannerModal.classList.add("hidden");
          Quagga.stop();
          alert("Barcode terdeteksi: " + code);
        });
      }

      // Preview gambar saat dipilih
      document
        .getElementById("gambarInput")
        .addEventListener("change", function (e) {
          const file = e.target.files[0];
          if (file) {
            if (file.size > 5 * 1024 * 1024) {
              // max 5MB
              alert("Ukuran gambar maksimal 5MB!");
              this.value = "";
              document.getElementById("imagePreview").classList.add("hidden");
              return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
              const preview = document.getElementById("imagePreview");
              const img = document.getElementById("previewImg");
              img.src = e.target.result;
              preview.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
          } else {
            document.getElementById("imagePreview").classList.add("hidden");
          }
        });

      // Init
      window.addEventListener("load", async () => {
        await loadCategoriesIntoSelect();
        await setupBrandSuggestions();
        updateSelectColor();
        addProduct();
      });

      document
        .getElementById("hargaPokokTotal")
        .addEventListener("input", updatePreviewHPP);
      document
        .getElementById("hargaPokokPerUnit")
        .addEventListener("input", updatePreviewHPP);
      document
        .getElementById("stok")
        .addEventListener("input", updatePreviewHPP);

      function updatePreviewHPP() {
        const total =
          Number(document.getElementById("hargaPokokTotal").value) || 0;
        const perUnit =
          Number(document.getElementById("hargaPokokPerUnit").value) || 0;
        const stok = Number(document.getElementById("stok").value) || 0;

        const previewEl = document.getElementById("previewHPP");
        const valueEl = document.getElementById("hppValue");

        if (perUnit > 0) {
          valueEl.textContent = perUnit.toLocaleString("id-ID");
          previewEl.classList.remove("hidden");
        } else if (total > 0 && stok > 0) {
          const hpp = total / stok;
          valueEl.textContent =
            hpp.toLocaleString("id-ID") + " (dari total / stok)";
          previewEl.classList.remove("hidden");
        } else {
          previewEl.classList.add("hidden");
        }
      }
