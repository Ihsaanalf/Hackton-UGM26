import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, ArrowRight, Camera, CheckCircle2, CircleDollarSign,
  Image as ImageIcon, Leaf, Recycle, Sparkles, Users, Wallet, Home,
  Package, UserRound, Bell, Lightbulb
} from "lucide-react";
import "./styles.css";

const API_URL = "http://127.0.0.1:8000";
const BACKEND_URL = "http://127.0.0.1:8001";

const material = {
  name: "Botol Plastik PET",
  confidence: 92,
  weight: "1,2 kg",
  value: "Rp5.400",
  range: "Rp4.500 – Rp6.000"
};

const materialNames = {
  Glass: "Glass",
  Metal: "Metal",
  Organic: "Organic",
  Other: "Other",
  Paper_Cardboard: "Paper & Cardboard",
  Plastic: "Plastic"
};

const materialEmoji = {
  Glass: "🍾",
  Metal: "🥫",
  Organic: "🌱",
  Other: "📦",
  Paper_Cardboard: "📄",
  Plastic: "🧴"
};


function App() {
  const [screen, setScreen] = useState("login");
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("revalue_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [sellWeight, setSellWeight] = useState("1");
  const [sellCalculation, setSellCalculation] = useState(null);

  // Data hasil AI
  const [aiResult, setAiResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = (next) => setScreen(next);

  
const handleLogin = async (email, password) => {
  try {
    setLoading(true);
    setError("");

    const response = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ 
        sername: email, 
        password: password, 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Login gagal.");
    }

    const token = data.access_token;

    if (!token) {
      throw new Error("Token login tidak ditemukan.");
    }

    localStorage.setItem("revalue_token", token);
    setAuthToken(token);

    const userResponse = await fetch(`${BACKEND_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      throw new Error(userData.detail || "Gagal mengambil profil.");
    }

    setCurrentUser(userData);
    setScreen("home");
  } catch (err) {
    setError(err.message || "Tidak dapat terhubung ke backend.");
  } finally {
    setLoading(false);
  }
};


const handleRegister = async (name, email, password) => {
  try {
    setLoading(true);
    setError("");

    const response = await fetch(`${BACKEND_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Pendaftaran gagal. Periksa data akunmu."
      );
    }

    setScreen("login");
    setError("Akun berhasil dibuat! Silakan login.");
  } catch (err) {
    setError(err.message || "Tidak dapat terhubung ke backend.");
  } finally {
    setLoading(false);
  }
};


  const handleImage = async (file) => {
    if (!file) return;

    setError("");
    setLoading(true);

    // Tampilkan preview gambar
    const previewUrl = URL.createObjectURL(file);
    setSelectedImage(previewUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("AI gagal memproses gambar.");
      }

      setAiResult(data);
      setScreen("result");

    } catch (err) {
      console.error(err);
      setError(
        "Gagal terhubung ke ReValue AI. Pastikan server AI sedang berjalan."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="phone">

        {screen === "login" && (
          <LoginScreen
            onLogin={handleLogin}
            loading={loading}
            error={error}
            goRegister={() => {
              setError("");
              setScreen("register");
            }}
          />
        )}

        {screen === "register" && (
          <RegisterScreen
            onRegister={handleRegister}
            loading={loading}
            error={error}
            goLogin={() => {
              setError("");
              setScreen("login");
            }}
          />
        )}

        {screen === "home" && <HomeScreen go={go} />}

        {screen === "scan" && (
          <ScanScreen
            go={go}
            handleImage={handleImage}
            loading={loading}
            error={error}
          />
        )}

        {screen === "result" && (
          <ResultScreen
            go={go}
            aiResult={aiResult}
            selectedImage={selectedImage}
          />
        )}

        {screen === "sell" && (
          <SellScreen
            go={go}
            aiResult={aiResult}
          />
        )}

        {screen === "collective" && <CollectiveScreen go={go} />}

        {screen === "wallet" && <WalletScreen go={go} />}

        {screen === "activity" && <ActivityScreen go={go} />}

        {screen === "profile" && <ProfileScreen go={go} />}

        {screen !== "login" && screen !== "register" && (
          <nav className="bottom-nav">
          <NavItem
            icon={<Home size={20}/>}
            label="Home"
            active={screen === "home"}
            onClick={() => go("home")}
          />

          <NavItem
            icon={<Camera size={20}/>}
            label="Scan"
            active={["scan","result"].includes(screen)}
            onClick={() => go("scan")}
          />

          <NavItem
            icon={<Package size={20} />}
            label="Aktivitas"
            active={screen === "activity"}
            onClick={() => go("activity")}
          />

          <NavItem
            icon={<Wallet size={20}/>}
            label="Wallet"
            active={screen === "wallet"}
            onClick={() => go("wallet")}

          />

          <NavItem
            icon={<UserRound size={20}/>}
            label="Profile"
            active={screen === "profile"}
            onClick={() => go("profile")}
          />
        </nav>
        )}
      </div>
    </div>
  );
}

function NavItem({icon, label, active, onClick}) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Header({title, back, go}) {
  return (
    <header className="header">
      {back ? (
        <button
          className="icon-btn"
          onClick={() => go(back)}
        >
          <ArrowLeft size={21}/>
        </button>
      ) : (
        <div className="brand-mark">
          <Leaf size={17}/>
        </div>
      )}

      <strong>{title}</strong>

      {!back && (
        <button className="icon-btn ghost">
          <Bell size={19}/>
        </button>
      )}

      {back && <div style={{width: 40}} />}
    </header>
  );
}

function HomeScreen({go}) {
  return (
    <main>
      <Header title="ReValue" go={go} />

      <section className="hero">
        <div>
          <h1>Halo, Azfa 👋</h1>
          <p>
            Sampah punya nilai,<br/>
            jangan buang sebelum tahu nilainya!
          </p>
        </div>

        <div className="hero-orb">
          <Leaf size={44}/>
        </div>
      </section>

      <button
        className="primary-btn scan-cta"
        onClick={() => go("scan")}
      >
        <Camera size={21}/>
        Scan Sampah
        <ArrowRight size={19}/>
      </button>

      <section className="card impact-card">
        <div className="section-title">
          <span>Dampakmu Hari Ini</span>
          <small>Lihat detail ›</small>
        </div>

        <div className="stats">
          <Stat
            icon={<CircleDollarSign/>}
            value="Rp127.500"
            label="Total Pendapatan"
          />

          <Stat
            icon={<Recycle/>}
            value="18,4 kg"
            label="Material Tersalurkan"
          />

          <Stat
            icon={<Package/>}
            value="12"
            label="Transaksi"
          />
        </div>
      </section>

      <section>
        <div className="section-title">
          <span>Sampah yang Bisa Kamu Ubah</span>
          <small>Lihat semua ›</small>
        </div>

        <div className="material-row">
          <Material
            emoji="🧴"
            name="Botol PET"
            price="Rp4.000/kg"
          />

          <Material
            emoji="📦"
            name="Kardus"
            price="Rp2.500/kg"
          />

          <Material
            emoji="🥫"
            name="Kaleng"
            price="Rp8.000/kg"
          />
        </div>
      </section>

      <section className="story-card">
        <div>
          <span className="eyebrow">CIRCULAR ECONOMY</span>

          <h3>
            Bersama kita wujudkan ekonomi sirkular.
          </h3>

          <p>
            Dari sampah rumah tangga, menuju masa depan yang lebih hijau.
          </p>
        </div>

        <ArrowRight size={20}/>
      </section>
    </main>
  );
}

function Stat({icon,value,label}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Material({emoji,name,price}) {
  return (
    <div className="material-card">
      <div className="emoji">{emoji}</div>
      <strong>{name}</strong>
      <span>{price}</span>
    </div>
  );
}

function ScanScreen({
  go,
  handleImage,
  loading,
  error
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      handleImage(file);
    }

    event.target.value = "";
  };

  // ============================================================
  // BUKA KAMERA
  // ============================================================

  const openCamera = async () => {
    try {
      setCameraError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          }
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraOpen(true);

      // Tunggu sampai video muncul
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);

    } catch (err) {
      console.error(err);

      setCameraError(
        "Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan."
      );
    }
  };

  // ============================================================
  // TUTUP KAMERA
  // ============================================================

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCameraOpen(false);
  };

  // ============================================================
  // AMBIL FOTO
  // ============================================================

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video) return;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File(
        [blob],
        "revalue-camera.jpg",
        {
          type: "image/jpeg"
        }
      );

      closeCamera();

      handleImage(file);

    }, "image/jpeg", 0.9);
  };

  return (
    <main className="scan-page">

      <Header
        title="Scan Sampah"
        back="home"
        go={go}
      />

      {/* ======================================================
          PREVIEW KAMERA / PLACEHOLDER
      ====================================================== */}

      <div className="camera-frame">

        {!cameraOpen ? (

          <div className="camera-placeholder">

            <div className="bottle">🧴</div>

            <span className="corner tl"/>
            <span className="corner tr"/>
            <span className="corner bl"/>
            <span className="corner br"/>

            <div className="camera-tip">
              ⚡ Arahkan kamera ke sampah dengan jelas
            </div>

          </div>

        ) : (

          <div className="camera-live">

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />

            <span className="corner tl"/>
            <span className="corner tr"/>
            <span className="corner bl"/>
            <span className="corner br"/>

            <div className="camera-live-tip">
              Arahkan kamera ke sampah
            </div>

          </div>

        )}

      </div>


      {/* ======================================================
          CAMERA ERROR
      ====================================================== */}

      {cameraError && (
        <div className="info-box">
          ⚠️ {cameraError}
        </div>
      )}


      {/* ======================================================
          AI LOADING
      ====================================================== */}

      {loading && (
        <div className="info-box">
          <Sparkles size={20}/>
          AI sedang menganalisis gambar...
        </div>
      )}


      {/* ======================================================
          ERROR API
      ====================================================== */}

      {error && (
        <div className="info-box">
          ⚠️ {error}
        </div>
      )}


      {/* ======================================================
          CAMERA BUTTON
      ====================================================== */}

      {!cameraOpen ? (

        <div className="scan-actions">

          <button
            className="primary-btn"
            onClick={openCamera}
          >
            <Camera size={20}/>
            Ambil Foto
          </button>


          {/* ==================================================
              GALERI
          ================================================== */}

          <label className="secondary-btn">

            <ImageIcon size={20}/>
            Upload dari Galeri

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

          </label>

        </div>

      ) : (

        <div className="scan-actions">

          <button
            className="primary-btn"
            onClick={capturePhoto}
          >
            <Camera size={20}/>
            Ambil Foto
          </button>

          <button
            className="secondary-btn"
            onClick={closeCamera}
          >
            Batal
          </button>

        </div>

      )}


      {/* ======================================================
          TIPS
      ====================================================== */}

      <div className="tip-card">

        <Lightbulb size={19}/>

        <div>

          <strong>Tips untuk hasil terbaik:</strong>

          <p>✓ Pastikan pencahayaan cukup</p>
          <p>✓ Posisikan satu jenis sampah dalam frame</p>
          <p>✓ Hindari sampah yang kotor atau basah</p>

        </div>

      </div>

    </main>
  );
}

function ResultScreen({
  go,
  aiResult,
  selectedImage
}) {

  // Kalau belum ada hasil AI, gunakan dummy lama
  const prediction =
    aiResult?.prediction || "Plastic";

  const confidenceRaw =
    aiResult?.confidence ?? material.confidence;

  const confidence =
    confidenceRaw <= 1
      ? confidenceRaw * 100
      : confidenceRaw;

  const displayName =
    materialNames[prediction] || prediction;

  const emoji =
    materialEmoji[prediction] || "♻️";

  return (
    <main>

      <Header
        title="Hasil Identifikasi"
        back="scan"
        go={go}
      />

      <section className="result-card">

        <div className="result-image">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt="Sampah yang dianalisis"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "18px"
              }}
            />
          ) : (
            emoji
          )}
        </div>

        <div className="result-info">

          <span className="ai-badge">
            <Sparkles size={14}/>
            AI Recognition
          </span>

          <h2>{displayName}</h2>

          <span className="confidence">
            <CheckCircle2 size={15}/>
            {confidence.toFixed(1)}% confidence
          </span>

        </div>

        <div className="result-metrics">

          <Metric
            icon={<Recycle/>}
            label="Estimasi Berat"
            value={aiResult ? "Belum ditimbang" : material.weight}
          />

          <Metric
            icon={<CircleDollarSign/>}
            label="Potensi Nilai"
            value={aiResult ? "Akan dihitung" : material.value}
            sub={aiResult ? "Berdasarkan material & berat" : material.range}
          />

        </div>

      </section>

      <section>

        <h3 className="question">
          Apa yang ingin kamu lakukan?
        </h3>

        <p className="muted">
          Pilih opsi terbaik untuk sampahmu.
        </p>

        <div className="action-grid">

          <Action
            title="Jual"
            text="Dapatkan nilai ekonomis dari sampahmu."
            icon="♻️"
            onClick={() => go("sell")}
          />

          <Action
            title="Gabungkan"
            text="Kumpulkan bersama pengguna lain."
            icon="👥"
            onClick={() => go("collective")}
            featured
          />

          <Action
            title="Daur Ulang"
            text="Langsung ke mitra recycler kami."
            icon="🍃"
          />

          <Action
            title="Donasikan"
            text="Untuk program sosial yang membutuhkan."
            icon="🎁"
          />

        </div>

      </section>

      <div className="info-box">

        <Lightbulb size={20}/>

        Menggabungkan material dengan pengguna lain bisa meningkatkan volume sehingga lebih menarik bagi pembeli/recycler.

      </div>

      <button
        className="primary-btn full"
        onClick={() => go("collective")}
      >
        Lanjutkan
        <ArrowRight size={19}/>
      </button>

    </main>
  );
}

function Metric({icon,label,value,sub}) {
  return (
    <div className="metric">
      <div className="metric-icon">
        {icon}
      </div>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

function Action({
  title,
  text,
  icon,
  onClick,
  featured
}) {
  return (
    <button
      className={`action-card ${featured ? "featured" : ""}`}
      onClick={onClick}
    >
      <span className="action-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </button>
  );
}

function CollectiveScreen({go}) {
  return (
    <main>

      <Header
        title="Kumpulkan Bersama"
        back="result"
        go={go}
      />

      <div className="collective-hero">
        <div className="big-material">🧴</div>

        <div>
          <span className="eyebrow">
            PET BOTOL BENING
          </span>

          <h1>Collective #024</h1>
        </div>
      </div>

      <section className="card progress-card">

        <div className="progress-head">
          <strong>73 kg / 100 kg</strong>
          <span>73%</span>
        </div>

        <div className="progress">
          <i style={{width:"73%"}}/>
        </div>

        <div className="progress-foot">
          <span>73 kontributor</span>
          <span>Rp423.400 est.</span>
        </div>

      </section>

      <section className="card explanation">

        <h3>🎯 Kenapa digabung?</h3>

        <p>
          Material dalam jumlah besar lebih mudah disalurkan ke recycler dan dapat memenuhi kebutuhan volume mereka.
        </p>

      </section>

      <section className="partner">

        <span>🏭 Dibutuhkan oleh</span>

        <strong>EcoCycle Recycler</strong>

        <small>
          Kebutuhan: 100–500 kg PET
        </small>

      </section>

      <button
        className="primary-btn full"
        onClick={() => go("home")}
      >
        + Masukkan Sampahku
      </button>

    </main>
  );
}


function SellScreen({ go, aiResult }) {
  const [weight, setWeight] = useState("1");
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transaction, setTransaction] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickup, setPickup] = useState(null);

  const materialName = aiResult?.prediction || "Plastic";
  const displayName = materialNames[materialName] || materialName;

  const calculateValue = async () => {
    const kg = Number(weight);

    if (!Number.isFinite(kg) || kg <= 0) {
      setMessage("Masukkan berat lebih dari 0 kg.");
      return;
    }

    setLoading(true);
    setMessage("");
    setCalculation(null);

    try {
      const params = new URLSearchParams({
        material_name: materialName,
        weight_kg: String(kg),
      });

      const response = await fetch(
        `${BACKEND_URL}/calculate?${params}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Gagal menghitung nilai.");
      }

      setCalculation(data);
    } catch (error) {
      setMessage(error.message || "Gagal terhubung ke backend.");
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async () => {
    const kg = Number(weight);

    if (!Number.isFinite(kg) || kg <= 0) {
      setMessage("Masukkan berat lebih dari 0 kg.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        material_name: materialName,
        estimated_weight_kg: String(kg),
      });

      const response = await fetch(
        `${BACKEND_URL}/transactions?${params}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.detail || data.message || "Transaksi gagal dibuat.");
      }

      setTransaction(data.transaction || data);
      setMessage("Transaksi berhasil dibuat!");
    } catch (error) {
      setMessage(error.message || "Gagal membuat transaksi.");
    } finally {
      setLoading(false);
    }
  };

  
  const createPickup = async () => {
    if (!transaction?.id) {
      setMessage("Transaksi belum tersedia.");
      return;
    }

    if (!pickupAddress.trim()) {
      setMessage("Masukkan alamat penjemputan.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        transaction_id: String(transaction.id),
        address: pickupAddress.trim(),
      });

      const response = await fetch(
        `${BACKEND_URL}/pickup?${params}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.detail || data.message || "Gagal mengajukan pickup."
        );
      }

      setPickup(data.pickup || data);
      setMessage("Pickup berhasil diajukan!");
    } catch (error) {
      setMessage(error.message || "Gagal terhubung ke backend.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main>
      <Header title="Jual Sampah" back="result" go={go} />

      <section className="card" style={{ padding: 20 }}>
        <h2>{displayName}</h2>
        <p className="muted">
          Masukkan estimasi berat sampahmu untuk menghitung nilai jual.
        </p>

        <label htmlFor="sell-weight">Berat estimasi (kg)</label>
        <input
          id="sell-weight"
          type="number"
          min="0.1"
          step="0.1"
          value={weight}
          onChange={(event) => {
            setWeight(event.target.value);
            setCalculation(null);
            setTransaction(null);
            setMessage("");
          }}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 8,
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />

        <button
          className="primary-btn full"
          onClick={calculateValue}
          disabled={loading || Boolean(transaction)}
        >
          {loading ? "Memproses..." : "Hitung Estimasi Nilai"}
        </button>

        {calculation && (
          <section style={{ marginTop: 20 }}>
            <p>Nilai kotor: <strong>Rp{Number(calculation.gross_value ?? 0).toLocaleString("id-ID")}</strong></p>
            <p>Biaya pickup: <strong>Rp{Number(calculation.pickup_fee ?? 0).toLocaleString("id-ID")}</strong></p>
            <p>Nilai bersih: <strong>Rp{Number(calculation.net_value ?? 0).toLocaleString("id-ID")}</strong></p>

            <button
              className="primary-btn full"
              onClick={createTransaction}
              disabled={loading || Boolean(transaction)}
            >
              Buat Transaksi
            </button>
          </section>
        )}

        {message && (
          <div className="info-box" style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        
        {transaction && (
          <section style={{ marginTop: 16 }}>
            <h3>Transaksi berhasil!</h3>
            <p>
              ID transaksi: <strong>{transaction.id}</strong>
            </p>
            <p>
              Status: <strong>{transaction.status}</strong>
            </p>

            {!pickup && (
              <section style={{ marginTop: 20 }}>
                <h3>Ajukan penjemputan</h3>
                <p className="muted">
                  Masukkan alamat tempat sampah akan dijemput.
                </p>

                <label htmlFor="pickup-address">
                  Alamat penjemputan
                </label>
                <textarea
                  id="pickup-address"
                  value={pickupAddress}
                  onChange={(event) =>
                    setPickupAddress(event.target.value)
                  }
                  placeholder="Contoh: Alamat Demo ReValue"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 8,
                    marginBottom: 12,
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />

                <button
                  className="primary-btn full"
                  onClick={createPickup}
                  disabled={loading}
                >
                  {loading ? "Memproses..." : "Ajukan Pickup"}
                </button>
              </section>
            )}

            {pickup && (
              <section style={{ marginTop: 20 }}>
                <h3>Pickup berhasil diajukan!</h3>
                <p>
                  ID pickup: <strong>{pickup.id}</strong>
                </p>
                <p>
                  Alamat: <strong>{pickup.address}</strong>
                </p>
                <p>
                  Status pickup: <strong>{pickup.status}</strong>
                </p>
              </section>
            )}

            <button
              className="secondary-btn"
              style={{ marginTop: 16 }}
              onClick={() => go("home")}
            >
              Kembali ke Beranda
            </button>
          </section>
        )}

      </section>
    </main>
  );
}


function WalletScreen({ go }) {
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWallet = async () => {
    setLoading(true);
    setError("");

    try {
      const [walletResponse, historyResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/wallet`),
        fetch(`${BACKEND_URL}/wallet/history`),
      ]);

      const walletData = await walletResponse.json();
      const historyData = await historyResponse.json();

      if (!walletResponse.ok || !historyResponse.ok) {
        throw new Error("Gagal mengambil data wallet dari backend.");
      }

      setWallet(walletData);
      setHistory(historyData.history || []);
    } catch (err) {
      setError(err.message || "Gagal memuat wallet.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadWallet();
  }, []);

  const rupiah = (value) =>
    `Rp${Number(value || 0).toLocaleString("id-ID")}`;

  return (
    <main>
      <Header title="Wallet ReValue" back="home" go={go} />

      <section className="card" style={{ padding: 20 }}>
        <p className="muted">Saldo wallet</p>

        {loading ? (
          <p>Memuat saldo...</p>
        ) : (
          <h2 style={{ fontSize: 30 }}>
            {rupiah(wallet?.balance)}
          </h2>
        )}

        <button
          className="secondary-btn"
          onClick={loadWallet}
          disabled={loading}
        >
          Muat Ulang Saldo
        </button>

        {error && (
          <div className="info-box" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <h3 style={{ marginTop: 24 }}>Riwayat Transaksi</h3>

        {!loading && history.length === 0 && (
          <p className="muted">Belum ada riwayat wallet.</p>
        )}

        {history.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "14px 0",
              borderBottom: "1px solid #e5ebe7",
            }}
          >
            <strong>{item.description || "Transaksi ReValue"}</strong>
            <p style={{ margin: "6px 0" }}>
              ID transaksi: {item.transaction_id}
            </p>
            <strong>
              {item.transaction_type === "credit" || item.type === "credit"
                ? "+"
                : ""}
              {rupiah(item.amount)}
            </strong>
          </div>
        ))}
      </section>
    </main>
  );
}



function ActivityScreen({ go }) {
  return (
    <div className="screen activity-screen">
      <div className="page-heading">
        <p className="eyebrow">REVALUE</p>
        <h2>Aktivitas Saya</h2>
        <p>Pantau perjalanan sampahmu menjadi nilai.</p>
      </div>

      <div className="activity-card">
        <div className="activity-icon">♻️</div>
        <div className="activity-content">
          <h3>Penukaran Sampah</h3>
          <p>
            Lihat proses penjemputan dan penukaran
            sampahmu.
          </p>
          <button
            className="primary-button"
            onClick={() => go("sell")}
          >
            Mulai Penukaran →
          </button>
        </div>
      </div>

      <div className="activity-card">
        <div className="activity-icon">💰</div>
        <div className="activity-content">
          <h3>Riwayat Saldo</h3>
          <p>
            Periksa saldo dan hasil penukaran yang
            sudah masuk ke Wallet.
          </p>
          <button
            className="secondary-button"
            onClick={() => go("wallet")}
          >
            Buka Wallet →
          </button>
        </div>
      </div>
    </div>
  );
}


function ProfileScreen({ go }) {
  return (
    <div className="screen activity-screen">
      <div className="page-heading">
        <p className="eyebrow">REVALUE</p>
        <h2>Profil Saya</h2>
        <p>Kelola akun dan aktivitasmu di ReValue.</p>
      </div>

      <div className="activity-card">
        <div className="activity-icon">👤</div>
        <div className="activity-content">
          <h3>Pengguna ReValue</h3>
          <p>
            Selamat datang! Mulai perjalananmu
            mengubah sampah menjadi nilai.
          </p>
        </div>
      </div>

      <div className="activity-card">
        <div className="activity-icon">💰</div>
        <div className="activity-content">
          <h3>Dompet Saya</h3>
          <p>Lihat saldo dan riwayat hasil penukaran.</p>
          <button
            className="primary-button"
            onClick={() => go("wallet")}
          >
            Buka Wallet →
          </button>
        </div>
      </div>

      <div className="activity-card">
        <div className="activity-icon">♻️</div>
        <div className="activity-content">
          <h3>Mulai Daur Ulang</h3>
          <p>Pindai sampah untuk mengetahui kategorinya.</p>
          <button
            className="secondary-button"
            onClick={() => go("scan")}
          >
            Scan Sampah →
          </button>
        </div>
      </div>
    </div>
  );
}



function LoginScreen({ onLogin, loading, error, goRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="screen login-screen">
      <div className="login-brand">
        <div className="login-logo">♻</div>
        <h1>ReValue</h1>
        <p>Give Waste a Second Value</p>
      </div>

      <div className="login-card">
        <div className="login-heading">
          <h2>Selamat Datang!</h2>
          <p>Masuk ke akunmu untuk melanjutkan.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login-error">{error}</p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Memproses..." : "Masuk ke Akun"}
          </button>
        </form>

        <div className="login-divider">
          <span>Pengguna baru?</span>
        </div>

        <button
          className="login-register"
          type="button"
          onClick={goRegister}
        >
          Buat Akun Baru
        </button>

        <p className="login-footer">
          Bersama kita wujudkan lingkungan yang lebih bersih 🌱
        </p>
      </div>
    </div>
  );
}


function RegisterScreen({ onRegister, loading, error, goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Konfirmasi password tidak cocok.");
      return;
    }

    onRegister(name, email, password);
  };

  return (
    <div className="screen login-screen">
      <div className="login-brand">
        <div className="login-logo">♻</div>
        <h1>ReValue</h1>
        <p>Give Waste a Second Value</p>
      </div>

      <div className="login-card">
        <div className="login-heading">
          <h2>Buat Akun Baru</h2>
          <p>Bergabung dan mulai ubah sampah menjadi nilai.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="register-name">Nama Lengkap</label>
            <input
              id="register-name"
              type="text"
              placeholder="Masukkan nama lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="register-confirm">Konfirmasi Password</label>
            <input
              id="register-confirm"
              type="password"
              placeholder="Ulangi password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {(formError || error) && (
            <p className="login-error">
              {formError || error}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>
        </form>

        <div className="login-divider">
          <span>Sudah punya akun?</span>
        </div>

        <button
          className="login-register"
          type="button"
          onClick={goLogin}
        >
          Masuk ke Akun
        </button>

        <p className="login-footer">
          Mulai langkah kecil untuk lingkungan yang lebih bersih 🌱
        </p>
      </div>
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);