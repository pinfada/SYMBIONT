# 🎨 Guide des Assets Visuels SYMBIONT

**Extension Chrome d'Organismes Intelligents Évolutifs**

## 📋 Vue d'Ensemble

Ce guide détaille tous les assets visuels de SYMBIONT pour le Chrome Web Store et la communication marketing. Tous les assets respectent les guidelines de Google et sont optimisés pour différentes résolutions.

## 🎯 Assets Chrome Web Store

### Icônes de l'Extension

#### Icône Principale (Obligatoire)
```
📁 public/assets/icons/
├── icon16.png    (16x16px)   - Barre d'outils Chrome
├── icon32.png    (32x32px)   - Windows/Linux menu
├── icon48.png    (48x48px)   - Extensions page
├── icon128.png   (128x128px) - Chrome Web Store + Installation
└── icon512.png   (512x512px) - Chrome Web Store listing
```

**Spécifications Techniques :**
- **Format :** PNG avec transparence
- **Style :** Flat design avec gradients subtils
- **Couleurs :** Palette cohérente (voir section Branding)
- **Lisibilité :** Contraste élevé pour accessibilité
- **Scalabilité :** Vectoriel initial (SVG) puis export PNG

**Design Guidelines :**
```css
/* Palette de couleurs principale */
Primary Blue: #2E7CFF
Secondary Purple: #8B5FBF  
Accent Green: #00C896
Background: #FFFFFF / #1A1A1A (dark mode)
Text: #2D3748 / #F7FAFC (dark mode)
```

**Concept Visuel :**
- **Symbole central :** Organisme stylisé avec connexions neurales
- **Style :** Bio-tech moderne avec éléments organiques
- **Animation :** Versions animées pour interface (pas pour store)

### Screenshots et Captures

#### Screenshots Principaux (Obligatoire)
```
📁 public/assets/images/screenshots/
├── dashboard.png     (1280x800px)  - Vue principale dashboard
├── evolution.png     (1280x800px)  - Processus d'évolution
├── organism.png      (1280x800px)  - Visualisation 3D organisme
├── social.png        (1280x800px)  - Fonctionnalités sociales
└── settings.png      (1280x800px)  - Interface paramètres
```

**Spécifications Chrome Web Store :**
- **Résolution :** 1280x800px ou 640x400px minimum
- **Format :** PNG, JPG (PNG recommandé)
- **Nombre :** 1-5 screenshots
- **Ordre :** Priorité par impact utilisateur

**Contenu par Screenshot :**

1. **dashboard.png - Vue Principale**
   ```
   Éléments visibles :
   - Organisme 3D animé au centre
   - Métriques temps réel (énergie, mutations)
   - Panneau de traits (radar chart)
   - Boutons d'action principaux
   - Interface claire et attractive
   ```

2. **evolution.png - Évolution en Action**
   ```
   Éléments visibles :
   - Processus de mutation en cours
   - Avant/après transformation
   - Indicateurs de progression
   - Notification de nouvelle capacité
   - Effet visuel d'évolution
   ```

3. **organism.png - Rendu 3D Détaillé**
   ```
   Éléments visibles :
   - Organisme complexe en WebGL
   - Détails morphologiques
   - Éclairage dynamique
   - Particules et effets
   - Controls de caméra
   ```

4. **social.png - Aspect Communautaire**
   ```
   Éléments visibles :
   - Réseau d'organismes connectés
   - Interface de partage
   - Événements mystiques
   - Classements/accomplissements
   - Chat communautaire
   ```

5. **settings.png - Configuration**
   ```
   Éléments visibles :
   - Paramètres de confidentialité
   - Options de performance
   - Thèmes visuels
   - Exportation de données
   - Interface claire et organisée
   ```

#### Marqueur Promotional (Optionnel)
```
📁 public/assets/images/store/
├── promotional-tile-440x280.png    - Tuile promotionnelle
├── promotional-banner-1400x560.png - Bannière large
└── promotional-video-thumbnail.jpg - Miniature vidéo (si applicable)
```

**Guidelines Promotional :**
- **Message clair :** Bénéfice principal en 3-4 mots
- **Visuel impactant :** Organisme ou évolution en action
- **Call-to-action :** "Créez votre organisme évolutif"
- **Branding :** Logo SYMBIONT intégré naturellement

### Logo et Branding

#### Logo Principal
```
📁 public/assets/images/branding/
├── logo.svg              - Version vectorielle maître
├── logo-light.png        - Fond clair (différentes résolutions)
├── logo-dark.png         - Fond sombre
├── logo-icon-only.svg    - Icône seule
└── logo-text-only.svg    - Texte seul
```

**Variations de Logo :**
```
Horizontal Layout:
[ICON] SYMBIONT
- Usage: Headers, documentation
- Ratio: 3:1 environ

Vertical Layout:
  [ICON]
 SYMBIONT
- Usage: Signatures, cartes de visite
- Ratio: 1:1.5 environ

Icon Only:
[ICON]
- Usage: Favicons, avatars, icônes app
- Versions: 16, 32, 64, 128, 256, 512px
```

**Typographie :**
```css
/* Police logo principal */
font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
font-weight: 700; /* Bold */
font-style: normal;
letter-spacing: -0.02em;

/* Police descriptive */
font-family: 'Inter', sans-serif;
font-weight: 400; /* Regular */
line-height: 1.5;
```

### Bannières et Headers

#### Chrome Web Store Header
```
📁 public/assets/images/store/
├── store-header-1400x560.png   - Bannière principale store
├── category-header-440x280.png - Vignette catégorie
└── featured-header-800x450.png - Si sélection par Google
```

**Contenu Bannière Store :**
- **Titre principal :** "Organismes Intelligents Évolutifs"
- **Sous-titre :** "Votre compagnon digital qui apprend et évolue"
- **Visuel :** Organisme 3D avec environnement neural
- **Call-to-action :** "Installer maintenant - Gratuit"

## 🎬 Assets Vidéo (Optionnel)

### Vidéo de Démonstration

#### Spécifications Techniques
```
Format: MP4 (H.264)
Résolution: 1920x1080 (Full HD)
Durée: 30-60 secondes maximum
Framerate: 30fps
Audio: Optionnel (sous-titres recommandés)
Taille: < 50MB
```

#### Script Vidéo Type
```
0-5s:   Logo SYMBIONT + tagline
        "Découvrez votre organisme évolutif"

5-15s:  Installation et premier lancement
        Création automatique de l'organisme

15-30s: Évolution en action
        Navigation → Apprentissage → Mutation

30-45s: Fonctionnalités avancées
        Visualisation 3D + Social

45-60s: Call-to-action final
        "Téléchargez SYMBIONT maintenant"
```

### Assets Vidéo de Support
```
📁 public/assets/videos/
├── demo-30s.mp4           - Démo courte store
├── onboarding-loop.mp4    - Animation d'accueil
├── evolution-process.mp4  - Processus évolution détaillé
└── features-overview.mp4  - Tour des fonctionnalités
```

## 🌟 Assets Marketing Extended

### Réseaux Sociaux

#### Formats Standardisés
```
📁 marketing/social/
├── twitter-header-1500x500.png
├── facebook-cover-820x312.png
├── linkedin-banner-1584x396.png
├── instagram-story-1080x1920.png
├── youtube-thumbnail-1280x720.png
└── discord-banner-960x540.png
```

#### Templates par Plateforme

**Twitter/X :**
```
Header: Logo + tagline + organisme stylisé
Posts: Carrés 1080x1080 avec démos features
Stories: Vertical 1080x1920 avec vidéos courtes
```

**YouTube :**
```
Thumbnail: Organisme 3D + texte impact + flèche
Channel Art: SYMBIONT branding + screenshots
Intro/Outro: Animation logo 3-5 secondes
```

**Discord :**
```
Server Banner: Communauté SYMBIONT + call-to-action
Emojis: Icônes organisme pour réactions
Avatar: Logo SYMBIONT version Discord
```

### Documentation Visuelle

#### Diagrammes et Schémas
```
📁 docs/assets/diagrams/
├── architecture-overview.svg    - Vue système générale
├── data-flow-diagram.svg       - Flux de données
├── neural-network-schema.svg   - Structure réseau neural
├── evolution-process.svg       - Processus mutations
└── user-journey-map.svg        - Parcours utilisateur
```

**Style Diagrammes :**
```css
/* Couleurs techniques */
Background: #F8FAFC
Boxes: #FFFFFF with #E2E8F0 border
Text: #2D3748
Arrows: #4299E1
Highlights: #00C896
Warnings: #F56565
```

#### Infographies
```
📁 marketing/infographics/
├── organism-evolution-stages.png  - Étapes évolution
├── privacy-security-benefits.png - Avantages sécurité
├── performance-comparison.png     - Comparaison performance
└── feature-comparison.png        - Vs concurrence
```

### Matériel de Presse

#### Press Kit Complet
```
📁 marketing/press-kit/
├── high-res-logos/
│   ├── logo-1000px.png
│   ├── logo-2000px.png
│   └── logo-vector.eps
├── screenshots-hd/
│   ├── dashboard-4k.png
│   ├── evolution-4k.png
│   └── social-4k.png
├── team-photos/
├── company-backgrounder.pdf
└── press-release-template.docx
```

## 🎨 Guidelines Création

### Processus de Création

#### 1. Conception Initiale
```bash
# Outils recommandés
Design: Figma, Adobe XD, Sketch
Vector: Adobe Illustrator, Inkscape
Photo: Adobe Photoshop, GIMP
3D: Blender, Three.js pour WebGL assets
```

#### 2. Itération et Feedback
```
Design Review Process:
1. Concept initial → Team design review
2. Mockups détaillés → User testing
3. Assets finaux → Technical validation
4. Export optimisé → QA visuelle
```

#### 3. Export et Optimisation
```bash
# Commandes d'optimisation
pngquant screenshot.png --quality=80-95 --output optimized.png
svgo logo.svg --multipass --pretty
ffmpeg -i demo.mov -c:v libx264 -crf 23 demo.mp4
```

### Standards Visuels

#### Cohérence Visuelle
```css
/* Système de design SYMBIONT */
:root {
  /* Couleurs primaires */
  --primary-blue: #2E7CFF;
  --secondary-purple: #8B5FBF;
  --accent-green: #00C896;
  
  /* Couleurs fonctionnelles */
  --success: #48BB78;
  --warning: #ED8936;
  --error: #F56565;
  --info: #4299E1;
  
  /* Tons neutres */
  --gray-50: #F7FAFC;
  --gray-100: #EDF2F7;
  --gray-200: #E2E8F0;
  --gray-500: #A0AEC0;
  --gray-700: #4A5568;
  --gray-900: #1A202C;
  
  /* Typographie */
  --font-primary: 'Inter', system-ui, sans-serif;
  --font-code: 'JetBrains Mono', monospace;
  
  /* Espacements */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 3rem;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

#### Iconographie
```
Style: Outlined avec remplissage sélectif
Taille: Multiples de 8px (16, 24, 32, 48)
Stroke: 2px pour cohérence
Angles: Arrondis 2px pour douceur
Couleurs: Système de couleurs respecté
```

### Validation et Tests

#### Checklist Pré-Publication
```
□ Résolutions correctes pour toutes plateformes
□ Formats de fichier appropriés (PNG/SVG/MP4)
□ Tailles de fichier optimisées (< limits)
□ Contraste et accessibilité vérifiés
□ Cohérence avec brand guidelines
□ Tests sur différents écrans/DPI
□ Validation avec équipe design
□ Backup et versioning des sources
```

#### Tests d'Affichage
```bash
# Test responsive des images
- Desktop: 1920x1080, 2560x1440
- Laptop: 1366x768, 1440x900  
- Mobile: 375x667, 414x896
- Tablet: 768x1024, 1024x768

# Test DPI
- Standard: 1x (96 DPI)
- HiDPI: 2x (192 DPI)
- Retina: 3x (288 DPI)
```

## 📊 Métriques et Analytics

### Tracking Performance Assets

#### KPIs Visuels Chrome Web Store
```
Conversion Rate: Vues → Installations
Click-through Rate: Screenshots
Time spent: Page description
Bounce Rate: Première impression
```

#### A/B Testing Assets
```
Screenshots: Ordre d'affichage optimal
Icon: Variantes de style/couleur
Banner: Messages et call-to-action
Video: Avec/sans vidéo démo
```

### Optimisation Continue
```
Cycle d'amélioration:
1. Analytics → Identification points faibles
2. Hypothèses → Design alternatives
3. A/B Testing → Validation données
4. Deployment → Mise en production
5. Monitoring → Mesure impact
```

## 📞 Resources et Support

### Assets Sources
- **Figma Design System :** [lien internal]
- **Brand Guidelines :** [lien documentation]
- **Asset Repository :** `public/assets/` in project
- **Export Scripts :** `scripts/generate-assets.js`

### Contacts Équipe
- **Design Lead :** design@symbiont-extension.com
- **Marketing :** marketing@symbiont-extension.com  
- **Review Assets :** assets-review@symbiont-extension.com

### Outils et Licensing
- **Fonts :** Inter (Open Font License)
- **Icons :** Custom + Lucide React (MIT)
- **Images :** Original creation + Unsplash (si applicable)
- **License :** Tous assets under MIT license

---

**Ce guide évoluera avec les besoins marketing et les retours utilisateurs.**

*Dernière mise à jour : 17 août 2025*