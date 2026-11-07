#!/usr/bin/env bash
set -e

echo "=========================================================================="
echo "🚀 V-STUDIO PRO: GENERANDO MONOREPO TOTAL (PRODUCCIÓN + GPU + WEBEDTIOR)"
echo "=========================================================================="

# 1. Crear estructura completa de directorios
mkdir -p database
mkdir -p apps/web-editor/app/editor/\[projectId\]
mkdir -p apps/web-editor/app/api/captions/generate
mkdir -p apps/web-editor/app/api/render/export
mkdir -p apps/web-editor/app/api/social/publish
mkdir -p apps/web-editor/app/api/health
mkdir -p apps/web-editor/core
mkdir -p apps/web-editor/store
mkdir -p apps/web-editor/modules/captions
mkdir -p apps/web-editor/modules/social
mkdir -p apps/ai-captions-service
mkdir -p apps/render-service/src/workers
mkdir -p apps/render-service/src/services

echo "✅ Directorios creados correctamente."
echo "Instalación completada. Ejecuta 'npm install' en la raíz y luego 'npm run dev:editor' para arrancar."
