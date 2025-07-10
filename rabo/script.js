// ==========================================================
// VARIABEL GLOBAL
// ==========================================================

// 🎯 KONFIGURASI KOIN - UBAH HANYA INI SAJA!
// ==========================================================
const COIN_CONFIG = {
  // 🔧 UBAH INI: Contract Address (CA) Toke
  contractAddress: "93FZGB8Hwc4JuVh35cV4iCArvHMhhnjmwLdhRtYKbonk",

  // 🔧 UBAH INI: Chain ID (opsional, default: solana)
  chainId: "solana",

  // 🔧 UBAH INI: Total Supply (opsional, default: 1000000000)
  totalSupply: 1000000000,
};

// coinData: Menyimpan data koin saat ini yang akan ditampilkan di UI.
// Diberi nilai awal dengan struktur yang diharapkan, akan diisi ulang oleh API.
let coinData = [
  {
    chainId: COIN_CONFIG.chainId,
    dexId: "pumpswap",
    url: "",
    pairAddress: "",
    baseToken: {
      address: COIN_CONFIG.contractAddress,
      name: "GABO",
      symbol: "GABO",
      totalSupply: COIN_CONFIG.totalSupply,
    },
    quoteToken: {
      address: "So11111111111111111111111111111111111111112",
      name: "Wrapped SOL",
      symbol: "SOL",
    },
    priceNative: "0",
    priceUsd: "0",
    txns: {
      m5: { buys: 0, sells: 0 },
      h1: { buys: 0, sells: 0 },
      h6: { buys: 0, sells: 0 },
      h24: { buys: 0, sells: 0 },
    },
    volume: {
      h24: 0,
      h6: 0,
      h1: 0,
      m5: 0,
    },
    priceChange: {
      m5: 0,
      h1: 0,
      h6: 0,
      h24: 0,
    },
    liquidity: {
      usd: 0,
      base: 0,
      quote: 0,
    },
    fdv: 0,
    marketCap: 0,
    pairCreatedAt: 0,
    info: {
      imageUrl: "",
      header: "",
      openGraph: "",
      websites: [],
      socials: [],
    },
    boosts: {
      active: 0,
    },
  },
];

// prevCoinData: Menyimpan salinan data koin dari pembaruan sebelumnya.
// Digunakan untuk membandingkan nilai dan memicu efek kedip saat ada perubahan.
let prevCoinData = JSON.parse(JSON.stringify(coinData));

// ==========================================================
// FUNGSI PEMBANTU (HELPER FUNCTIONS)
// ==========================================================

/**
 * Memformat angka ke format mata uang USD.
 * Memberikan presisi desimal yang lebih tinggi untuk nilai yang sangat kecil.
 * @param {number|string} amount - Nilai numerik yang akan diformat.
 * @returns {string} - Nilai yang diformat dalam format mata uang USD atau 'N/A' jika tidak valid.
 */
function formatUSD(amount) {
  // Memastikan amount adalah angka
  if (typeof amount !== "number" && typeof amount !== "string") return "N/A";
  const num = parseFloat(amount);
  if (isNaN(num)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: num < 0.001 ? 8 : 6, // Lebih banyak desimal untuk nilai sangat kecil
  }).format(num);
}

/**
 * Memformat angka dengan koma sebagai pemisah ribuan.
 * @param {number|string} num - Nilai numerik yang akan diformat.
 * @returns {string} - Nilai yang diformat atau 'N/A' jika tidak valid.
 */
function formatNumber(num) {
  if (typeof num !== "number" && typeof num !== "string") return "N/A";
  const parsedNum = parseFloat(num);
  if (isNaN(parsedNum)) return "N/A";

  return new Intl.NumberFormat("en-US").format(parsedNum);
}

/**
 * Mengembalikan kelas CSS yang sesuai (hijau untuk positif, merah untuk negatif)
 * berdasarkan nilai numerik.
 * @param {number} value - Nilai numerik.
 * @returns {string} - Kelas CSS Tailwind.
 */
function getChangeColorClass(value) {
  return value >= 0 ? "text-green-600" : "text-red-600";
}

/**
 * Menerapkan efek kedip (flash) pada elemen HTML jika nilainya berubah.
 * @param {string} elementId - ID elemen HTML yang akan diperbarui.
 * @param {any} newValue - Nilai baru.
 * @param {any} oldValue - Nilai lama (untuk perbandingan).
 * @param {Function} [formatFn=val => val] - Fungsi opsional untuk memformat nilai sebelum perbandingan dan penetapan teks.
 */
function applyFlashEffect(
  elementId,
  newValue,
  oldValue,
  formatFn = (val) => val
) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Pastikan oldValue tidak null/undefined sebelum membandingkan
  const oldFormattedValue =
    oldValue !== undefined && oldValue !== null ? formatFn(oldValue) : "";
  const newFormattedValue = formatFn(newValue);

  // Periksa jika nilai berubah
  if (newFormattedValue !== oldFormattedValue) {
    // Hapus animasi yang sedang berjalan agar bisa dipicu ulang
    element.classList.remove("flash-update", "flash-green", "flash-red");
    // Paksa reflow untuk me-restart animasi (trik browser)
    void element.offsetWidth;

    // Tentukan warna flash berdasarkan perubahan nilai
    if (
      oldValue !== undefined &&
      oldValue !== null &&
      newValue !== undefined &&
      newValue !== null
    ) {
      const oldNum = parseFloat(oldValue);
      const newNum = parseFloat(newValue);
      if (!isNaN(oldNum) && !isNaN(newNum)) {
        if (newNum > oldNum) {
          element.classList.add("flash-green");
        } else if (newNum < oldNum) {
          element.classList.add("flash-red");
        }
        // Jika nilai sama, tidak perlu flash
      } else {
        // Jika tidak bisa dibandingkan secara numerik, gunakan flash default
        element.classList.add("flash-update");
      }
    } else {
      // Jika salah satu nilai tidak ada, gunakan flash default
      element.classList.add("flash-update");
    }

    // Hapus kelas setelah animasi selesai
    setTimeout(() => {
      element.classList.remove("flash-update", "flash-green", "flash-red");
    }, 600); // Durasi animasi adalah 0.6s
  }

  // Update text content
  element.textContent = newFormattedValue;
}

// ==========================================================
// FUNGSI UTAMA PENGISIAN UI
// ==========================================================

/**
 * Mengisi elemen-elemen UI dengan data koin saat ini.
 * Menerapkan efek kedip pada elemen yang nilainya berubah.
 */
function populateUI() {
  const ca = COIN_CONFIG.contractAddress;
  if (!ca || ca.trim() === "") {
    // Jika CA kosong, tampilkan Coming Soon di semua data utama
    [
      "tokenomics-supply",
      "tokenomics-marketcap",
      "tokenomics-priceusd",
      "tokenomics-holders",
      "market-marketcap",
      "market-volume24h",
      "market-liquidity",
      "price-usd",
      "price-native",
      "price-change-h24",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "Coming Soon";
    });
    return;
  }
  console.log("🎨 populateUI called at:", new Date().toLocaleTimeString());
  const currentData = coinData[0];
  const previousData = prevCoinData[0]; // Data dari pembaruan sebelumnya

  console.log("📈 Current vs Previous Data:", {
    priceUsd: {
      current: currentData.priceUsd,
      previous: previousData?.priceUsd,
    },
    marketCap: {
      current: currentData.marketCap,
      previous: previousData?.marketCap,
    },
    volume24h: {
      current: currentData.volume?.h24,
      previous: previousData?.volume?.h24,
    },
  });

  // --- Header Image ---
  const headerImage = document.getElementById("header-image");
  const headerPlaceholder = document.getElementById("header-placeholder");
  if (currentData.info && currentData.info.header) {
    headerImage.src = currentData.info.header;
    headerImage.onload = () => {
      headerImage.classList.remove("hidden");
      headerPlaceholder.classList.add("hidden");
    };
    headerImage.onerror = () => {
      headerImage.classList.add("hidden");
      headerPlaceholder.classList.remove("hidden");
    };
  } else {
    headerImage.classList.add("hidden");
    headerPlaceholder.classList.remove("hidden");
  }

  // --- Token Logo ---
  const tokenLogo = document.getElementById("token-logo");
  const logoPlaceholder = document.getElementById("logo-placeholder");
  if (currentData.info && currentData.info.imageUrl) {
    tokenLogo.src = currentData.info.imageUrl;
    tokenLogo.onload = () => {
      tokenLogo.classList.remove("hidden");
      logoPlaceholder.classList.add("hidden");
    };
    tokenLogo.onerror = () => {
      tokenLogo.classList.add("hidden");
      logoPlaceholder.classList.remove("hidden");
    };
  } else {
    tokenLogo.classList.add("hidden");
    logoPlaceholder.classList.remove("hidden");
  }

  // --- Informasi Umum Token ---
  const tokenName = document.getElementById("token-name");
  const tokenSymbol = document.getElementById("token-symbol");
  if (tokenName) {
    tokenName.textContent = currentData.baseToken?.name || "N/A";
    console.log("✅ Updated token-name:", tokenName.textContent);
  }
  if (tokenSymbol) {
    tokenSymbol.textContent = `(${currentData.baseToken?.symbol || "N/A"})`;
    console.log("✅ Updated token-symbol:", tokenSymbol.textContent);
  }

  // --- Perbarui Stempel Waktu ---
  const lastUpdated = document.getElementById("last-updated");
  if (lastUpdated) {
    lastUpdated.textContent = new Date().toLocaleTimeString();
    console.log("⏰ Updated last-updated:", lastUpdated.textContent);
  }

  // Market Section Cards dengan efek flash
  applyFlashEffect(
    "market-marketcap",
    currentData.marketCap,
    previousData?.marketCap,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? formatNumber(val)
        : "loading data..."
  );
  applyFlashEffect(
    "market-volume24h",
    currentData.volume?.h24,
    previousData?.volume?.h24,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? formatNumber(val)
        : "loading data..."
  );
  applyFlashEffect(
    "market-liquidity",
    currentData.liquidity?.usd,
    previousData?.liquidity?.usd,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? formatNumber(val)
        : "loading data..."
  );

  // Tokenomics Section Cards dengan efek flash
  applyFlashEffect(
    "tokenomics-supply",
    currentData.baseToken?.totalSupply || 1000000000,
    previousData?.baseToken?.totalSupply || 1000000000,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? formatNumber(val)
        : "loading data..."
  );
  applyFlashEffect(
    "tokenomics-marketcap",
    currentData.marketCap,
    previousData?.marketCap,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? formatNumber(val)
        : "loading data..."
  );
  applyFlashEffect(
    "tokenomics-priceusd",
    currentData.priceUsd,
    previousData?.priceUsd,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? `$${parseFloat(val).toFixed(8)}`
        : "loading data..."
  );
  applyFlashEffect(
    "tokenomics-holders",
    currentData.holders,
    previousData?.holders,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? formatNumber(val)
        : "loading data..."
  );

  // Hero Section Data dengan efek flash
  applyFlashEffect(
    "price-usd",
    currentData.priceUsd,
    previousData?.priceUsd,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? `$${parseFloat(val).toFixed(8)}`
        : "loading data..."
  );
  applyFlashEffect(
    "price-native",
    currentData.priceNative,
    previousData?.priceNative,
    (val) =>
      val !== undefined && val !== null && !isNaN(val) && Number(val) > 0
        ? `${parseFloat(val).toFixed(8)} ${
            currentData.quoteToken?.symbol || ""
          }`
        : "loading data..."
  );

  // Price change dengan warna khusus
  const priceChangeH24 = document.getElementById("price-change-h24");
  if (priceChangeH24) {
    const val = currentData.priceChange?.h24;
    const prevVal = previousData?.priceChange?.h24;

    if (val !== undefined && val !== null && !isNaN(val)) {
      const formattedValue = `${parseFloat(val).toFixed(2)}% (24h)`;
      const prevFormattedValue =
        prevVal !== undefined && prevVal !== null && !isNaN(prevVal)
          ? `${parseFloat(prevVal).toFixed(2)}% (24h)`
          : "";

      // Hapus kelas warna lama
      priceChangeH24.classList.remove(
        "text-green-400",
        "text-red-400",
        "text-gray-300"
      );

      // Tambahkan kelas warna berdasarkan nilai
      if (val > 0) {
        priceChangeH24.classList.add("text-green-400");
      } else if (val < 0) {
        priceChangeH24.classList.add("text-red-400");
      } else {
        priceChangeH24.classList.add("text-gray-300");
      }

      // Terapkan efek flash hanya jika nilai berubah
      if (prevFormattedValue !== "" && formattedValue !== prevFormattedValue) {
        priceChangeH24.classList.remove(
          "flash-update",
          "flash-green",
          "flash-red"
        );
        void priceChangeH24.offsetWidth;

        if (parseFloat(val) > parseFloat(prevVal)) {
          priceChangeH24.classList.add("flash-green");
        } else if (parseFloat(val) < parseFloat(prevVal)) {
          priceChangeH24.classList.add("flash-red");
        }
        // Jika nilai sama, tidak perlu flash

        setTimeout(() => {
          priceChangeH24.classList.remove(
            "flash-update",
            "flash-green",
            "flash-red"
          );
        }, 600);
      }

      priceChangeH24.textContent = formattedValue;
      console.log(
        "📊 Updated price-change-h24:",
        formattedValue,
        "Color:",
        val > 0 ? "green" : val < 0 ? "red" : "gray"
      );
    } else {
      priceChangeH24.textContent = "loading data...";
      priceChangeH24.classList.remove(
        "text-green-400",
        "text-red-400",
        "text-gray-300"
      );
      priceChangeH24.classList.add("text-gray-300");
    }
  }

  // Perbarui prevCoinData dengan data saat ini untuk perbandingan berikutnya
  prevCoinData = JSON.parse(JSON.stringify(coinData));
  console.log("🎉 populateUI completed successfully");
}

// ==========================================================
// FUNGSI PENCARIAN PAIR ADDRESS
// ==========================================================

/**
 * Mencari pair address berdasarkan contract address token
 * @param {string} contractAddress - Contract address token
 * @param {string} chainId - Chain ID (solana, ethereum, dll)
 * @returns {Promise<string|null>} - Pair address atau null jika tidak ditemukan
 */
async function findPairAddress(contractAddress, chainId = "solana") {
  console.log("🔍 Searching for pair address...");

  try {
    // Coba cari pair yang menggunakan token ini sebagai base token
    const searchUrl = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;
    console.log("📡 Searching:", searchUrl);

    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Search response:", {
      pairs: data.pairs ? data.pairs.length : 0,
      chainId: chainId,
    });

    if (data.pairs && data.pairs.length > 0) {
      // Cari pair yang sesuai dengan chainId
      const matchingPair = data.pairs.find(
        (pair) =>
          pair.chainId === chainId &&
          pair.baseToken?.address?.toLowerCase() ===
            contractAddress.toLowerCase()
      );

      if (matchingPair) {
        console.log("🎯 Found matching pair:", matchingPair.pairAddress);
        return matchingPair.pairAddress;
      }

      // Jika tidak ada yang exact match, ambil yang pertama dari chain yang sama
      const chainPair = data.pairs.find((pair) => pair.chainId === chainId);
      if (chainPair) {
        console.log("🎯 Found chain pair:", chainPair.pairAddress);
        return chainPair.pairAddress;
      }

      // Jika tidak ada yang sesuai chain, ambil yang pertama
      console.log("🎯 Found first pair:", data.pairs[0].pairAddress);
      return data.pairs[0].pairAddress;
    }

    console.warn("⚠️ No pairs found for contract address");
    return null;
  } catch (error) {
    console.error("❌ Error searching for pair address:", error);
    return null;
  }
}

/**
 * Mengambil data koin aktual dari Dexscreener API.
 * Setelah berhasil, akan memanggil populateUI() untuk memperbarui tampilan.
 */
async function fetchAndUpdateData() {
  const ca = COIN_CONFIG.contractAddress;
  if (!ca || ca.trim() === "") {
    populateUI();
    return;
  }
  console.log(
    "🔄 fetchAndUpdateData called at:",
    new Date().toLocaleTimeString()
  );

  // Jika pair address belum ditemukan, cari dulu
  if (!coinData[0].pairAddress) {
    console.log("🔍 Pair address not found, searching...");
    const pairAddress = await findPairAddress(
      COIN_CONFIG.contractAddress,
      COIN_CONFIG.chainId
    );

    if (pairAddress) {
      coinData[0].pairAddress = pairAddress;
      coinData[0].url = `https://dexscreener.com/${COIN_CONFIG.chainId}/${pairAddress}`;
      console.log("✅ Pair address found and updated");
    } else {
      console.error(
        "❌ Could not find pair address for contract:",
        COIN_CONFIG.contractAddress
      );
      return;
    }
  }

  // Definisikan chainId dan pairAddress dari data yang sudah ada
  const chainId = coinData[0].chainId;
  const pairAddress = coinData[0].pairAddress;
  const apiUrl = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

  try {
    console.log("📡 Fetching from API:", apiUrl);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const apiData = await response.json();
    console.log("✅ API Response received:", {
      pairs: apiData.pairs ? apiData.pairs.length : 0,
      priceUsd: apiData.pairs?.[0]?.priceUsd,
      marketCap: apiData.pairs?.[0]?.marketCap,
      volume24h: apiData.pairs?.[0]?.volume?.h24,
    });

    if (apiData.pairs && apiData.pairs.length > 0) {
      // Simpan data lama sebelum diperbarui untuk perbandingan efek flash
      prevCoinData = JSON.parse(JSON.stringify(coinData));

      // Perbarui coinData[0] dengan data dari API
      coinData[0] = apiData.pairs[0];
      console.log("📊 Updated coinData:", {
        priceUsd: coinData[0].priceUsd,
        marketCap: coinData[0].marketCap,
        volume24h: coinData[0].volume?.h24,
        priceChange24h: coinData[0].priceChange?.h24,
      });

      // Ambil jumlah holder dari Moralis API
      try {
        const holders = await fetchHolderCount(COIN_CONFIG.contractAddress);
        coinData[0].holders = holders;
        console.log("👥 Updated holders from Moralis:", holders);
      } catch (err) {
        console.error("❌ Error updating holders:", err);
        coinData[0].holders = 9180;
      }

      populateUI(); // Perbarui UI dengan data yang baru diambil
      console.log("🎉 Data berhasil diperbarui dari Dexscreener API!");
    } else {
      console.warn(
        "⚠️ Tidak ada data pasangan yang ditemukan di respons API Dexscreener."
      );
    }
  } catch (error) {
    console.error("❌ Gagal mengambil data dari API:", error);
  }
}

// ==========================================================
// INISIALISASI
// ==========================================================

// Event listener untuk memastikan DOM dimuat sepenuhnya sebelum menjalankan skrip.
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing crypto tracking system...");
  console.log("Initial coinData:", coinData[0]);

  // Update contract address display
  updateContractAddressDisplay();

  // Populate UI with initial data first
  populateUI();

  // Initialize parallax effect
  initParallaxEffect();

  fetchAndUpdateData(); // Panggil sekali saat startup untuk memuat data pertama kali
  // Atur interval untuk memperbarui data setiap 5 detik (sesuaikan sesuai kebutuhan API rate limit)
  setInterval(fetchAndUpdateData, 5000);

  updateDynamicLinks();

  console.log("Script initialization completed");
});

// 📋 FUNGSI COPY CONTRACT ADDRESS
function copyContractAddress() {
  const contractAddress = COIN_CONFIG.contractAddress;

  // Copy ke clipboard
  navigator.clipboard
    .writeText(contractAddress)
    .then(() => {
      // Tampilkan notifikasi
      showNotification("Contract Address copied!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      showNotification("Failed to copy address", "error");
    });
}

// 🔔 FUNGSI NOTIFIKASI
function showNotification(message, type = "info") {
  // Hapus notifikasi lama jika ada
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Buat notifikasi baru
  const notification = document.createElement("div");
  notification.className = `notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg font-bold ${type}`;
  notification.textContent = message;

  // Tambahkan ke body
  document.body.appendChild(notification);

  // Paksa reflow agar animasi shake dan shine bisa diulang jika notifikasi muncul cepat
  notification.classList.remove("shake-notif", "shine-notif");
  void notification.offsetWidth;
  notification.classList.add("shake-notif", "shine-notif");

  // Animate in (handled by CSS)

  // Hapus setelah 3 detik dengan animasi keluar
  setTimeout(() => {
    notification.style.animation =
      "notif-out 0.4s forwards, shine-green 1.2s linear 0.2s";
    notification.style.opacity = "0";
    notification.style.transform = "translateX(60px) scale(0.95)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 400);
  }, 3000);
}

// 📝 UPDATE CONTRACT ADDRESS DISPLAY
function updateContractAddressDisplay() {
  const contractAddressElement = document.getElementById("contract-address");
  const ca = COIN_CONFIG.contractAddress;
  if (contractAddressElement) {
    if (!ca || ca.trim() === "") {
      contractAddressElement.textContent = "Coming Soon";
      contractAddressElement.title = "";
    } else {
      const shortCA =
        ca.length > 20
          ? `${ca.substring(0, 8)}...${ca.substring(ca.length - 4)}`
          : ca;
      contractAddressElement.textContent = shortCA;
      contractAddressElement.title = ca; // Full CA di tooltip
    }
    // Selalu pasang ulang event listener copy
    enableContractAddressCopy();
  }
}

// ==========================================================
// PARALLAX BACKGROUND EFFECT
// ==========================================================

// Fungsi untuk efek parallax background
function initParallaxEffect() {
  const parallaxBg = document.querySelector(".parallax-bg");
  if (!parallaxBg) return;

  let isMoving = false;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  // Konfigurasi parallax
  const parallaxConfig = {
    intensity: 15, // Intensitas pergerakan (pixel)
    smoothness: 0.1, // Kehalusan animasi (0-1)
    enabled: true,
  };

  // Event listener untuk mouse move
  document.addEventListener("mousemove", (e) => {
    if (!parallaxConfig.enabled) return;

    const rect = parallaxBg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Hitung posisi relatif cursor dari center
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;

    // Hitung target transform
    targetX = (mouseX / centerX) * parallaxConfig.intensity;
    targetY = (mouseY / centerY) * parallaxConfig.intensity;

    isMoving = true;
  });

  // Event listener untuk mouse leave
  document.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
  });

  // Animation loop untuk smooth movement
  function animateParallax() {
    if (isMoving) {
      // Smooth interpolation
      currentX += (targetX - currentX) * parallaxConfig.smoothness;
      currentY += (targetY - currentY) * parallaxConfig.smoothness;

      // Apply transform
      parallaxBg.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.05)`;

      // Check if movement is complete
      if (
        Math.abs(targetX - currentX) < 0.1 &&
        Math.abs(targetY - currentY) < 0.1
      ) {
        isMoving = false;
      }
    }

    requestAnimationFrame(animateParallax);
  }

  // Start parallax effect
  animateParallax();
}

// ==========================================================
// SOCIAL BUTTON HOVER EFFECT FOR NAVBAR
// ==========================================================

function initSocialButtonHover() {
  const navbarOverlay = document.querySelector(".navbar-overlay");
  const socialButtons = document.querySelectorAll(".btn-social");

  socialButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      navbarOverlay.classList.add("social-hover");
    });

    button.addEventListener("mouseleave", () => {
      navbarOverlay.classList.remove("social-hover");
    });
  });
}

// Initialize all functions when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initSocialButtonHover();
  initMarquee();
});

// ==========================================================
// MARQUEE ANIMATION FOR MULTIPLE ROWS
// ==========================================================

function initMarquee() {
  const marqueeWrappers = document.querySelectorAll(".marquee-content-wrapper");

  // Define base animation speed and duration - SLOWER
  const baseDesiredDuration = 25000; // Increased from 13000 to 25000 (slower)
  const totalUniqueImages = 8; // Number of unique images per row

  // Array of 18 unique placeholder image sources
  const imageSources = Array.from(
    { length: totalUniqueImages },
    (_, i) => `images/meme/${String(i + 1).padStart(1)}.png`
  );

  /**
   * Creates a more randomized array with controlled distribution
   * @param {Array} array - The array to shuffle
   * @param {number} rowIndex - The index of the current row
   * @returns {Array} The randomized array
   */
  function createRandomizedArray(array, rowIndex) {
    // Create a copy of the array
    const shuffled = [...array];

    // Simple shuffle for single row
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  marqueeWrappers.forEach((wrapper, index) => {
    let scrollAmount = 0;
    let scrollResetPoint = 0;
    let pixelsPerMs;
    let lastTimestamp = 0;
    let animationFrameId;
    let isPaused = false;

    // Create a randomized array for this row
    const randomizedImages = createRandomizedArray(imageSources, index);

    // Populate the marquee wrapper with images
    function populateMarqueeImages() {
      wrapper.innerHTML = ""; // Clear existing images

      // Create three sets of images for seamless looping
      const imagesToAppend = [
        ...randomizedImages,
        ...randomizedImages,
        ...randomizedImages,
      ];

      imagesToAppend.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Meme Picture ${i + 1}`;
        img.classList.add("marquee-image", "fade-in-image");

        // Add random delay for fade-in effect
        img.style.animationDelay = `${Math.random() * 0.5}s`;

        // Add hover events to pause animation
        img.addEventListener("mouseenter", () => {
          isPaused = true;
        });

        img.addEventListener("mouseleave", () => {
          isPaused = false;
          lastTimestamp = performance.now(); // Reset timestamp to avoid jump
        });

        img.onerror = function () {
          this.onerror = null;
          this.src = `images/meme/${String(
            (i % totalUniqueImages) + 1
          ).padStart(1)}.png`;
        };
        wrapper.appendChild(img);
      });
    }

    populateMarqueeImages();

    function calculateMarqueeMetricsForWrapper() {
      const allImagesLoaded = Array.from(
        wrapper.querySelectorAll(".marquee-image")
      ).every((img) => img.complete);

      if (allImagesLoaded && wrapper.scrollWidth > 0) {
        const imageWidth = wrapper.querySelector(".marquee-image").offsetWidth;
        const imageMarginRight = parseFloat(
          getComputedStyle(wrapper.querySelector(".marquee-image")).marginRight
        );

        // Adjust scroll reset point for three sets of images
        scrollResetPoint = (imageWidth + imageMarginRight) * totalUniqueImages;

        // Slower speed for single row
        const speedMultiplier = 0.8; // Even slower
        pixelsPerMs =
          (scrollResetPoint / baseDesiredDuration) * speedMultiplier;
      } else {
        setTimeout(calculateMarqueeMetricsForWrapper, 100);
      }
    }

    calculateMarqueeMetricsForWrapper();

    function animateMarquee(timestamp) {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      // Only animate if not paused
      if (!isPaused) {
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        const scrollIncrement = pixelsPerMs * deltaTime;
        scrollAmount -= scrollIncrement;

        if (scrollAmount <= -scrollResetPoint) {
          scrollAmount += scrollResetPoint;
        }
        wrapper.style.transform = `translateX(${scrollAmount}px)`;
      } else {
        // If paused, don't update lastTimestamp to maintain position
        lastTimestamp = timestamp;
      }

      animationFrameId = requestAnimationFrame(animateMarquee);
    }

    window.addEventListener("load", () => {
      calculateMarqueeMetricsForWrapper();
      requestAnimationFrame(animateMarquee);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        lastTimestamp = performance.now();
      }
    });
  });
}

// Fungsi untuk mengambil jumlah holder dari Moralis API (dinamis sesuai contract address)
async function fetchHolderCount(contractAddress) {
  const apiKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjBmZDAxN2E1LTMxZTctNDMwMi04MDI5LWI1YTg3NTQwNDYzZCIsIm9yZ0lkIjoiNDU1ODEzIiwidXNlcklkIjoiNDY4OTcxIiwidHlwZUlkIjoiZDk0MjBkMjgtMmZlNy00ZDA2LWEwNjktNDVkMGQ0OTA0ODA4IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTA5MDQ2MzgsImV4cCI6NDkwNjY2NDYzOH0.f9wHSnD9DrARBDQVPOEd0XdZdGR7Rqdz1Hyx_q3dTw8";
  const url = `https://solana-gateway.moralis.io/token/mainnet/holders/${contractAddress}`;
  try {
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
    });
    if (response.ok) {
      const data = await response.json();
      if (typeof data.total === "number") {
        console.log("✅ Holder count from Moralis:", data.total);
        return data.total;
      } else if (Array.isArray(data.result)) {
        console.log(
          "✅ Holder count from Moralis (array):",
          data.result.length
        );
        return data.result.length;
      }
    }
    console.warn(
      "⚠️ Moralis API tidak mengembalikan data holder yang valid, fallback ke 9180"
    );
    return 9180;
  } catch (err) {
    console.error("❌ Error fetching from Moralis:", err);
    return 9180;
  }
}

function updateDynamicLinks() {
  const ca = COIN_CONFIG.contractAddress;
  const buyLink = document.getElementById("buy-link");
  const buyLinkNavbar = document.getElementById("buy-link-navbar");
  const chartLink = document.getElementById("chart-link");
  if (!ca || ca.trim() === "") {
    if (buyLink) buyLink.href = "https://letsbonk.fun/";
    if (buyLinkNavbar) buyLinkNavbar.href = "https://letsbonk.fun/";
    if (chartLink) chartLink.href = "https://dexscreener.com/solana";
  } else {
    if (buyLink) buyLink.href = `https://letsbonk.fun/token/${ca}`;
    if (buyLinkNavbar) buyLinkNavbar.href = `https://letsbonk.fun/token/${ca}`;
    if (chartLink) chartLink.href = `https://dexscreener.com/solana/${ca}`;
  }
}

// Tambahkan event listener untuk copy contract address card
function enableContractAddressCopy() {
  const contractAddressElement = document.getElementById("contract-address");
  if (contractAddressElement) {
    contractAddressElement.style.cursor = "pointer";
    contractAddressElement.title = "Click to copy";
    // Use simple onclick handler
    contractAddressElement.onclick = function () {
      const text = contractAddressElement.textContent;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showNotification(`Copied: ${text}`, "success");
        })
        .catch(() => {
          showNotification("Failed to copy", "error");
        });
    };
  }
}

// Initialize Twitter embeds
function initTwitterEmbeds() {
  // Array of tweet URLs to embed
  const tweetUrls = [
    "https://x.com/gupthemonk/status/1938275411634397528",
    "https://x.com/gupthemonk/status/1938227886827188685",
    "https://x.com/gupthemonk/status/1938279538162614280",
  ];

  // Load Twitter widgets script if not already loaded
  if (!window.twttr) {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.charset = "utf-8";
    script.async = true;
    document.head.appendChild(script);
  }

  // Function to create tweet embed
  function createTweetEmbed(containerId, tweetUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create blockquote element for Twitter embed
    const blockquote = document.createElement("blockquote");
    blockquote.className = "twitter-tweet";
    blockquote.setAttribute("data-theme", "dark");

    const link = document.createElement("a");
    link.href = tweetUrl;
    blockquote.appendChild(link);

    // Clear loading state and add tweet
    container.innerHTML = "";
    container.appendChild(blockquote);

    // Load the tweet
    if (window.twttr && window.twttr.widgets) {
      window.twttr.widgets.load(container);
    } else {
      // Fallback if Twitter widgets not loaded yet
      setTimeout(() => {
        if (window.twttr && window.twttr.widgets) {
          window.twttr.widgets.load(container);
        }
      }, 1000);
    }
  }

  // Initialize each tweet embed
  tweetUrls.forEach((url, index) => {
    const containerId = `twitter-embed-${index + 1}`;
    createTweetEmbed(containerId, url);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  enableContractAddressCopy();
  initTwitterEmbeds();
});

// ==========================================================
// STATIC TWEET DATA SYSTEM
// ==========================================================

// Load tweets dari static JSON file
async function loadStaticTweets() {
  try {
    console.log("📄 Loading static tweets...");
    const response = await fetch("tweets-data.json");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Static tweets loaded:", data.tweets.length, "tweets");

    // Update UI dengan static data
    updateTwitterFromStaticData(data.tweets);

    // Store data untuk debugging
    window.staticTweetsData = data;

    return data.tweets;
  } catch (error) {
    console.error("❌ Error loading static tweets:", error);

    // Fallback ke sample data
    const fallbackTweets = getFallbackTweets();
    updateTwitterFromStaticData(fallbackTweets);

    return fallbackTweets;
  }
}

// Update Twitter containers dari static data
function updateTwitterFromStaticData(tweets) {
  const containers = document.querySelectorAll(".twitter-embed-container");

  containers.forEach((container, index) => {
    if (tweets[index]) {
      const tweet = tweets[index];
      const loadingElement = container.querySelector(".twitter-loading");

      if (loadingElement) {
        loadingElement.innerHTML = `
					<div class="bg-[#23272f] border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
						<div class="flex items-start gap-3 mb-4">
							<i class="fab fa-twitter text-2xl text-purple-400 mt-1"></i>
							<div class="flex-1">
								<h3 class="text-white font-bold">@elonmusk</h3>
								<p class="text-gray-400 text-sm">${formatDate(tweet.date)}</p>
							</div>
						</div>
						
						<!-- Tweet Text -->
						<div class="text-gray-300 text-sm leading-relaxed mb-4">
							${tweet.text}
						</div>
						
						<!-- Tweet Images -->
						${
              tweet.images && tweet.images.length > 0
                ? `
							<div class="tweet-images mb-4">
								${tweet.images
                  .map(
                    (img, imgIndex) => `
									<div class="tweet-image-container mb-2">
										<img src="${img}" alt="Tweet image ${imgIndex + 1}" 
											 class="tweet-image rounded-lg max-w-full h-auto object-cover"
											 onerror="handleImageError(this)"
											 loading="lazy">
									</div>
								`
                  )
                  .join("")}
							</div>
						`
                : ""
            }
						
						<!-- Link to Original Tweet -->
						<a href="${tweet.link}" target="_blank" rel="noopener noreferrer" 
						   class="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
							<span>Read on X</span>
							<i class="fas fa-external-link-alt text-xs"></i>
						</a>
					</div>
				`;

        // Add event listeners untuk images setelah DOM update
        setTimeout(() => {
          const tweetImages = container.querySelectorAll(".tweet-image");
          tweetImages.forEach((img) => {
            img.addEventListener("error", () => handleImageError(img));
            img.addEventListener("load", () => {
              img.parentElement.classList.remove("loading");
            });
          });
        }, 100);
      }
    }
  });
}

// Format date untuk display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}

// Fallback tweets jika JSON file tidak ada
function getFallbackTweets() {
  return [
    {
      id: "fallback-1",
      text: "🚀 Exciting developments in AI and space technology! The future is looking bright for humanity's expansion into the cosmos.",
      date: new Date().toISOString(),
      images: [],
      link: "https://twitter.com/elonmusk",
    },
    {
      id: "fallback-2",
      text: "Tesla Cybertruck production ramping up nicely! This revolutionary vehicle is changing the game in automotive design.",
      date: new Date(Date.now() - 3600000).toISOString(),
      images: [],
      link: "https://twitter.com/elonmusk",
    },
    {
      id: "fallback-3",
      text: "Neuralink making incredible progress! Brain-computer interfaces will revolutionize how we interact with technology.",
      date: new Date(Date.now() - 7200000).toISOString(),
      images: [],
      link: "https://twitter.com/elonmusk",
    },
  ];
}

// ==========================================================
// ADMIN INTERFACE FOR EASY UPDATES
// ==========================================================

// Create admin panel untuk update tweets
function createAdminPanel() {
  // Only show admin panel if URL has admin parameter
  if (!window.location.search.includes("admin=true")) {
    return;
  }

  const adminPanel = document.createElement("div");
  adminPanel.id = "admin-panel";
  adminPanel.innerHTML = `
		<div class="fixed top-4 right-4 bg-[#23272f] border border-white/10 rounded-2xl p-4 z-50 max-w-md">
			<h3 class="text-white font-bold mb-3">🛠️ Tweet Admin Panel</h3>
			
			<div class="space-y-3">
				<button onclick="addNewTweet()" class="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm">
					➕ Add New Tweet
				</button>
				
				<button onclick="exportTweetsData()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">
					📤 Export Data
				</button>
				
				<button onclick="importTweetsData()" class="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm">
					📥 Import Data
				</button>
				
				<button onclick="toggleAdminPanel()" class="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">
					❌ Close Panel
				</button>
			</div>
			
			<div class="mt-3 text-xs text-gray-400">
				Last updated: <span id="last-updated">Loading...</span>
			</div>
		</div>
	`;

  document.body.appendChild(adminPanel);
  updateLastUpdatedTime();
}

// Add new tweet function
function addNewTweet() {
  const tweetData = prompt(`
Enter new tweet data (JSON format):
{
  "text": "Your tweet text here",
  "images": ["image_url1", "image_url2"],
  "link": "https://twitter.com/elonmusk/status/..."
}
    `);

  if (tweetData) {
    try {
      const newTweet = JSON.parse(tweetData);
      newTweet.id = Date.now().toString();
      newTweet.date = new Date().toISOString();

      // Add to current data
      if (window.staticTweetsData) {
        window.staticTweetsData.tweets.unshift(newTweet);
        updateTwitterFromStaticData(window.staticTweetsData.tweets);
        showNotification("✅ New tweet added!", "success");
      }
    } catch (error) {
      showNotification("❌ Invalid JSON format!", "error");
    }
  }
}

// Export tweets data
function exportTweetsData() {
  if (window.staticTweetsData) {
    const dataStr = JSON.stringify(window.staticTweetsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "tweets-data.json";
    link.click();

    URL.revokeObjectURL(url);
    showNotification("📤 Data exported!", "success");
  }
}

// Import tweets data
function importTweetsData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = JSON.parse(e.target.result);
          window.staticTweetsData = data;
          updateTwitterFromStaticData(data.tweets);
          showNotification("📥 Data imported!", "success");
        } catch (error) {
          showNotification("❌ Invalid JSON file!", "error");
        }
      };
      reader.readAsText(file);
    }
  };

  input.click();
}

// Toggle admin panel
function toggleAdminPanel() {
  const panel = document.getElementById("admin-panel");
  if (panel) {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
}

// Update last updated time
function updateLastUpdatedTime() {
  const lastUpdatedElement = document.getElementById("last-updated");
  if (lastUpdatedElement && window.staticTweetsData) {
    const lastUpdated = new Date(window.staticTweetsData.lastUpdated);
    lastUpdatedElement.textContent = lastUpdated.toLocaleString();
  }
}

// ==========================================================
// INITIALIZATION
// ==========================================================

// Initialize static tweet system
// DISABLED: Static tweet system - using Tweet IDs instead
async function initializeStaticTweetSystem() {
  console.log(
    "🚫 Static tweet system disabled - using Tweet IDs system instead"
  );
  // This function is disabled to prevent conflicts with Tweet IDs system
}

// Initialize the system
document.addEventListener("DOMContentLoaded", function () {
  // Initialize specific tweet IDs system (ONLY THIS ONE)
  loadSpecificGABOTweets();

  // Keep other initializations
  initializeLenis();
  initializeAOS();
  initializeMarquee();
  initializeFlipCards();
});

// ==========================================================
// TWITTER FEED - OPSI 1: TWEET IDS SPESIFIK
// ==========================================================

// 🔧 KONFIGURASI TWEET IDS - UBAH INI SAJA!
const jaxTweetIds = [
  "1940286776566063543", // Tweet 1 dari @elonmusk
  "1940286776566063543", // Tweet 2 dari @elonmusk
  "1940286776566063543", // Tweet 3 dari @elonmusk
  "1940286776566063543", // Tweet 4 dari @elonmusk
  "1940286776566063543", // Tweet 5 dari @elonmusk
  "1940286776566063543", // Tweet 6 dari @elonmusk
];

// Load tweets berdasarkan Tweet IDs spesifik
async function loadSpecificGABOTweets() {
  console.log("🔄 Loading specific tweets...");
  console.log("📋 Tweet IDs to load:", jaxTweetIds);

  const containers = document.querySelectorAll(".twitter-embed-container");
  console.log("📦 Found containers:", containers.length);

  let loadedCount = 0;

  for (let i = 0; i < containers.length && i < jaxTweetIds.length; i++) {
    const container = containers[i];
    const tweetId = jaxTweetIds[i];
    const loadingElement = container.querySelector(".twitter-loading");

    console.log(`🎯 Processing container ${i + 1}, Tweet ID: ${tweetId}`);

    if (loadingElement) {
      try {
        // Show loading state
        loadingElement.innerHTML = `
                    <div class="bg-[#23272f] border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
                        <div class="flex items-start gap-3 mb-4">
                            <i class="fab fa-twitter text-2xl text-purple-400 mt-1"></i>
                            <div class="flex-1">
                                <h3 class="text-white font-bold">@elonmusk</h3>
                                <p class="text-gray-400 text-sm">Loading tweet...</p>
                            </div>
                        </div>
                        <div class="text-gray-300 text-sm leading-relaxed mb-4">
                            Loading tweet content...
                        </div>
                        <div class="animate-pulse bg-gray-600 h-32 rounded-lg mb-4"></div>
                        <div class="animate-pulse bg-gray-600 h-4 rounded w-24"></div>
                    </div>
                `;

        // Fetch tweet menggunakan Twitter oEmbed API
        const tweetData = await fetchTweetById(tweetId);

        if (tweetData) {
          // Update dengan data tweet yang sebenarnya
          loadingElement.innerHTML = `
                        <div class="bg-[#23272f] border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
                            <div class="flex items-start gap-3 mb-4">
                                <i class="fab fa-twitter text-2xl text-purple-400 mt-1"></i>
                                <div class="flex-1">
                                    <h3 class="text-white font-bold">@elonmusk</h3>
                                    <p class="text-gray-400 text-sm">${formatTweetDate(
                                      tweetData.created_at
                                    )}</p>
                                </div>
                            </div>
                            
                            <!-- Tweet Text -->
                            <div class="text-gray-300 text-sm leading-relaxed mb-4">
                                ${tweetData.text}
                            </div>
                            
                            <!-- Tweet Images -->
                            ${
                              tweetData.images && tweetData.images.length > 0
                                ? `
                                <div class="tweet-images mb-4">
                                    ${tweetData.images
                                      .map(
                                        (img, imgIndex) => `
                                        <div class="tweet-image-container mb-2">
                                            <img src="${img}" alt="Tweet image ${
                                          imgIndex + 1
                                        }" 
                                                 class="tweet-image rounded-lg max-w-full h-auto object-cover"
                                                 onerror="handleImageError(this)"
                                                 loading="lazy">
                                        </div>
                                    `
                                      )
                                      .join("")}
                                </div>
                            `
                                : ""
                            }
                            
                            <!-- Link to Original Tweet -->
                            <a href="https://twitter.com/elonmusk/status/${tweetId}" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                                <span>Read on X</span>
                                <i class="fas fa-external-link-alt text-xs"></i>
                            </a>
                        </div>
                    `;

          loadedCount++;
          console.log(`✅ Tweet ${tweetId} loaded successfully`);
        } else {
          // Fallback content jika tweet tidak bisa di-load
          loadingElement.innerHTML = `
                        <div class="bg-[#23272f] border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
                            <div class="flex items-start gap-3 mb-4">
                                <i class="fab fa-twitter text-2xl text-purple-400 mt-1"></i>
                                <div class="flex-1">
                                    <h3 class="text-white font-bold">@elonmusk</h3>
                                    <p class="text-gray-400 text-sm">Recent</p>
                                </div>
                            </div>
                            <div class="text-gray-300 text-sm leading-relaxed mb-4">
                                Exciting developments in AI and space technology! The future is looking bright for humanity's expansion into the cosmos. 🚀
                            </div>
                            <a href="https://twitter.com/elonmusk" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                                <span>Read on X</span>
                                <i class="fas fa-external-link-alt text-xs"></i>
                            </a>
                        </div>
                    `;
          console.log(`⚠️ Tweet ${tweetId} failed to load, using fallback`);
        }
      } catch (error) {
        console.error(`❌ Error loading tweet ${tweetId}:`, error);

        // Error fallback
        loadingElement.innerHTML = `
                    <div class="bg-[#23272f] border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
                        <div class="flex items-start gap-3 mb-4">
                            <i class="fab fa-twitter text-2xl text-purple-400 mt-1"></i>
                            <div class="flex-1">
                                <h3 class="text-white font-bold">@elonmusk</h3>
                                <p class="text-gray-400 text-sm">Recent</p>
                            </div>
                        </div>
                        <div class="text-gray-300 text-sm leading-relaxed mb-4">
                            Tesla Cybertruck production ramping up nicely! This revolutionary vehicle is changing the game in automotive design. 🚗
                        </div>
                        <a href="https://twitter.com/elonmusk" target="_blank" rel="noopener noreferrer" 
                           class="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                            <span>Read on X</span>
                            <i class="fas fa-external-link-alt text-xs"></i>
                        </a>
                    </div>
                `;
      }
    }
  }

  console.log(`🎉 Loaded ${loadedCount} tweets successfully`);
  return loadedCount;
}

// Fetch tweet data menggunakan Twitter oEmbed API
async function fetchTweetById(tweetId) {
  try {
    console.log(`🔍 Fetching tweet ${tweetId}...`);

    // Gunakan Twitter oEmbed API
    const response = await fetch(
      `https://publish.twitter.com/oembed?url=https://twitter.com/elonmusk/status/${tweetId}&omit_script=true&hide_thread=true&theme=dark`
    );

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📄 Raw response data:`, data);

    // Parse HTML content untuk ekstrak text dan images
    const { text, images } = parseTweetEmbed(data.html);

    console.log(`✅ Parsed tweet:`, { text, images });

    return {
      text: text,
      images: images,
      created_at: new Date().toISOString(), // Fallback date
      id: tweetId,
    };
  } catch (error) {
    console.error(`❌ Error fetching tweet ${tweetId}:`, error);
    return null;
  }
}

// Parse tweet embed HTML untuk ekstrak text dan images
function parseTweetEmbed(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Ekstrak text dari blockquote atau p element
  let text = "";
  const blockquote = tempDiv.querySelector("blockquote");
  if (blockquote) {
    const pElement = blockquote.querySelector("p");
    if (pElement) {
      text = pElement.textContent || pElement.innerText || "";
    }
  }

  // Ekstrak images
  const images = [];
  const imgElements = tempDiv.querySelectorAll("img");
  imgElements.forEach((img) => {
    if (img.src && img.src.includes("pbs.twimg.com")) {
      images.push(img.src);
    }
  });

  console.log("Parsed tweet text:", text);
  console.log("Parsed tweet images:", images);

  return { text, images };
}

// Format tweet date
function formatTweetDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return "Just now";
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ==========================================================
// END TWITTER FEED - OPSI 1: TWEET IDS SPESIFIK
// ==========================================================

// ==========================================================
// DYNAMIC IMAGE LOADING SYSTEM
// ==========================================================

// Array untuk menyimpan semua gambar yang ditemukan
let allImages = [];
let currentImageIndex = 0;

const memeImages = Array.from({ length: 10 }, (_, i) => `images_${i + 1}.png`);

// Fungsi untuk mendeteksi dan memuat gambar secara dinamis
async function loadImagesDynamically() {
  allImages = memeImages.map((filename, idx) => ({
    path: `images/meme/${filename}`,
    number: idx + 1,
    extension: filename.split(".").pop(),
  }));
  loadImagesToDOM();
}

// Fungsi untuk memuat gambar ke dalam DOM
function loadImagesToDOM() {
  const scrollableColumn = document.querySelector(".scrollable-column");

  // Menghapus semua section yang ada (kecuali footer)
  const existingSections = scrollableColumn.querySelectorAll(
    ".full-image-section"
  );
  existingSections.forEach((section) => section.remove());

  // Jika tidak ada gambar yang ditemukan, tampilkan pesan
  if (allImages.length === 0) {
    const noImagesSection = document.createElement("section");
    noImagesSection.className = "full-image-section";
    noImagesSection.innerHTML = `
            <div class="image-container" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
                <div style="text-align: center; color: white; padding: 2rem;">
                    <h2 style="font-size: 2rem; margin-bottom: 1rem;">No Images Found</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 1rem;">Please add images to the <code>images/meme/</code> folder</p>
                    <p style="font-size: 0.9rem; color: #888;">Expected format: images_1.pnf, images_2.png, etc.</p>
                    <button onclick="loadImagesDynamically()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #a855f7; border: none; border-radius: 0.5rem; color: white; cursor: pointer;">Retry Loading</button>
                </div>
            </div>
        `;

    const footer = scrollableColumn.querySelector("footer");
    scrollableColumn.insertBefore(noImagesSection, footer);

    console.log("⚠️ No images found, showing fallback message");
    return;
  }

  // Membuat section baru untuk setiap gambar
  allImages.forEach((image, index) => {
    const section = document.createElement("section");
    section.className = "full-image-section";

    // Array judul yang akan digunakan secara berulang
    const titles = [
      "Cosmic RAKY",
      "Space Explorer",
      "Stellar Power",
      "Nebula Dreams",
      "Galactic Warrior",
      "Star Child",
      "Cosmic Guardian",
      "Void Walker",
      "Stellar Evolution",
      "Cosmic Harmony",
      "Nebula Spirit",
      "Cosmic Legend",
      "Star Born",
      "Cosmic Force",
      "Void Master",
      "Stellar Guardian",
      "Cosmic Wanderer",
      "Nebula Dreamer",
      "Star Seeker",
      "Cosmic Phoenix",
      "Void Phoenix",
      "Stellar Knight",
      "Cosmic Sage",
      "Nebula Queen",
      "Star Prince",
      "Cosmic Emperor",
      "Void King",
      "Stellar Empress",
      "Cosmic Goddess",
      "Nebula Lord",
      "Star Warrior",
      "Cosmic Mage",
      "Void Sorcerer",
      "Stellar Archer",
      "Cosmic Paladin",
      "Nebula Ranger",
      "Star Assassin",
      "Cosmic Berserker",
      "Void Necromancer",
      "Stellar Druid",
      "Cosmic Monk",
      "Nebula Bard",
      "Star Rogue",
      "Cosmic Cleric",
      "Void Warlock",
      "Stellar Fighter",
      "Cosmic Wizard",
      "Nebula Barbarian",
    ];

    const title = titles[index % titles.length];

    section.innerHTML = `
            <div class="image-container">
                			<img src="${image.path}" alt="GABO Cosmic Meme ${image.number}" class="full-image" loading="lazy">
                <div class="image-overlay">
                    <div class="overlay-content">
                        <h2 class="overlay-title">
                            <i class="fas fa-long-arrow-alt-right arrow-icon"></i>
                            ${title}
                        </h2>
                    </div>
                </div>
                <div class="fade-overlay-top"></div>
                <div class="fade-overlay-bottom"></div>
            </div>
        `;

    // Menambahkan section sebelum footer
    const footer = scrollableColumn.querySelector("footer");
    scrollableColumn.insertBefore(section, footer);
  });

  console.log(`✅ Loaded ${allImages.length} images to DOM`);

  // Remove AOS refresh since we're not using AOS anymore
  // if (window.AOS) {
  //     AOS.refresh();
  // }
}

// Fungsi untuk menambah gambar baru secara dinamis
function addNewImage(imagePath, title = "New Cosmic Image") {
  const newImage = {
    path: imagePath,
    number: allImages.length + 1,
    extension: imagePath.split(".").pop(),
  };

  allImages.push(newImage);

  // Membuat section baru
  const scrollableColumn = document.querySelector(".scrollable-column");
  const section = document.createElement("section");
  section.className = "full-image-section";
  section.setAttribute("data-aos", "fade-up");

  section.innerHTML = `
        <div class="image-container">
            			<img src="${imagePath}" alt="GABO Cosmic Meme ${newImage.number}" class="full-image" loading="lazy">
            <div class="image-overlay">
                <div class="overlay-content">
                    <h2 class="overlay-title">
                        <i class="fas fa-long-arrow-alt-right arrow-icon"></i>
                        ${title}
                    </h2>
                </div>
            </div>
        </div>
    `;

  // Menambahkan section sebelum footer
  const footer = scrollableColumn.querySelector("footer");
  scrollableColumn.insertBefore(section, footer);

  console.log(`✅ Added new image: ${imagePath}`);
}

// Fungsi untuk menghapus gambar berdasarkan index
function removeImage(index) {
  if (index >= 0 && index < allImages.length) {
    allImages.splice(index, 1);
    loadImagesToDOM();
    console.log(`🗑️ Removed image at index ${index}`);
  }
}

// Fungsi untuk mengacak urutan gambar
function shuffleImages() {
  for (let i = allImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
  }
  loadImagesToDOM();
  console.log("🔀 Shuffled images");
}

// Fungsi untuk mendapatkan informasi gambar
function getImageInfo() {
  return {
    total: allImages.length,
    images: allImages.map((img) => ({
      path: img.path,
      number: img.number,
      extension: img.extension,
    })),
  };
}

// Event listener untuk memuat gambar saat DOM siap
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing dynamic image loading system...");

  // Memulai loading gambar secara dinamis
  loadImagesDynamically();

  // Menambahkan event listener untuk keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "r":
      case "R":
        if (e.ctrlKey) {
          e.preventDefault();
          loadImagesDynamically();
          console.log("🔄 Reloaded images");
        }
        break;
      case "s":
      case "S":
        if (e.ctrlKey) {
          e.preventDefault();
          shuffleImages();
        }
        break;
    }
  });

  console.log("⌨️ Keyboard shortcuts: Ctrl+R (reload), Ctrl+S (shuffle)");
});

// Export fungsi untuk penggunaan global
window.ImageLoader = {
  loadImagesDynamically,
  addNewImage,
  removeImage,
  shuffleImages,
  getImageInfo,
  loadImagesToDOM,
};
