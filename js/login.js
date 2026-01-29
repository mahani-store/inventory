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

async function saveLogin(username) {
  const db = await openDB();
  const tx = db.transaction("auth", "readwrite");
  await tx.objectStore("auth").put({ key: "isLoggedIn", value: true });
  await tx.objectStore("auth").put({ key: "username", value: username });
  await tx.done;
}

async function checkLogin() {
  const db = await openDB();
  const isLoggedIn = await db.get("auth", "isLoggedIn");
  return isLoggedIn?.value === true;
}

// Toggle show/hide password
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");

if (toggleBtn && passwordInput) {
  toggleBtn.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;

    toggleBtn.innerHTML =
      type === "text"
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>`;
  });
}

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const validUsername = "admin";
    const validPassword = "mahani123";

    if (username === validUsername && password === validPassword) {
      await saveLogin(username);
      window.location.href = "dashboard.html";
    } else {
      const errorDiv = document.createElement("div");
      errorDiv.className =
        "bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center mt-4";
      errorDiv.textContent = "Username atau password salah!";
      this.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 4000);

      const card = document.querySelector(".bg-white\\/10");
      card.classList.add("animate-shake");
      setTimeout(() => card.classList.remove("animate-shake"), 600);
    }
  });

// Cek login saat load
window.addEventListener("load", async () => {
  if (await checkLogin()) {
    window.location.href = "dashboard.html";
  }
});
