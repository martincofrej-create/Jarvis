import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CONTENT_TYPE_LABELS = {
  product_launch: 'Lanzamiento de producto',
  promo: 'Promoción o descuento',
  educational: 'Contenido educativo',
  behind_scenes: 'Detrás de cámaras',
  testimonial: 'Testimonio o reseña',
  seasonal: 'Temporada o fecha especial',
};

const PLATFORM_TIPS = {
  instagram: 'Instagram: máximo 2200 caracteres, usa emojis, hasta 30 hashtags.',
  tiktok: 'TikTok: caption corto y enganchante, máximo 150 caracteres idealmente, usa trending hashtags.',
  facebook: 'Facebook: texto más largo permitido, incluye llamado a acción.',
  twitter: 'Twitter/X: máximo 280 caracteres, sé conciso y directo.',
  linkedin: 'LinkedIn: tono más profesional, enfócate en valor y aprendizaje.',
};

export async function generateContent({ platforms, contentType, productName, tone, storeName, storeDescription }) {
  const platformTips = platforms.map((p) => PLATFORM_TIPS[p] || '').filter(Boolean).join('\n');
  const contentLabel = CONTENT_TYPE_LABELS[contentType] || contentType;

  const systemPrompt = `Eres un experto community manager y copywriter para e-commerce en Latinoamérica.
Tu trabajo es generar contenido de alta calidad para redes sociales que genere engagement y ventas.

Información de la tienda:
- Nombre: ${storeName}
- Descripción: ${storeDescription}

Reglas importantes:
- Escribe en español latinoamericano (no uses "vosotros", usa "tú" o "vos" según contexto)
- Usa emojis de forma estratégica, no excesiva
- Los hashtags deben ser relevantes y mezclar populares con nicho
- El caption debe tener un hook fuerte en la primera línea
- Incluye siempre un llamado a acción (CTA) claro
- Adapta la longitud al formato de cada plataforma`;

  const userPrompt = `Genera contenido para publicar en: ${platforms.join(', ')}

Tipo de contenido: ${contentLabel}
Producto: ${productName}
Tono: ${tone}

Tips por plataforma:
${platformTips}

Responde EXCLUSIVAMENTE en formato JSON válido con esta estructura exacta (sin markdown, sin backticks, solo JSON puro):
{
  "caption": "El caption principal optimizado para ${platforms[0]} (el más importante). Incluye emojis, estructura visual con saltos de línea, CTA, y hashtags al final.",
  "captionsByPlatform": {
    ${platforms.map((p) => `"${p}": "Caption adaptado específicamente para ${p}"`).join(',\n    ')}
  },
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8"],
  "imagePrompt": "Prompt detallado en inglés para generar una imagen con IA (DALL-E/Midjourney) que acompañe este post. Debe ser específico sobre estilo, composición, colores y mood.",
  "bestTime": "Mejor día y horario para publicar este tipo de contenido, con una breve explicación del por qué.",
  "contentTips": "2-3 consejos específicos para mejorar el engagement de este post.",
  "hookVariations": ["Variación 1 del hook (primera línea)", "Variación 2 del hook", "Variación 3 del hook"]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const text = response.content[0].text;

  // Parse JSON from response
  let parsed;
  try {
    // Try direct parse first
    parsed = JSON.parse(text);
  } catch {
    // Try extracting JSON from possible markdown code block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No se pudo parsear la respuesta de Claude como JSON');
    }
  }

  return {
    ...parsed,
    model: response.model,
    tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
  };
}
