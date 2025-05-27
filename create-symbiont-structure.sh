#!/bin/bash

# Script pour créer la structure du projet symbiont-extension
# À exécuter depuis l'intérieur du dossier symbiont-extension
# Préserve les fichiers et dossiers existants

# Fonction pour créer un dossier s'il n'existe pas
create_dir_if_not_exists() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo "✓ Dossier créé: $1"
    else
        echo "• Dossier existant conservé: $1"
    fi
}

# Fonction pour créer un fichier s'il n'existe pas
create_file_if_not_exists() {
    if [ ! -f "$1" ]; then
        touch "$1"
        echo "✓ Fichier créé: $1"
    else
        echo "• Fichier existant conservé: $1"
    fi
}

echo "🚀 Création de la structure du projet..."
echo "----------------------------------------"

# Fichiers racine
create_file_if_not_exists ".gitpod.yml"
create_file_if_not_exists ".gitpod.Dockerfile"
create_file_if_not_exists ".gitignore"
create_file_if_not_exists ".eslintrc.js"
create_file_if_not_exists ".prettierrc"
create_file_if_not_exists "tsconfig.json"
create_file_if_not_exists "webpack.config.js"
create_file_if_not_exists "webpack.config.gitpod.js"
create_file_if_not_exists "jest.config.js"
create_file_if_not_exists "package.json"
create_file_if_not_exists "README.md"
create_file_if_not_exists "LICENSE"

# .vscode
create_dir_if_not_exists ".vscode"
create_file_if_not_exists ".vscode/settings.json"
create_file_if_not_exists ".vscode/launch.json"
create_file_if_not_exists ".vscode/tasks.json"
create_file_if_not_exists ".vscode/extensions.json"

# public
create_dir_if_not_exists "public"
create_file_if_not_exists "public/manifest.json"
create_dir_if_not_exists "public/_locales/en"
create_file_if_not_exists "public/_locales/en/messages.json"
create_dir_if_not_exists "public/assets/icons"
create_file_if_not_exists "public/assets/icons/icon16.png"
create_file_if_not_exists "public/assets/icons/icon32.png"
create_file_if_not_exists "public/assets/icons/icon48.png"
create_file_if_not_exists "public/assets/icons/icon128.png"
create_file_if_not_exists "public/assets/icons/icon512.png"
create_dir_if_not_exists "public/assets/images"
create_file_if_not_exists "public/assets/images/logo.svg"

# src/background
create_dir_if_not_exists "src/background"
create_dir_if_not_exists "src/background/services"
create_file_if_not_exists "src/background/index.ts"
create_file_if_not_exists "src/background/services/OrganismCore.ts"
create_file_if_not_exists "src/background/services/NavigationCortex.ts"
create_file_if_not_exists "src/background/services/MemoryConsolidator.ts"
create_file_if_not_exists "src/background/services/WebGLBridge.ts"

# src/content
create_dir_if_not_exists "src/content"
create_dir_if_not_exists "src/content/neural"
create_file_if_not_exists "src/content/index.ts"
create_file_if_not_exists "src/content/neural/SensoryNetwork.ts"
create_file_if_not_exists "src/content/neural/PerceptionEngine.ts"
create_file_if_not_exists "src/content/neural/ContextualMemory.ts"
create_file_if_not_exists "src/content/neural/AttentionFocus.ts"
create_file_if_not_exists "src/content/neural/PredictiveModel.ts"

# src/popup
create_dir_if_not_exists "src/popup"
create_dir_if_not_exists "src/popup/styles"
create_dir_if_not_exists "src/popup/hooks"
create_dir_if_not_exists "src/popup/components"
create_dir_if_not_exists "src/popup/components/ui"
create_file_if_not_exists "src/popup/index.html"
create_file_if_not_exists "src/popup/index.tsx"
create_file_if_not_exists "src/popup/App.tsx"
create_file_if_not_exists "src/popup/styles/globals.css"
create_file_if_not_exists "src/popup/styles/components.css"
create_file_if_not_exists "src/popup/hooks/useOrganism.ts"
create_file_if_not_exists "src/popup/hooks/useWebGL.ts"
create_file_if_not_exists "src/popup/hooks/useMessaging.ts"
create_file_if_not_exists "src/popup/components/OrganismDashboard.tsx"
create_file_if_not_exists "src/popup/components/OrganismViewer.tsx"
create_file_if_not_exists "src/popup/components/GenomeVisualizer.tsx"
create_file_if_not_exists "src/popup/components/EvolutionHistory.tsx"
create_file_if_not_exists "src/popup/components/MetricsPanel.tsx"
create_file_if_not_exists "src/popup/components/ConsciousnessGauge.tsx"
create_file_if_not_exists "src/popup/components/TraitsRadarChart.tsx"
create_file_if_not_exists "src/popup/components/BehaviorPatterns.tsx"
create_file_if_not_exists "src/popup/components/ui/ToastNotification.tsx"
create_file_if_not_exists "src/popup/components/ui/ProgressIndicator.tsx"
create_file_if_not_exists "src/popup/components/ui/AnimatedButton.tsx"

# src/generative
create_dir_if_not_exists "src/generative"
create_file_if_not_exists "src/generative/OrganismEngine.ts"
create_file_if_not_exists "src/generative/DNAInterpreter.ts"
create_file_if_not_exists "src/generative/ProceduralGenerator.ts"
create_file_if_not_exists "src/generative/MutationEngine.ts"

# src/integration
create_dir_if_not_exists "src/integration"
create_file_if_not_exists "src/integration/WebGLMessageAdapter.ts"
create_file_if_not_exists "src/integration/ChromeAPIBridge.ts"

# src/monitoring
create_dir_if_not_exists "src/monitoring"
create_file_if_not_exists "src/monitoring/PerformanceMonitor.ts"
create_file_if_not_exists "src/monitoring/MetricsCollector.ts"

# src/core
create_dir_if_not_exists "src/core/neural"
create_dir_if_not_exists "src/core/messaging"
create_dir_if_not_exists "src/core/storage"
create_dir_if_not_exists "src/core/utils"
create_file_if_not_exists "src/core/neural/NeuralMesh.ts"
create_file_if_not_exists "src/core/neural/NeuralPattern.ts"
create_file_if_not_exists "src/core/neural/NeuronTypes.ts"
create_file_if_not_exists "src/core/messaging/MessageBus.ts"
create_file_if_not_exists "src/core/messaging/MessageTypes.ts"
create_file_if_not_exists "src/core/messaging/MessageValidator.ts"
create_file_if_not_exists "src/core/messaging/SynapticRouter.ts"
create_file_if_not_exists "src/core/storage/SymbiontStorage.ts"
create_file_if_not_exists "src/core/storage/StorageSchemas.ts"
create_file_if_not_exists "src/core/utils/Logger.ts"
create_file_if_not_exists "src/core/utils/EventEmitter.ts"
create_file_if_not_exists "src/core/utils/Errors.ts"
create_file_if_not_exists "src/core/utils/Constants.ts"

# src/behavioral
create_dir_if_not_exists "src/behavioral/core"
create_dir_if_not_exists "src/behavioral/analyzers"
create_dir_if_not_exists "src/behavioral/predictors"
create_file_if_not_exists "src/behavioral/core/BehavioralEngine.ts"
create_file_if_not_exists "src/behavioral/core/PatternDetector.ts"
create_file_if_not_exists "src/behavioral/core/ActionPredictor.ts"
create_file_if_not_exists "src/behavioral/analyzers/NavigationAnalyzer.ts"
create_file_if_not_exists "src/behavioral/analyzers/InteractionAnalyzer.ts"
create_file_if_not_exists "src/behavioral/analyzers/TemporalAnalyzer.ts"
create_file_if_not_exists "src/behavioral/analyzers/ContentAnalyzer.ts"
create_file_if_not_exists "src/behavioral/predictors/ClickPredictor.ts"
create_file_if_not_exists "src/behavioral/predictors/NavigationPredictor.ts"
create_file_if_not_exists "src/behavioral/predictors/AttentionPredictor.ts"

# src/types
create_dir_if_not_exists "src/types"
create_file_if_not_exists "src/types/index.d.ts"
create_file_if_not_exists "src/types/chrome.d.ts"
create_file_if_not_exists "src/types/organism.d.ts"
create_file_if_not_exists "src/types/neural.d.ts"
create_file_if_not_exists "src/types/behavioral.d.ts"
create_file_if_not_exists "src/types/webgl.d.ts"
create_file_if_not_exists "src/types/messaging.d.ts"

# src/shaders
create_dir_if_not_exists "src/shaders"
create_file_if_not_exists "src/shaders/organism.vert"
create_file_if_not_exists "src/shaders/organism.frag"
create_file_if_not_exists "src/shaders/particles.vert"
create_file_if_not_exists "src/shaders/particles.frag"

# scripts
create_dir_if_not_exists "scripts"
create_file_if_not_exists "scripts/build.js"
create_file_if_not_exists "scripts/package.js"
create_file_if_not_exists "scripts/chrome-test-server.js"
create_file_if_not_exists "scripts/extension-preview-server.js"
create_file_if_not_exists "scripts/headless-test.js"

# tests
create_dir_if_not_exists "tests/unit/neural"
create_dir_if_not_exists "tests/unit/behavioral"
create_dir_if_not_exists "tests/unit/generative"
create_dir_if_not_exists "tests/unit/core"
create_file_if_not_exists "tests/unit/neural/NeuralMesh.test.ts"
create_file_if_not_exists "tests/unit/behavioral/BehavioralEngine.test.ts"
create_file_if_not_exists "tests/unit/generative/OrganismEngine.test.ts"
create_file_if_not_exists "tests/unit/core/MessageBus.test.ts"

create_dir_if_not_exists "tests/integration"
create_file_if_not_exists "tests/integration/background.test.ts"
create_file_if_not_exists "tests/integration/content.test.ts"
create_file_if_not_exists "tests/integration/messaging.test.ts"

create_dir_if_not_exists "tests/e2e"
create_file_if_not_exists "tests/e2e/extension.test.ts"
create_file_if_not_exists "tests/e2e/organism.test.ts"

# docs
create_dir_if_not_exists "docs"
create_file_if_not_exists "docs/architecture.md"
create_file_if_not_exists "docs/api.md"
create_file_if_not_exists "docs/development.md"
create_file_if_not_exists "docs/deployment.md"

echo "----------------------------------------"
echo "✅ Structure du projet créée avec succès!"
echo ""
echo "Prochaines étapes:"
echo "1. npm init -y (si package.json est vide)"
echo "2. Installer les dépendances nécessaires"
echo "3. Configurer les fichiers de configuration"