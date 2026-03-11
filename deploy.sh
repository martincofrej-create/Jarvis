#!/bin/bash
# ============================================
# Deploy Agente de Contenido IA v2 to Cloud Run
# ============================================
set -e

# --- EDITA ESTOS VALORES ---
PROJECT_ID="TU-PROJECT-ID"
SERVICE_NAME="agente-contenido"
REGION="us-central1"
ANTHROPIC_API_KEY="sk-ant-tu-key-aqui"
STORE_NAME="Mi Tienda"
STORE_DESCRIPTION="Tienda online de productos premium"
# ---------------------------

echo "🚀 Desplegando Agente de Contenido IA v2..."

gcloud auth print-identity-token > /dev/null 2>&1 || {
    echo "❌ Ejecuta: gcloud auth login"; exit 1
}

gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

echo "📦 Construyendo con Cloud Build..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

echo "🌐 Desplegando a Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 5 \
    --set-env-vars "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
    --set-env-vars "STORE_NAME=$STORE_NAME" \
    --set-env-vars "STORE_DESCRIPTION=$STORE_DESCRIPTION"

echo ""
echo "✅ ¡Listo! Tu agente está en:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
