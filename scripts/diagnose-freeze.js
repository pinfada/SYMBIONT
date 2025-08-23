// Script de diagnostic pour identifier les causes de figement
console.log('=== DIAGNOSTIC EXTENSION SYMBIONT ===\n');

// Fonctions de test pour le popup
function testPopupFreeze() {
  console.log('🔍 Testing popup freeze causes...');
  
  // Vérifier si WebGL bloque le thread principal
  const code = `
    // Test 1: Animation loop WebGL
    let animationCount = 0;
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
      animationCount++;
      if (animationCount > 1000) {
        console.warn('PROBLEME: Plus de 1000 requestAnimationFrame en cours!');
        console.warn('Animation loop potentiellement infinie detectee');
        return;
      }
      return originalRAF.call(window, callback);
    };
    
    // Test 2: Boucles infinites
    let intervalCount = 0;
    const originalSetInterval = window.setInterval;
    window.setInterval = function(callback, delay) {
      intervalCount++;
      console.log('Interval créé #' + intervalCount + ' avec délai: ' + delay + 'ms');
      if (intervalCount > 10) {
        console.warn('PROBLEME: Trop intervals actifs (' + intervalCount + ')');
      }
      return originalSetInterval.call(window, callback, delay);
    };
    
    // Test 3: Mémoire WebGL
    const gl = document.querySelector('canvas')?.getContext('webgl') || 
               document.querySelector('canvas')?.getContext('webgl2');
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) {
        console.log('GPU:', gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
        console.log('Contexte WebGL:', gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1');
      }
      
      // Vérifier les erreurs WebGL
      const errors = [];
      let error;
      while ((error = gl.getError()) !== gl.NO_ERROR) {
        errors.push(error);
      }
      if (errors.length > 0) {
        console.warn('PROBLEME: Erreurs WebGL detectees:', errors);
      }
    }
    
    // Test 4: Performance monitoring
    if (window.performance && window.performance.measure) {
      const entries = performance.getEntriesByType('measure');
      if (entries.length > 100) {
        console.warn('PROBLEME: Trop de mesures de performance (' + entries.length + ')');
      }
    }
    
    // Test 5: Vérifier les tailles de données
    if (window.organism && typeof window.organism === 'object') {
      const orgSize = JSON.stringify(window.organism).length;
      console.log('Taille organism data:', (orgSize / 1024).toFixed(1) + 'kb');
      if (orgSize > 100000) {
        console.warn('PROBLEME: Donnees organism tres volumineuses');
      }
    }
    
    // Résultat
    console.log('✅ Tests de diagnostic popup terminés');
    return {
      animationCount,
      intervalCount,
      hasWebGL: !!gl,
      timestamp: Date.now()
    };
  `;
  
  return code;
}

// Instructions pour l'utilisateur
console.log('Instructions pour diagnostiquer le figement:');
console.log('');
console.log('1. Ouvrir extension SYMBIONT dans Chrome');
console.log('2. Faire F12 pour ouvrir les DevTools');
console.log('3. Aller dans onglet Console');
console.log('4. Coller et executer le code suivant:');
console.log('');
console.log('=== CODE DE DIAGNOSTIC A COLLER ===');
console.log(testPopupFreeze());
console.log('=== FIN DU CODE ===');
console.log('');
console.log('5. Analyser les messages d\\'avertissement');
console.log('6. Si figé, essayer: chrome://extensions/ > SYMBIONT > Recharger');
console.log('');
console.log('Causes probables identifiées:');
console.log('- Boucle animation WebGL infinie (WebGLOrganismViewer.tsx:490)');
console.log('- Multiple intervals actifs simultanément');
console.log('- Erreurs WebGL bloquantes');
console.log('- Données organism corrompues ou trop volumineuses');