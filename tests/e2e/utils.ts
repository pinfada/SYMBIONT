// Helpers Playwright communs pour SYMBIONT

/**
 * Attend que React soit prêt et que l'app soit montée.
 */
export const waitForReactToLoad = async (page, panelSelector = '.app-container, [data-theme]') => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 10000 });
  await page.waitForSelector(panelSelector, { timeout: 5000 }).catch(() => {});
};

/**
 * Affiche un résumé de l'état du root React pour le debug.
 */
export const debugPageState = async (page) => {
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      exists: !!root,
      hasChildren: root ? root.children.length > 0 : false,
      innerHTML: root ? root.innerHTML.substring(0, 200) + '...' : 'ROOT NOT FOUND',
      scripts: Array.from(document.scripts).map(s => s.src || 'inline script')
    };
  });
  console.log('État de la page:', JSON.stringify(rootContent, null, 2));
  return rootContent;
}; 