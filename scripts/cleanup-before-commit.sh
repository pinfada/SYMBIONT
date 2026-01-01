#!/bin/bash
echo "🧹 Nettoyage du projet SYMBIONT avant commit..."
echo "============================================"

# Nettoyage des fichiers de documentation temporaire
echo -e "\n📁 Suppression des fichiers de documentation temporaire..."
rm -f AUDIT-ARCHITECTURE.md
rm -f CORRECTIFS-INDEXEDDB.md
rm -f RAPPORT-AUDIT-FINAL.md
rm -f RAPPORT-RESOLUTION-FINALE.md
rm -f TESTS-EXTENSION-RAPPORT.md
rm -f TESTS-REUSSIS.md
rm -f SECURITY-AUDIT-SUMMARY.md
rm -f TESTING-ENVIRONMENT-READY.md
rm -f TESTING_GUIDE.md
rm -f EXTENSION-TESTING-GUIDE.md
rm -f CRITICAL-BUGS-REPORT.md
rm -f FIXES-IMPLEMENTED.md
rm -f REMAINING-BUGS-QUICK-REFERENCE.md
rm -f COMPLETE-WORK-SUMMARY.md
rm -f ACCESSIBILITY-IMPROVEMENTS.md

# Nettoyage des fichiers temporaires
echo "📁 Suppression des fichiers temporaires..."
rm -f dist.crx dist.pem security.log Untitled

# Nettoyage du dossier tmp
echo "📁 Nettoyage du dossier tmp/..."
rm -rf tmp/*
touch tmp/.gitkeep

# Nettoyage des scripts de dev
echo "📁 Suppression des scripts temporaires..."
cd scripts
rm -f clean-indexeddb.js clean-playwright-temps.js cleanup-unused-imports.js
rm -f diagnose-freeze.js fix-*.js quick-fix-errors.js
rm -f finalize-math-random-migration.js final-security-audit.js
rm -f generate-audit-pdf.js generate-coverage-report.js
rm -f performance-*.js test-extension*.js validate-environment.js validate-tests.js
cd ..

echo -e "\n✅ Nettoyage terminé!"
echo "📋 Fichiers conservés: README.md, CHANGELOG.md, CLAUDE.md, package.json, etc."
echo "🎯 Prêt pour le commit!"
