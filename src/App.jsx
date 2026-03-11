import { useState, useEffect } from "react";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📸", color: "#E1306C" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#000000" },
  { id: "facebook", name: "Facebook", icon: "👍", color: "#1877F2" },
  { id: "twitter", name: "Twitter/X", icon: "🐦", color: "#1DA1F2" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2" },
];

const CONTENT_TYPES = [
  { id: "product_launch", label: "Lanzamiento de producto", emoji: "🚀" },
  { id: "promo", label: "Promoción / Descuento", emoji: "🏷️" },
  { id: "educational", label: "Contenido educativo", emoji: "📚" },
  { id: "behind_scenes", label: "Detrás de cámaras", emoji: "🎬" },
  { id: "testimonial", label: "Testimonio / Reseña", emoji: "⭐" },
  { id: "seasonal", label: "Temporada / Fechas clave", emoji: "🎄" },
];

const TONES = ["Profesional", "Casual", "Divertido", "Inspirador", "Urgente"];

function ContentCard({ title, children, accent = "#6366f1" }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
      borderTop: `3px solid ${accent}`,
    }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "#1e293b", fontWeight: 600 }}>{title}</h3>
      {children}
    </div>
  );
}

function PlatformBadge({ platform, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: 10,
      border: selected ? `2px solid ${platform.color}` : "2px solid #e2e8f0",
      background: selected ? `${platform.color}15` : "white",
      cursor: "pointer", fontSize: 13,
      fontWeight: selected ? 600 : 400,
      color: selected ? platform.color : "#64748b",
      transition: "all 0.2s",
    }}>
      <span>{platform.icon}</span> {platform.name}
    </button>
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600,
            background: i <= current ? "#6366f1" : "#e2e8f0",
            color: i <= current ? "white" : "#94a3b8",
          }}>{i + 1}</div>
          <span style={{
            fontSize: 13, color: i <= current ? "#1e293b" : "#94a3b8",
            fontWeight: i === current ? 600 : 400,
          }}>{s}</span>
          {i < steps.length - 1 && (
            <div style={{
              width: 24, height: 2,
              background: i < current ? "#6366f1" : "#e2e8f0", borderRadius: 2,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
        background: copied ? "#ecfdf5" : "white", cursor: "pointer", fontSize: 13,
        color: copied ? "#059669" : "#64748b", transition: "all 0.2s",
      }}
    >
      {copied ? "✅ Copiado" : "📋 Copiar"}
    </button>
  );
}

export default function AgenteContenido() {
  const [step, setStep] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [contentType, setContentType] = useState(null);
  const [productName, setProductName] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [activePlatformTab, setActivePlatformTab] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [canvaStatus, setCanvaStatus] = useState(null);
  const [canvaDesigns, setCanvaDesigns] = useState(null);
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaError, setCanvaError] = useState(null);

  // Check API + Canva status on mount
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setApiStatus)
      .catch(() => setApiStatus({ status: "error", hasApiKey: false }));
    fetch("/api/canva/status")
      .then((r) => r.json())
      .then(setCanvaStatus)
      .catch(() => setCanvaStatus({ connected: false, enabled: false }));
    // Handle canva oauth redirect result
    const params = new URLSearchParams(window.location.search);
    if (params.get("canva") === "connected") {
      setCanvaStatus((s) => ({ ...s, connected: true }));
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const togglePlatform = (id) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setStep(1);
    setLoadingPhase(0);

    const phases = [
      "Analizando tu marca y producto...",
      "Generando caption optimizado con IA...",
      "Creando hashtags y prompts de imagen...",
      "Optimizando para cada plataforma...",
    ];
    const interval = setInterval(() => {
      setLoadingPhase((prev) => (prev < phases.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          contentType,
          productName,
          tone: tone.toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Error al generar contenido");
      }

      setResult(data);
      setActivePlatformTab(selectedPlatforms[0]);
      setCanvaDesigns(null);
      setCanvaError(null);
      setStep(2);

      // Auto-trigger Canva designs if connected
      if (canvaStatus?.connected) {
        generateCanvaDesignsFromResult(data, selectedPlatforms[0]);
      }
    } catch (err) {
      setError(err.message);
      setStep(0);
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  const generateCanvaDesignsFromResult = async (data, platform) => {
    setCanvaLoading(true);
    setCanvaError(null);
    try {
      const res = await fetch("/api/canva/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: data.caption,
          imagePrompt: data.imagePrompt,
          productName,
          platform: platform || selectedPlatforms[0],
        }),
      });
      const canvaData = await res.json();
      if (!res.ok) throw new Error(canvaData.message || canvaData.error);
      setCanvaDesigns(canvaData.designs || []);
    } catch (err) {
      setCanvaError(err.message);
    } finally {
      setCanvaLoading(false);
    }
  };

  const schedulePost = () => {
    setScheduled((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: CONTENT_TYPES.find((c) => c.id === contentType),
        platforms: selectedPlatforms,
        date: result?.bestTime || "Próximo martes 7 PM",
        product: productName,
      },
    ]);
    setShowCalendar(true);
    setStep(3);
  };

  const loadingMessages = [
    "Analizando tu marca y producto...",
    "Generando caption optimizado con IA...",
    "Creando hashtags y prompts de imagen...",
    "Optimizando para cada plataforma...",
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #faf5ff 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        padding: "32px 24px 28px", color: "white",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>🤖</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Agente de Contenido IA</h1>
                <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 13 }}>
                  Powered by Claude API
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {apiStatus && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 20,
                  background: apiStatus.hasApiKey ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                  fontSize: 12, fontWeight: 500,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: apiStatus.hasApiKey ? "#10b981" : "#ef4444",
                  }} />
                  {apiStatus.hasApiKey ? "Claude ✓" : "Sin API Key"}
                </div>
              )}
              {canvaStatus?.enabled && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 20,
                  background: canvaStatus.connected ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.15)",
                  fontSize: 12, fontWeight: 500, cursor: canvaStatus.connected ? "default" : "pointer",
                  textDecoration: "none", color: "white",
                }}
                  onClick={() => !canvaStatus.connected && window.location.assign("/auth/canva")}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: canvaStatus.connected ? "#a78bfa" : "rgba(255,255,255,0.5)",
                  }} />
                  {canvaStatus.connected ? "Canva ✓" : "Conectar Canva"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px" }}>
        <StepIndicator
          steps={["Configurar", "Generar", "Revisar", "Programar"]}
          current={step}
        />

        {/* API Warning */}
        {apiStatus && !apiStatus.hasApiKey && step === 0 && (
          <div style={{
            background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 12,
            padding: 16, marginBottom: 20, fontSize: 14, color: "#92400e",
          }}>
            <strong>⚠️ API Key no configurada.</strong> Agrega tu ANTHROPIC_API_KEY al archivo <code>.env</code> para generar contenido real.
            Puedes obtener una en <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={{ color: "#d97706" }}>console.anthropic.com</a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12,
            padding: 16, marginBottom: 20, fontSize: 14, color: "#991b1b",
          }}>
            <strong>❌ Error:</strong> {error}
            <button onClick={() => setError(null)} style={{
              marginLeft: 12, padding: "4px 12px", borderRadius: 6,
              border: "1px solid #fca5a5", background: "white",
              cursor: "pointer", fontSize: 12,
            }}>Cerrar</button>
          </div>
        )}

        {/* Step 0: Configurar */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ContentCard title="📱 Plataformas" accent="#6366f1">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PLATFORMS.map((p) => (
                  <PlatformBadge key={p.id} platform={p}
                    selected={selectedPlatforms.includes(p.id)}
                    onClick={() => togglePlatform(p.id)} />
                ))}
              </div>
            </ContentCard>

            <ContentCard title="📝 Tipo de contenido" accent="#8b5cf6">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CONTENT_TYPES.map((ct) => (
                  <button key={ct.id} onClick={() => setContentType(ct.id)}
                    style={{
                      padding: "12px 16px", borderRadius: 10,
                      border: contentType === ct.id ? "2px solid #8b5cf6" : "2px solid #e2e8f0",
                      background: contentType === ct.id ? "#8b5cf615" : "white",
                      cursor: "pointer", textAlign: "left", fontSize: 13,
                      color: contentType === ct.id ? "#7c3aed" : "#475569",
                      fontWeight: contentType === ct.id ? 600 : 400,
                    }}>
                    {ct.emoji} {ct.label}
                  </button>
                ))}
              </div>
            </ContentCard>

            <ContentCard title="🏷️ Tu producto" accent="#ec4899">
              <input type="text" value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Crema hidratante facial, Camiseta oversized..."
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10,
                  border: "2px solid #e2e8f0", fontSize: 14, outline: "none",
                  boxSizing: "border-box",
                }} />
            </ContentCard>

            <ContentCard title="🎨 Tono de voz" accent="#f59e0b">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TONES.map((t) => (
                  <button key={t} onClick={() => setTone(t)} style={{
                    padding: "8px 16px", borderRadius: 20,
                    border: tone === t ? "2px solid #f59e0b" : "2px solid #e2e8f0",
                    background: tone === t ? "#fef3c7" : "white", cursor: "pointer",
                    fontSize: 13, fontWeight: tone === t ? 600 : 400,
                    color: tone === t ? "#d97706" : "#64748b",
                  }}>{t}</button>
                ))}
              </div>
            </ContentCard>

            <button onClick={generate}
              disabled={selectedPlatforms.length === 0 || !contentType || !productName.trim()}
              style={{
                padding: "16px 32px", borderRadius: 12, border: "none",
                background: selectedPlatforms.length > 0 && contentType && productName.trim()
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e2e8f0",
                color: selectedPlatforms.length > 0 && contentType && productName.trim() ? "white" : "#94a3b8",
                fontSize: 16, fontWeight: 600,
                cursor: selectedPlatforms.length > 0 && contentType && productName.trim() ? "pointer" : "not-allowed",
              }}>
              🚀 Generar contenido con Claude IA
            </button>
          </div>
        )}

        {/* Step 1: Generating */}
        {step === 1 && generating && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 20px", gap: 24,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              border: "4px solid #e2e8f0", borderTopColor: "#6366f1",
              animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", margin: "0 0 12px" }}>
                Claude está generando tu contenido...
              </p>
              {loadingMessages.map((msg, i) => (
                <p key={i} style={{
                  fontSize: 14, margin: "6px 0",
                  color: i <= loadingPhase ? "#6366f1" : "#cbd5e1",
                  fontWeight: i === loadingPhase ? 600 : 400,
                  transition: "all 0.3s",
                }}>
                  {i < loadingPhase ? "✅" : i === loadingPhase ? "⏳" : "⬜"} {msg}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && result && !showCalendar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Platform tabs for captions */}
            {result.captionsByPlatform && selectedPlatforms.length > 1 && (
              <ContentCard title="📱 Captions por plataforma" accent="#6366f1">
                <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                  {selectedPlatforms.map((pid) => {
                    const p = PLATFORMS.find((pl) => pl.id === pid);
                    return (
                      <button key={pid} onClick={() => setActivePlatformTab(pid)}
                        style={{
                          padding: "8px 14px", borderRadius: 8, border: "none",
                          background: activePlatformTab === pid ? p.color : "#f1f5f9",
                          color: activePlatformTab === pid ? "white" : "#64748b",
                          cursor: "pointer", fontSize: 13, fontWeight: 500,
                        }}>
                        {p.icon} {p.name}
                      </button>
                    );
                  })}
                </div>
                <div style={{
                  background: "#f8fafc", borderRadius: 12, padding: 20,
                  fontSize: 14, lineHeight: 1.7, color: "#334155", whiteSpace: "pre-wrap",
                }}>
                  {result.captionsByPlatform[activePlatformTab] || result.caption}
                </div>
                <div style={{ marginTop: 12 }}>
                  <CopyButton text={result.captionsByPlatform[activePlatformTab] || result.caption} />
                </div>
              </ContentCard>
            )}

            {/* Main caption */}
            <ContentCard title="📝 Caption principal" accent="#6366f1">
              <div style={{
                background: "#f8fafc", borderRadius: 12, padding: 20,
                fontSize: 14, lineHeight: 1.7, color: "#334155", whiteSpace: "pre-wrap",
              }}>
                {result.caption}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <CopyButton text={result.caption} />
                <button onClick={() => { setStep(0); setResult(null); setError(null); }}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                    background: "white", cursor: "pointer", fontSize: 13, color: "#64748b",
                  }}>🔄 Regenerar</button>
              </div>
            </ContentCard>

            {/* Hook variations */}
            {result.hookVariations && (
              <ContentCard title="🎣 Variaciones de hook" accent="#f97316">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.hookVariations.map((hook, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: 12, borderRadius: 8, background: "#fff7ed",
                      border: "1px solid #fed7aa", fontSize: 14, color: "#9a3412",
                    }}>
                      <span>{hook}</span>
                      <CopyButton text={hook} />
                    </div>
                  ))}
                </div>
              </ContentCard>
            )}

            {/* Hashtags */}
            <ContentCard title="# Hashtags" accent="#8b5cf6">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(result.hashtags || []).map((h, i) => (
                  <span key={i} style={{
                    padding: "6px 12px", borderRadius: 20,
                    background: "#eef2ff", color: "#6366f1",
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }} onClick={() => navigator.clipboard.writeText(h)}>
                    {h}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <CopyButton text={(result.hashtags || []).join(" ")} />
              </div>
            </ContentCard>

            {/* ── Canva Designs Panel ─────────────────────────────── */}
            <ContentCard title="🎨 Diseños en Canva" accent="#7c3aed">
              {/* Not configured */}
              {!canvaStatus?.enabled && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 12px" }}>
                    Conecta Canva para generar diseños automáticamente desde tu contenido.
                  </p>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    Configura <code>CANVA_CLIENT_ID</code> y <code>CANVA_CLIENT_SECRET</code> en tu entorno.
                  </span>
                </div>
              )}

              {/* Enabled but not connected */}
              {canvaStatus?.enabled && !canvaStatus?.connected && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 16px" }}>
                    Conecta tu cuenta de Canva para generar diseños visuales automáticamente.
                  </p>
                  <a href="/auth/canva" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "12px 24px", borderRadius: 10, background: "#7c3aed",
                    color: "white", fontWeight: 600, fontSize: 14,
                    textDecoration: "none",
                  }}>
                    🔗 Conectar con Canva
                  </a>
                </div>
              )}

              {/* Connected: loading */}
              {canvaStatus?.connected && canvaLoading && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", margin: "0 auto 16px",
                    border: "3px solid #e2e8f0", borderTopColor: "#7c3aed",
                    animation: "spin 1s linear infinite",
                  }} />
                  <p style={{ color: "#7c3aed", fontSize: 14, fontWeight: 600, margin: 0 }}>
                    Generando diseños en Canva...
                  </p>
                </div>
              )}

              {/* Connected: error */}
              {canvaStatus?.connected && !canvaLoading && canvaError && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", borderRadius: 10, marginBottom: 12 }}>
                  <p style={{ color: "#991b1b", fontSize: 13, margin: "0 0 8px" }}>
                    ⚠️ {canvaError}
                  </p>
                  <button onClick={() => generateCanvaDesignsFromResult(result, activePlatformTab)}
                    style={{
                      padding: "6px 14px", borderRadius: 8, border: "1px solid #fca5a5",
                      background: "white", cursor: "pointer", fontSize: 12, color: "#991b1b",
                    }}>
                    🔄 Reintentar
                  </button>
                </div>
              )}

              {/* Connected: designs ready */}
              {canvaStatus?.connected && !canvaLoading && canvaDesigns && canvaDesigns.length > 0 && (
                <>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(canvaDesigns.length, 2)}, 1fr)`,
                    gap: 12, marginBottom: 16,
                  }}>
                    {canvaDesigns.map((design, i) => (
                      <a key={design.id || i} href={design.editUrl} target="_blank" rel="noopener"
                        style={{ textDecoration: "none", display: "block" }}>
                        <div style={{
                          borderRadius: 12, overflow: "hidden",
                          border: "2px solid #e2e8f0",
                          transition: "border-color 0.2s, transform 0.15s",
                          cursor: "pointer",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.transform = "scale(1.02)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          {design.thumbnail
                            ? <img src={design.thumbnail} alt={`Diseño ${i + 1}`}
                                style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }} />
                            : <div style={{
                                aspectRatio: "1/1", background: "linear-gradient(135deg,#eef2ff,#faf5ff)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 40,
                              }}>🎨</div>
                          }
                          <div style={{
                            padding: "8px 12px", background: "white",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              {design.source === "brand_template"
                                ? `📐 ${design.templateName || "Plantilla"}`
                                : "📄 Canvas en blanco"}
                            </span>
                            <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                              Editar →
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={() => generateCanvaDesignsFromResult(result, activePlatformTab)}
                      style={{
                        padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd6fe",
                        background: "white", cursor: "pointer", fontSize: 13, color: "#7c3aed",
                      }}>
                      🔄 Nuevas propuestas
                    </button>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      Haz clic en cualquier diseño para editarlo en Canva
                    </span>
                  </div>
                </>
              )}

              {/* Connected: no designs found */}
              {canvaStatus?.connected && !canvaLoading && canvaDesigns && canvaDesigns.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "#64748b", fontSize: 14 }}>
                    No se encontraron plantillas. Crea una plantilla de marca en Canva para verla aquí.
                  </p>
                  <button onClick={() => generateCanvaDesignsFromResult(result, activePlatformTab)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd6fe",
                      background: "white", cursor: "pointer", fontSize: 13, color: "#7c3aed",
                    }}>
                    🔄 Reintentar
                  </button>
                </div>
              )}

              {/* Connected but not triggered yet: show manual button */}
              {canvaStatus?.connected && !canvaLoading && !canvaDesigns && !canvaError && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <button onClick={() => generateCanvaDesignsFromResult(result, activePlatformTab)}
                    style={{
                      padding: "12px 24px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer",
                    }}>
                    ✨ Generar diseños en Canva
                  </button>
                </div>
              )}
            </ContentCard>

            {/* Best time */}
            <ContentCard title="⏰ Mejor horario para publicar" accent="#10b981">
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#ecfdf5", borderRadius: 10, padding: 16,
              }}>
                <span style={{ fontSize: 32 }}>📊</span>
                <p style={{ margin: 0, fontWeight: 500, color: "#065f46", fontSize: 14, lineHeight: 1.6 }}>
                  {result.bestTime}
                </p>
              </div>
            </ContentCard>

            {/* Content tips */}
            {result.contentTips && (
              <ContentCard title="💡 Tips de engagement" accent="#f59e0b">
                <p style={{
                  fontSize: 14, lineHeight: 1.7, color: "#475569",
                  background: "#fffbeb", borderRadius: 10, padding: 16, margin: 0,
                }}>
                  {result.contentTips}
                </p>
              </ContentCard>
            )}

            {/* Token usage */}
            {result.tokensUsed && (
              <div style={{
                display: "flex", justifyContent: "center", gap: 16,
                fontSize: 12, color: "#94a3b8", padding: "8px 0",
              }}>
                <span>Modelo: {result.model}</span>
                <span>Tokens: {result.tokensUsed}</span>
                <span>Costo estimado: ~${((result.tokensUsed / 1000000) * 3).toFixed(4)} USD</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={schedulePost} style={{
                flex: 1, padding: "16px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}>
                📅 Programar publicación
              </button>
              <button onClick={() => { setStep(0); setResult(null); setContentType(null); setError(null); }}
                style={{
                  padding: "16px 24px", borderRadius: 12,
                  border: "2px solid #e2e8f0", background: "white",
                  color: "#64748b", fontSize: 15, fontWeight: 500, cursor: "pointer",
                }}>+ Nuevo</button>
            </div>
          </div>
        )}

        {/* Calendar */}
        {showCalendar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ContentCard title="📅 Contenido programado" accent="#10b981">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {scheduled.map((s) => (
                  <div key={s.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: 16, borderRadius: 12, background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#166534" }}>
                        {s.type?.emoji} {s.type?.label} — {s.product}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#15803d" }}>
                        {s.date} • {s.platforms.map((pid) => PLATFORMS.find((p) => p.id === pid)?.icon).join(" ")}
                      </p>
                    </div>
                    <span style={{
                      padding: "4px 12px", borderRadius: 20,
                      background: "#dcfce7", color: "#166534",
                      fontSize: 12, fontWeight: 600,
                    }}>Programado ✓</span>
                  </div>
                ))}
              </div>
            </ContentCard>

            <button onClick={() => { setShowCalendar(false); setStep(0); setResult(null); setContentType(null); setProductName(""); }}
              style={{
                padding: "16px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}>+ Crear más contenido</button>
          </div>
        )}
      </div>
    </div>
  );
}
