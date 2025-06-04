// Script pour générer les icônes de l'extension SYMBIONT
const fs = require('fs');
const path = require('path');

// Fonction pour créer une icône SVG simple représentant un organisme digital
function createSymbiontIcon(size) {
  const center = size / 2;
  const radius = size * 0.3;
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="grad${size}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#00e0ff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#232946;stop-opacity:1" />
      </radialGradient>
      <filter id="glow${size}">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Corps principal de l'organisme -->
    <circle cx="${center}" cy="${center}" r="${radius}" 
            fill="url(#grad${size})" 
            filter="url(#glow${size})" 
            stroke="#00e0ff" 
            stroke-width="${size < 32 ? 1 : 2}"/>
    
    <!-- Connexions neuronales -->
    <g stroke="#00e0ff" stroke-width="${size < 32 ? 0.5 : 1}" fill="none" opacity="0.7">
      <path d="M${center - radius * 0.5},${center - radius * 0.3} Q${center},${center - radius * 0.8} ${center + radius * 0.5},${center - radius * 0.3}"/>
      <path d="M${center - radius * 0.3},${center + radius * 0.5} Q${center - radius * 0.8},${center} ${center - radius * 0.3},${center - radius * 0.5}"/>
      <path d="M${center + radius * 0.3},${center + radius * 0.5} Q${center + radius * 0.8},${center} ${center + radius * 0.3},${center - radius * 0.5}"/>
    </g>
    
    <!-- Points de connexion -->
    <g fill="#00e0ff" opacity="0.9">
      <circle cx="${center - radius * 0.4}" cy="${center - radius * 0.2}" r="${size < 32 ? 1 : 2}"/>
      <circle cx="${center + radius * 0.4}" cy="${center - radius * 0.2}" r="${size < 32 ? 1 : 2}"/>
      <circle cx="${center}" cy="${center + radius * 0.4}" r="${size < 32 ? 1 : 2}"/>
    </g>
    
    <!-- Centre pulsant -->
    <circle cx="${center}" cy="${center}" r="${radius * 0.2}" 
            fill="#fff" 
            opacity="0.8"/>
  </svg>`;
}

// Fonction pour convertir SVG en PNG (simulation - en réalité il faudrait une lib comme sharp)
function createPngFromSvg(svgContent, size, outputPath) {
  // Pour cette démo, on crée un fichier SVG temporaire
  // Dans un vrai projet, on utiliserait une bibliothèque comme sharp ou puppeteer
  const svgPath = outputPath.replace('.png', '.svg');
  fs.writeFileSync(svgPath, svgContent);
  
  // Créer un fichier PNG basique (placeholder)
  // En production, utilisez : sharp(Buffer.from(svgContent)).png().resize(size, size).toFile(outputPath)
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, size, // width
    0x00, 0x00, 0x00, size, // height
    0x08, 0x02, 0x00, 0x00, 0x00 // bit depth, color type, compression, filter, interlace
  ]);
  
  // Créer une image PNG minimale (sera remplacée par un vrai générateur)
  fs.writeFileSync(outputPath, pngHeader);
  console.log(`Created icon: ${outputPath} (${size}x${size})`);
}

// Créer le dossier d'icônes s'il n'existe pas
const iconsDir = path.join(__dirname, '..', 'dist', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer toutes les tailles d'icônes
const sizes = [16, 32, 48, 128, 512];

sizes.forEach(size => {
  const svgContent = createSymbiontIcon(size);
  const outputPath = path.join(iconsDir, `icon${size}.png`);
  createPngFromSvg(svgContent, size, outputPath);
});

console.log('✅ Icônes SYMBIONT générées avec succès !'); 