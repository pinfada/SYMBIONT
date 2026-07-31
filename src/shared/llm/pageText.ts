// src/shared/llm/pageText.ts
//
// Extraction du texte visible de l'onglet actif, pour l'analyser localement.
// Utilise chrome.scripting sur geste utilisateur (permission activeTab). Le
// texte ne quitte jamais le poste : il est passé directement au LLM local.

export interface PageText {
  text: string;
  domain?: string;
  title?: string;
}

interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
}

function getChrome(): {
  tabs?: { query: (q: { active: boolean; currentWindow: boolean }) => Promise<ChromeTab[]> };
  scripting?: {
    executeScript: (opts: {
      target: { tabId: number };
      func: () => string;
    }) => Promise<Array<{ result?: string }>>;
  };
} | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof chrome !== 'undefined' ? (chrome as any) : undefined;
}

/**
 * Récupère le texte visible de l'onglet actif. Lève une erreur explicite si
 * les API extension ne sont pas disponibles (contexte hors-extension).
 */
export async function extractActivePageText(): Promise<PageText> {
  const c = getChrome();
  if (!c?.tabs?.query || !c?.scripting?.executeScript) {
    throw new Error('Extraction de page indisponible dans ce contexte.');
  }

  const [tab] = await c.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('Aucun onglet actif à analyser.');
  }

  const results = await c.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body?.innerText ?? '',
  });

  const text = (results?.[0]?.result ?? '').replace(/\s+\n/g, '\n').trim();
  let domain: string | undefined;
  try {
    domain = tab.url ? new URL(tab.url).hostname : undefined;
  } catch {
    domain = undefined;
  }

  return {
    text,
    ...(domain ? { domain } : {}),
    ...(tab.title ? { title: tab.title } : {}),
  };
}
