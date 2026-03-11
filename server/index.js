import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './claude-service.js';
import {
  canvaTokens,
  getAuthUrl,
  exchangeCode,
  generateCanvaDesigns,
} from './canva-service.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// =========================
// API Routes
// =========================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    storeName: process.env.STORE_NAME || 'No configurado',
    canvaEnabled: !!(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET),
    canvaConnected: canvaTokens.isValid(),
  });
});

// Generate content
app.post('/api/generate', async (req, res) => {
  try {
    const { platforms, contentType, productName, tone, storeName, storeDescription } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        error: 'API key no configurada',
        message: 'Agrega tu ANTHROPIC_API_KEY al archivo .env',
      });
    }

    if (!contentType) {
      return res.status(400).json({ error: 'contentType es requerido' });
    }

    const result = await generateContent({
      platforms: platforms || ['instagram'],
      contentType,
      productName: productName || 'producto',
      tone: tone || process.env.DEFAULT_TONE || 'profesional',
      storeName: storeName || process.env.STORE_NAME || 'Mi Tienda',
      storeDescription: storeDescription || process.env.STORE_DESCRIPTION || '',
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating content:', error.message);
    res.status(500).json({
      error: 'Error al generar contenido',
      message: error.message,
    });
  }
});

// =========================
// Canva OAuth Routes
// =========================

// Step 1: Redirect user to Canva
app.get('/auth/canva', (req, res) => {
  if (!process.env.CANVA_CLIENT_ID || !process.env.CANVA_CLIENT_SECRET) {
    return res.status(400).send('CANVA_CLIENT_ID / CANVA_CLIENT_SECRET no configurados.');
  }
  res.redirect(getAuthUrl());
});

// Step 2: Handle Canva callback
app.get('/auth/canva/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    console.error('Canva OAuth error:', error);
    return res.redirect('/?canva=error');
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens?.access_token) {
      console.error('No access_token in response:', tokens);
      return res.redirect('/?canva=error');
    }
    canvaTokens.set(tokens);
    console.log('✅ Canva conectado correctamente');
    res.redirect('/?canva=connected');
  } catch (err) {
    console.error('Canva token exchange error:', err.message);
    res.redirect('/?canva=error');
  }
});

// Canva status
app.get('/api/canva/status', (req, res) => {
  res.json({
    connected: canvaTokens.isValid(),
    enabled: !!(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET),
    connectUrl: '/auth/canva',
  });
});

// Disconnect Canva
app.post('/api/canva/disconnect', (req, res) => {
  canvaTokens.clear();
  res.json({ ok: true });
});

// Generate Canva designs from content
app.post('/api/canva/generate', async (req, res) => {
  if (!canvaTokens.isValid()) {
    return res.status(401).json({ error: 'Canva no conectado', connectUrl: '/auth/canva' });
  }

  try {
    const { caption, imagePrompt, productName, platform } = req.body;
    const result = await generateCanvaDesigns({ caption, imagePrompt, productName, platform });
    res.json(result);
  } catch (err) {
    console.error('Canva generate error:', err.message);
    res.status(500).json({ error: 'Error al generar diseños en Canva', message: err.message });
  }
});

// SPA fallback - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 Jarvis IA corriendo en http://localhost:${PORT}`);
  console.log(`   API Key:  ${process.env.ANTHROPIC_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`   Tienda:   ${process.env.STORE_NAME || 'No configurada'}`);
  console.log(`   Canva:    ${process.env.CANVA_CLIENT_ID ? '✅ Configurado' : '⚠️  Sin configurar'}\n`);
});
