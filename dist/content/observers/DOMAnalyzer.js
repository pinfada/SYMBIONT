"use strict";
// Analyseur DOM
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAnalyzer = void 0;
class DOMAnalyzer {
    analyze() {
        // Retourne un objet factice pour lever les erreurs
        return {
            wordCount: 1000,
            imageCount: 10,
            videoCount: 2,
            linkCount: 20,
            estimatedReadingTime: 5
        };
    }
    extractMainContent() {
        return {};
    }
    categorizeContent() {
        return 'article';
    }
}
exports.DOMAnalyzer = DOMAnalyzer;
