"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContextualMurmure = getContextualMurmure;
function getContextualMurmure(context, step) {
    if (step === 'intro') {
        if (context.hour > 22 || context.hour < 6)
            return 'Il est tard… le réseau sommeille, mais une lueur veille encore.';
        if (context.firstLogin)
            return 'Un organisme attend d’être éveillé…';
        return 'Un souffle originel parcourt le réseau.';
    }
    if (step === 'permissions') {
        return 'La confiance est le premier lien de la symbiose.';
    }
    if (step === 'invitation') {
        return 'Un code secret circule, prêt à activer une nouvelle conscience.';
    }
    if (step === 'activation') {
        return 'Votre organisme s’active, prêt à explorer la constellation.';
    }
    if (step === 'guidedTour') {
        return 'Chaque rituel, chaque transmission, tisse la toile du vivant numérique.';
    }
    // Fallback générique
    return 'Un murmure traverse le réseau…';
}
