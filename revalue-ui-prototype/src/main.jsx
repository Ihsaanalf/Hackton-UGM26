import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, ArrowRight, Camera, CheckCircle2, CircleDollarSign,
  Image as ImageIcon, Leaf, Recycle, Sparkles, Users, Wallet, Home,
  Package, UserRound, Bell, Lightbulb, Target, Factory, RefreshCw, Coins
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

const materialTips = {
  Plastic: "Kosongkan, bilas, dan lepas tutup atau labelnya sebelum dijual.",
  Paper_Cardboard: "Jaga tetap kering dan lipat kardus agar hemat tempat.",
  Glass: "Pisahkan berdasarkan warna dan hati-hati dengan pecahan.",
  Metal: "Remukkan kaleng dan bilas sisa isinya.",
  Organic: "Bisa dijadikan kompos, belum bisa ditukar menjadi uang.",
  Other: "Belum dapat ditukar menjadi uang.",
};

function App() {
  const [screen, setScreen] = useState("login");
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("revalue_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [sellWeight, setSellWeight] = useState("1");
  const [sellCalculation, setSellCalculation] = useState(null);
  const [focusMaterial, setFocusMaterial] = useState("");

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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
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

      setCurrentUser(userData.user);
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

      {screen === "home" && ( <HomeScreen go={go} user={currentUser} token={authToken} onPickMaterial={setFocusMaterial} />
        )}

        {screen === "scan" && (
          <ScanScreen
            go={go}
            handleImage={handleImage}
            loading={loading}
            error={error}
          />
        )}

        {screen === "result" && (
          <ResultScreen go={go} aiResult={aiResult} selectedImage={selectedImage} weight={sellWeight} setWeight={setSellWeight} />
        )}

        {screen === "sell" && (
          <SellScreen go={go} aiResult={aiResult} token={authToken} initialWeight={sellWeight} />
        )}

        {screen === "collective" && <CollectiveScreen go={go} />}

        {screen === "wallet" && <WalletScreen go={go} token={authToken} />}

        {screen === "materials" && <MaterialsScreen go={go} focus={focusMaterial} />}

        {screen === "recycle" && <RecycleScreen go={go} aiResult={aiResult} />}

        {screen === "impact" && <ImpactScreen go={go} token={authToken} />}

        {screen === "activity" && <ActivityScreen go={go} />}

        {screen === "profile" && <ProfileScreen go={go} />}

        {screen !== "login" && screen !== "register" && (
          <nav className="bottom-nav">
            <NavItem
              icon={<Home size={20} />}
              label="Home"
              active={screen === "home"}
              onClick={() => go("home")}
            />

            <NavItem
              icon={<Camera size={20} />}
              label="Scan"
              active={["scan", "result"].includes(screen)}
              onClick={() => go("scan")}
            />

            <NavItem
              icon={<Package size={20} />}
              label="Aktivitas"
              active={screen === "activity"}
              onClick={() => go("activity")}
            />

            <NavItem
              icon={<Wallet size={20} />}
              label="Wallet"
              active={screen === "wallet"}
              onClick={() => go("wallet")}

            />

            <NavItem
              icon={<UserRound size={20} />}
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

function NavItem({ icon, label, active, onClick }) {
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

function Header({ title, back, go }) {
  return (
    <header className="header">
      {back ? (
        <button
          className="icon-btn"
          onClick={() => go(back)}
        >
          <ArrowLeft size={21} />
        </button>
      ) : (
        <div className="brand-mark">
          <Leaf size={17} />
        </div>
      )}

      <strong>{title}</strong>

      {!back && (
        <button className="icon-btn ghost">
          <Bell size={19} />
        </button>
      )}

      {back && <div style={{ width: 40 }} />}
    </header>
  );
}

function HomeScreen({go, user, token, onPickMaterial}) {
  const [impact, setImpact] = useState(null);

  React.useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND_URL}/impact?period=today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setImpact(data))
      .catch(() => setImpact(null));
  }, [token]);

const [materials, setMaterials] = useState([]);

React.useEffect(() => {
  fetch(`${BACKEND_URL}/materials`)
    .then((res) => res.json())
    .then((data) => setMaterials(data.materials || []))
    .catch(() => setMaterials([]));
}, []);

const homeMaterials = materials.filter((m) =>
  ["Plastic", "Paper_Cardboard", "Metal"].includes(m.name)
);

  return (
    <main>
      <Header title="ReValue" go={go} />

      <section className="hero">
        <div>
          <h1>Halo, {user?.name?.split(" ")[0] || "Teman"} 👋</h1>
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
          <small style={{ cursor: "pointer" }} onClick={() => go("impact")}>
            Lihat detail ›
          </small>
        </div>

        <div className="stats">
          <Stat
            icon={<CircleDollarSign/>}
            value={`Rp${Number(impact?.total_income || 0).toLocaleString("id-ID")}`}
            label="Total Pendapatan"
          />

          <Stat
            icon={<Recycle/>}
            value={`${Number(impact?.total_kg || 0).toLocaleString("id-ID")} kg`}
            label="Material Tersalurkan"
          />

          <Stat
            icon={<Package/>}
            value={String(impact?.count || 0)}
            label="Transaksi"
          />
        </div>
      </section>

      <section>
        <div className="section-title">
          <span>Sampah yang Bisa Kamu Ubah</span>
          <small
            style={{ cursor: "pointer" }}
            onClick={() => {
              onPickMaterial("");
              go("materials");
            }}
          >
            Lihat semua ›
          </small>
        </div>

        <div className="material-row">
          {homeMaterials.map((m) => (
            <Material
              key={m.id}
              emoji={materialEmoji[m.name]}
              name={materialNames[m.name] || m.name}
              price={`Rp${Number(m.price_per_kg).toLocaleString("id-ID")}/kg`}
              onClick={() => {
                onPickMaterial(m.name);
                go("materials");
              }}
            />
          ))}
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

function Stat({ icon, value, label }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Material ({emoji, name, price, onClick}) {
  return (
    <div
      className="material-card"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
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

            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />

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

            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />

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
          <Sparkles size={20} />
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
            <Camera size={20} />
            Ambil Foto
          </button>


          {/* ==================================================
              GALERI
          ================================================== */}

          <label className="secondary-btn">

            <ImageIcon size={20} />
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
            <Camera size={20} />
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

        <Lightbulb size={19} />

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

function ResultScreen({ go, aiResult, selectedImage, weight, setWeight }) {

  // Nama material dan confidence berasal dari model AI.
  // Nilai "Plastic" hanya cadangan kalau aiResult kosong.
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

  const [estimate, setEstimate] = useState(null);

  React.useEffect(() => {
    const kg = Number(weight);
    if (!aiResult || !Number.isFinite(kg) || kg <= 0) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        material_name: prediction,
        weight_kg: String(kg),
      });
      fetch(`${BACKEND_URL}/calculate?${params}`)
        .then((res) => res.json())
        .then((data) => setEstimate(data))
        .catch(() => setEstimate(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [weight, prediction, aiResult]);

  const potentialValue = () => {
    if (!aiResult) return material.value;
    if (estimate?.exchangeable === false) return "Belum bisa ditukar";
    if (estimate?.net_value != null) {
      return `Rp${Number(estimate.net_value).toLocaleString("id-ID")}`;
    }
    return "Isi berat dulu";
  };

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
            <Sparkles size={14} />
            AI Recognition
          </span>

          <h2>{displayName}</h2>

          <span className="confidence">
            <CheckCircle2 size={15} />
            {confidence.toFixed(1)}% confidence
          </span>

        </div>

        <div className="result-metrics">

          <Metric
              icon={<Recycle/>}
              label="Estimasi Berat"
              value={aiResult ? `${weight || 0} kg` : material.weight} />

            <Metric
              icon={<CircleDollarSign/>}
              label="Potensi Nilai"
              value={potentialValue()}
              sub={aiResult ? "Setelah biaya pickup" : material.range}/>

        </div>

        <div className="weight-field">
          <label>
            Perkiraan berat (kg)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="field-input"
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
            icon={<Coins size={21} />}
            onClick={() => go("sell")}
          />

          <Action
            title="Gabungkan"
            text="Kumpulkan bersama pengguna lain."
            icon={<Users size={21} />}
            onClick={() => go("collective")}
            featured
          />

          <Action
            title="Daur Ulang"
            text="Langsung ke mitra recycler kami."
            icon={<Recycle size={21} />}
            onClick={() => go("recycle")}
            style={{ gridColumn: "1 / -1", minHeight: 90 }}
          />
        </div>

      </section>

      <div className="info-box">

        <Lightbulb size={20} />

        Menggabungkan material dengan pengguna lain bisa meningkatkan volume sehingga lebih menarik bagi pembeli/recycler.

      </div>

      <button
        className="primary-btn full"
        onClick={() => go("collective")}
      >
        Lanjutkan
        <ArrowRight size={19} />
      </button>

    </main>
  );
}

function Metric({ icon, label, value, sub }) {
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

function Action({ title, text, icon, onClick, featured, style }) {
  return (
    <button
      className={`action-card ${featured ? "featured" : ""}`}
      onClick={onClick}
      style={style}
    >
      <span className="action-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </button>
  );
}

function CollectiveScreen({go}) {
  const [joined, setJoined] = useState(false);

  React.useEffect(() => {
    if (!joined) return;
    const timer = setTimeout(() => go("home"), 2000);
    return () => clearTimeout(timer);
  }, [joined]);

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
          <i style={{ width: "73%" }} />
        </div>

        <div className="progress-foot">
          <span>73 kontributor</span>
          <span>Rp423.400 est.</span>
        </div>

      </section>

      <section className="card explanation">

        <h3><Target size={17} /> Kenapa digabung?</h3>

        <p>
          Material dalam jumlah besar lebih mudah disalurkan ke recycler dan dapat memenuhi kebutuhan volume mereka.
        </p>

      </section>

      <section className="partner">

        <span><Factory size={15} /> Dibutuhkan oleh</span>

        <strong>EcoCycle Recycler</strong>

        <small>
          Kebutuhan: 100–500 kg PET
        </small>

      </section>

      {joined && (
  <div className="info-box">
    ✅ Berhasil! Sampahmu masuk daftar Collective #024. Status: Menunggu penggabungan.
  </div>
)}

    <button
      className="primary-btn full"
      onClick={() => setJoined(true)}
      disabled={joined} >  
      {joined ? "Berhasil bergabung ✓" : "+ Masukkan Sampahku"}
    </button>

    </main>
  );
}


function SellScreen({ go, aiResult, token, initialWeight }) {
  const [weight, setWeight] = useState(initialWeight || "1");
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transaction, setTransaction] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickup, setPickup] = useState(null);
  const [completed, setCompleted] = useState(false);

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
        { method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
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

  const simulateComplete = async () => {
  if (!transaction?.id) return;

  setLoading(true);
  setMessage("");

  try {
    const response = await fetch(
      `${BACKEND_URL}/transactions/${transaction.id}/simulate-complete`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.detail || data.message || "Gagal menyelesaikan simulasi.");
    }

    setCompleted(true);
    setMessage(
      `Saldo bertambah Rp${Number(data.amount_credited).toLocaleString("id-ID")}!`
    );
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
          className="field-input"
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
                  className="field-input"
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

                {!completed && (
                  <button
                    className="primary-btn full"
                    style={{ marginTop: 12 }}
                    onClick={simulateComplete}
                    disabled={loading}
                  >
                    {loading ? "Memproses..." : "Simulasikan Selesai (Demo)"}
                  </button>
                )}

                {completed && (
                  <button
                    className="secondary-btn"
                    style={{ marginTop: 12 }}
                    onClick={() => go("wallet")}
                  >
                    Buka Wallet
                  </button>
                )}

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


function WalletScreen({ go, token }) {
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWallet = async () => {
    setLoading(true);
    setError("");

    try {
    const headers = { Authorization: `Bearer ${token}` };
    const [walletResponse, historyResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/wallet`, { headers }),
      fetch(`${BACKEND_URL}/wallet/history`, { headers }),
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

      <section className="card wallet-card">
        <p className="muted">Saldo wallet</p>

        {loading ? (
          <p className="loading-text">Memuat saldo...</p>
        ) : (
          <h2 className="balance">
            {rupiah(wallet?.balance)}
          </h2>
        )}

        <button
          className="secondary-btn"
          onClick={loadWallet}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Muat Ulang Saldo
        </button>

        {error && (
          <div className="info-box" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
      </section>

      <section className="card list-card">
        <h3>Riwayat Transaksi</h3>

        {!loading && history.length === 0 && (
          <p className="muted">Belum ada riwayat wallet.</p>
        )}

        {history.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-icon">
              <CircleDollarSign size={22} />
            </div>
            <div className="history-main">
              <strong>{item.description || "Transaksi ReValue"}</strong>
              <small>ID transaksi: {item.transaction_id}</small>
            </div>
            <strong className="history-amount">
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

function MaterialsScreen({ go, focus }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    fetch(`${BACKEND_URL}/materials`)
      .then((res) => res.json())
      .then((data) => setMaterials(data.materials || []))
      .catch(() => setError("Gagal memuat daftar material."))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...materials].sort(
    (a, b) => (b.name === focus) - (a.name === focus)
  );

  return (
    <main>
      <Header title="Harga Material" back="home" go={go} />

      {loading && <p className="muted">Memuat...</p>}
      {error && <div className="info-box">{error}</div>}

      {sorted.map((m) => (
        <div
          key={m.id}
          className={`card material-item ${m.name === focus ? "focused" : ""}`}
        >
          <div className="material-item-head">
            <span className="material-item-emoji">
              {materialEmoji[m.name] || "♻️"}
            </span>
            <div>
              <strong>{materialNames[m.name] || m.name}</strong>
              <p>
                {m.is_exchangeable
                  ? `Rp${Number(m.price_per_kg).toLocaleString("id-ID")}/kg · min. ${m.min_weight_kg} kg`
                  : "Belum bisa ditukar menjadi uang"}
              </p>
            </div>
          </div>
          <small className="muted">{materialTips[m.name]}</small>
        </div>
      ))}

      <button className="primary-btn full" onClick={() => go("scan")}>
        Scan Sampah
        <ArrowRight size={19} />
      </button>
    </main>
  );
}

function RecycleScreen({ go, aiResult }) {
  const [chosen, setChosen] = useState("");

  const prediction = aiResult?.prediction || "Plastic";
  const displayName = materialNames[prediction] || prediction;
  const emoji = materialEmoji[prediction] || "♻️";

  // Data mitra masih contoh (prototype)
  const partners = [
    { name: "EcoCycle Recycler", info: "Terima Plastic dan Metal · ± 3 km" },
    { name: "Bank Sampah Hijau", info: "Terima semua material daur ulang · ± 1,5 km" },
  ];

  React.useEffect(() => {
    if (!chosen) return;
    const timer = setTimeout(() => go("home"), 2500);
    return () => clearTimeout(timer);
  }, [chosen]);

  return (
    <main>
      <Header title="Daur Ulang" back="result" go={go} />

      <section className="card" style={{ padding: 20 }}>
        <h2>{emoji} {displayName}</h2>
        <p className="muted">
          Pilih mitra recycler yang akan menerima sampahmu langsung.
        </p>

        {partners.map((p) => (
          <div key={p.name} className="partner-item">
            <div className="partner-item-head">
              <div className="history-icon">
                <Factory size={21} />
              </div>
              <div>
                <strong>{p.name}</strong>
                <p>{p.info}</p>
              </div>
            </div>
            <button
              className="secondary-btn"
              onClick={() => setChosen(p.name)}
              disabled={Boolean(chosen)}
            >
              Pilih Mitra
            </button>
          </div>
        ))}
      </section>

      {chosen && (
        <div className="info-box">
          ✅ Berhasil! Sampahmu dikirim ke {chosen}. Status: Menunggu konfirmasi mitra.
        </div>
      )}
    </main>
  );
}

function ImpactScreen({ go, token }) {
  const periods = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "7 Hari" },
    { key: "month", label: "30 Hari" },
    { key: "all", label: "Semua" },
  ];

  const [period, setPeriod] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${BACKEND_URL}/impact?period=${period}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.detail || "Gagal memuat data.");
        }
        setData(result);
      } catch (err) {
        setError(err.message || "Gagal terhubung ke backend.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, token]);

  const rupiah = (v) => `Rp${Number(v || 0).toLocaleString("id-ID")}`;

  const statusLabel = {
    pending: "Menunggu",
    pickup_requested: "Pickup diminta",
    verified: "Terverifikasi",
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  return (
    <main>
      <Header title="Dampak & Riwayat" back="home" go={go} />

      <div className="tab-row">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`tab ${period === p.key ? "active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <div className="info-box">{error}</div>}

      <section className="card impact-card">
        <div className="stats">
          <Stat
            icon={<CircleDollarSign/>}
            value={rupiah(data?.total_income)}
            label="Total Pendapatan"
          />
          <Stat
            icon={<Recycle/>}
            value={`${Number(data?.total_kg || 0).toLocaleString("id-ID")} kg`}
            label="Material Tersalurkan"
          />
          <Stat
            icon={<Package/>}
            value={String(data?.count || 0)}
            label="Transaksi"
          />
        </div>
      </section>

      <section className="card list-card">
        <h3>Riwayat Transaksi</h3>

        {loading && <p className="muted">Memuat...</p>}

        {!loading && data?.items?.length === 0 && (
          <p className="muted">Belum ada transaksi di periode ini.</p>
        )}

        {data?.items?.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-icon">
              {materialEmoji[item.material_name] || "♻️"}
            </div>
            <div className="history-main">
              <strong>
                {materialNames[item.material_name] || item.material_name}
              </strong>
              <small>
                {item.weight_kg} kg · {formatDate(item.created_at)}
              </small>
            </div>
            <div className="history-side">
              <strong className="history-amount">{rupiah(item.net_value)}</strong>
              <span className={`status-pill ${item.status}`}>
                {statusLabel[item.status] || item.status}
              </span>
            </div>
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
        <div className="activity-icon"><Recycle size={24} /></div>
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
        <div className="activity-icon"><Wallet size={24} /></div>
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
        <div className="activity-icon"><UserRound size={24} /></div>
        <div className="activity-content">
          <h3>Pengguna ReValue</h3>
          <p>
            Selamat datang! Mulai perjalananmu
            mengubah sampah menjadi nilai.
          </p>
        </div>
      </div>

      <div className="activity-card">
        <div className="activity-icon"><Wallet size={24} /></div>
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
        <div className="activity-icon"><Camera size={24} /></div>
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
            <p className={`login-error ${String(error).startsWith("Akun berhasil") ? "is-success" : ""}`}>{error}</p>
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