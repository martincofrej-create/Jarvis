import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './claude-service.js';

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

// SPA fallback - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 Agente de Contenido IA corriendo en http://localhost:${PORT}`);
  console.log(`   API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`   Tienda: ${process.env.STORE_NAME || 'No configurada'}\n`);
});
