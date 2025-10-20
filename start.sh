#!/bin/bash

echo "🚀 Iniciando Sistema GESSA Boletos MVP..."
echo ""

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

# Crear directorios necesarios
mkdir -p data pdfs

echo "✅ Sistema listo"
echo ""
echo "📡 Iniciando servidor..."
echo ""

npm start
