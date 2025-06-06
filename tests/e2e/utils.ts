// Helpers Playwright communs pour SYMBIONT

interface PageError {
  type: string;
  message: string;
  stack?: string;
  url?: string;
  failure?: string;
}

/**
 * Attend que React soit prêt et que l'app soit montée.
 */
export const waitForReactToLoad = async (page, panelSelector = '.app-container, [data-theme]') => {
  await page.waitForLoadState('domcontentloaded');
  
  // Attendre que les scripts soient chargés
  await page.waitForFunction(() => {
    return document.scripts.length > 0 && 
           Array.from(document.scripts).some(script => script.src.includes('index.js'));
  }, { timeout: 15000 });
  
  // Attendre que React soit monté
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 15000 });
  
  // Attendre un peu pour que les composants se stabilisent
  await page.waitForTimeout(1000);
  
  // Optionnel : attendre un sélecteur spécifique
  try {
    await page.waitForSelector(panelSelector, { timeout: 5000 });
  } catch (error) {
    console.log(`⚠️ Panel selector "${panelSelector}" non trouvé, mais React semble chargé`);
  }
};

/**
 * Attendre qu'un élément soit ready pour interaction
 */
export const waitForElementReady = async (page, selector, timeout = 10000) => {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
  await page.waitForFunction((sel) => {
    const element = document.querySelector(sel);
    return element && !element.matches(':disabled') && getComputedStyle(element).pointerEvents !== 'none';
  }, selector, { timeout: 5000 });
};

/**
 * Attendre la navigation avec fallback
 */
export const waitForNavigation = async (page, expectedSelector, timeout = 10000) => {
  try {
    await page.waitForSelector(expectedSelector, { timeout, state: 'visible' });
    return true;
  } catch (error) {
    console.log(`❌ Navigation timeout vers ${expectedSelector}`);
    await debugPageState(page);
    return false;
  }
};

/**
 * Affiche un résumé de l'état du root React pour le debug.
 */
export const debugPageState = async (page) => {
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    const scripts = Array.from(document.scripts);
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    
    return {
      exists: !!root,
      hasChildren: root ? root.children.length > 0 : false,
      innerHTML: root ? root.innerHTML.substring(0, 300) + '...' : 'ROOT NOT FOUND',
      scripts: scripts.map(s => ({
        src: s.src || 'inline',
        loaded: !s.src || (s as any).readyState === 'complete'
      })),
      stylesheets: links.map(l => ({
        href: l.href,
        loaded: l.sheet !== null
      })),
      errors: (window as any).__playwright_errors || []
    };
  });
  
  console.log('État de la page:', JSON.stringify(rootContent, null, 2));
  return rootContent;
};

/**
 * Capturer les erreurs JS de la page
 */
export const capturePageErrors = (page): PageError[] => {
  const errors: PageError[] = [];
  
  page.on('pageerror', (error) => {
    errors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack
    });
    console.log('🚨 Erreur JS:', error.message);
  });
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        type: 'console.error',
        message: msg.text()
      });
      console.log('🚨 Console Error:', msg.text());
    }
  });
  
  page.on('requestfailed', (request) => {
    errors.push({
      type: 'requestfailed',
      message: `Request failed: ${request.url()}`,
      url: request.url(),
      failure: request.failure()?.errorText
    });
    console.log('🚨 Request Failed:', request.url(), request.failure()?.errorText);
  });
  
  return errors;
}; 