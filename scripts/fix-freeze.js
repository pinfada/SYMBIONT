// Instructions pour résoudre le figement de l'extension

console.log('=== RESOLUTION FIGEMENT SYMBIONT ===');
console.log('');
console.log('PROBLEME IDENTIFIE: Boucle animation WebGL infinie');
console.log('');
console.log('SOLUTION IMMEDIATE:');
console.log('1. chrome://extensions/');
console.log('2. Trouver SYMBIONT');
console.log('3. Cliquer Recharger');
console.log('');
console.log('CAUSE PROBABLE:');
console.log('- WebGLOrganismViewer.tsx ligne 490');  
console.log('- requestAnimationFrame sans condition d\'arret');
console.log('- Particules WebGL en boucle infinie');
console.log('');
console.log('CORRECTION A APPLIQUER:');
console.log('- Ajouter garde-fou pour animation');
console.log('- Limiter FPS WebGL');
console.log('- Gestion erreurs WebGL');
console.log('');

// Code à copier-coller dans la console DevTools
const diagnosticCode = `
// DIAGNOSTIC RAPIDE - Coller dans Console DevTools
let frameCount = 0;
const startTime = Date.now();

// Intercepter requestAnimationFrame
const originalRAF = window.requestAnimationFrame;
window.requestAnimationFrame = function(cb) {
  frameCount++;
  if (frameCount > 500) {
    console.error('STOPPE: Animation infinie detectee (' + frameCount + ' frames)');
    return 0; // Arrêter la boucle
  }
  if (frameCount % 100 === 0) {
    const elapsed = Date.now() - startTime;
    console.log('Frame ' + frameCount + ' après ' + elapsed + 'ms');
  }
  return originalRAF.call(window, cb);
};

// Résultat après 5 secondes
setTimeout(() => {
  console.log('DIAGNOSTIC FINAL:');
  console.log('- Frames totales: ' + frameCount);
  console.log('- FPS moyen: ' + Math.round(frameCount * 1000 / (Date.now() - startTime)));
  if (frameCount > 300) {
    console.warn('CONFIRME: Boucle animation trop rapide');
  }
}, 5000);
`;

console.log('CODE DIAGNOSTIC (copier dans Console):');
console.log('=====================================');
console.log(diagnosticCode);
console.log('=====================================');