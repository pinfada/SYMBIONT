// Analyseur DOM

export class DOMAnalyzer {
  analyze(): any {
    // Retourne un objet factice pour lever les erreurs
    return {
      wordCount: 1000,
      imageCount: 10,
      videoCount: 2,
      linkCount: 20,
      estimatedReadingTime: 5
    };
  }
  extractMainContent(): any {
    return {};
  }
  categorizeContent(): string {
    return 'article';
  }
}