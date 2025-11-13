# SYMBIONT Extension Architecture - Sequence Diagrams

This document contains comprehensive sequence diagrams showing the message flows and component interactions in the SYMBIONT Chrome extension.

## Table of Contents
- [1. Extension Initialization](#1-extension-initialization)
- [2. Behavior Tracking Flow](#2-behavior-tracking-flow)
- [3. Organism Mutation Flow](#3-organism-mutation-flow)
- [4. Social Invitation Flow](#4-social-invitation-flow)
- [5. Collective Wake Flow](#5-collective-wake-flow)
- [6. WebGL Rendering Flow](#6-webgl-rendering-flow)

---

## 1. Extension Initialization

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant ServiceWorker as Service Worker
    participant Background as Background Service
    participant Storage as SymbiontStorage (IndexedDB)
    participant ContentScript as Content Script
    participant Popup as Popup UI

    User->>Browser: Install/Enable Extension
    Browser->>ServiceWorker: Load service-worker.ts

    activate ServiceWorker
    ServiceWorker->>ServiceWorker: SecurityMonitor.initialize()
    ServiceWorker->>ServiceWorker: SecureMessageBus.initializeSecureListeners()
    ServiceWorker->>Background: Create BackgroundService instance
    deactivate ServiceWorker

    activate Background
    Background->>Storage: Initialize IndexedDB
    Storage-->>Background: Ready

    Background->>Storage: Load stored organism
    alt Organism exists
        Storage-->>Background: Return organism state
    else No organism
        Background->>Background: Create new organism (OrganismFactory)
        Background->>Storage: Save new organism
    end

    Background->>Background: setupMessageHandlers() (39 message types)
    Background->>Background: startPeriodicTasks() (30s, 60s intervals)
    deactivate Background

    User->>Browser: Navigate to any webpage
    Browser->>ContentScript: Inject content script

    activate ContentScript
    ContentScript->>ContentScript: NavigationObserver.start()
    ContentScript->>ContentScript: InteractionCollector.start()
    ContentScript->>ContentScript: AttentionMonitor.start()
    ContentScript->>ContentScript: ScrollTracker.start()
    ContentScript->>ContentScript: DOMAnalyzer.analyze()
    ContentScript->>Background: PAGE_ANALYSIS_COMPLETE
    deactivate ContentScript

    User->>Popup: Open extension popup
    activate Popup
    Popup->>Storage: Load organism state
    Storage-->>Popup: Return state
    Popup->>Background: REQUEST: ORGANISM_UPDATE
    Background-->>Popup: ORGANISM_UPDATE (current state)
    Popup->>Popup: Initialize WebGL rendering
    Popup->>Popup: Render organism visualization
    deactivate Popup
```

---

## 2. Behavior Tracking Flow

```mermaid
sequenceDiagram
    participant User
    participant ContentScript as Content Script
    participant InteractionCollector
    participant MessageBus
    participant Background as Background Service
    participant OrganismCore
    participant Storage as SymbiontStorage
    participant Popup as Popup UI

    User->>ContentScript: Visit google.com
    activate ContentScript
    ContentScript->>ContentScript: DOMAnalyzer.analyze()
    Note over ContentScript: Categorize: "search"<br/>Count: words, images, links<br/>Performance: FCP, LCP, DCL

    ContentScript->>MessageBus: PAGE_VISIT
    Note right of MessageBus: {<br/>  url: "google.com",<br/>  category: "search",<br/>  contentMetrics: {...},<br/>  performance: {...}<br/>}
    deactivate ContentScript

    MessageBus->>Background: Route PAGE_VISIT
    activate Background
    Background->>Background: Update behavior data
    Note over Background: visitCount++<br/>lastVisit = now<br/>Add to events[]

    Background->>OrganismCore: updateTraits(urlCategory)
    Note over OrganismCore: New domain:<br/>curiosity +1.0

    Background->>Background: checkForMutations()
    Note over Background: Time-based probability<br/>+ activity intensity

    alt Mutation triggered
        Background->>OrganismCore: generateMutation()
        OrganismCore-->>Background: Mutation (visual/behavioral/cognitive)
        Background->>OrganismCore: applyMutation()
        Background->>Storage: Save organism with mutation
    end

    Background->>MessageBus: ORGANISM_UPDATE
    Note right of MessageBus: {<br/>  state: {traits, health, energy},<br/>  mutations: [last 5]<br/>}
    deactivate Background

    MessageBus->>Popup: ORGANISM_UPDATE
    activate Popup
    Popup->>Popup: Update UI state
    Popup->>Popup: Trigger WebGL re-render
    Popup->>Popup: Animate mutation visualization
    deactivate Popup

    User->>ContentScript: Submit form
    activate ContentScript
    ContentScript->>InteractionCollector: handleFormSubmit()
    InteractionCollector->>InteractionCollector: isSignificantInteraction()
    Note over InteractionCollector: form_submit = true
    InteractionCollector->>MessageBus: INTERACTION_DETECTED (immediate)
    Note right of MessageBus: {<br/>  type: "form_submit",<br/>  data: {action, method, fieldCount}<br/>}
    deactivate ContentScript

    MessageBus->>Background: Route INTERACTION_DETECTED
    activate Background
    Background->>Background: Record in events[]
    Background->>Background: analyzeContextualPatterns()

    alt Pattern detected (burst/cycle/alternance)
        Background->>MessageBus: CONTEXTUAL_INVITATION
        MessageBus->>Popup: Display invitation prompt
    end
    deactivate Background
```

---

## 3. Organism Mutation Flow

```mermaid
sequenceDiagram
    participant Background as Background Service
    participant OrganismCore
    participant NeuralCoreEngine
    participant HebbianLearning
    participant Storage as SymbiontStorage
    participant MessageBus
    participant Popup as Popup UI

    Note over Background: Periodic Task (every 30s)
    Background->>Background: checkForMutations()

    Background->>Background: Calculate mutation probability
    Note over Background: timeSinceLastMutation ÷ BASE_INTERVAL<br/>+ activityIntensity<br/>+ randomness (1%)

    alt Mutation triggered
        Background->>NeuralCoreEngine: determineMutationType()
        NeuralCoreEngine->>HebbianLearning: analyzePatterns()

        alt High-intensity pattern (timeSpent > 0.7)
            HebbianLearning-->>NeuralCoreEngine: COGNITIVE mutation
            Note over NeuralCoreEngine: Trigger: curiosity_spike<br/>Magnitude: 0.4-0.6
        else Pattern learning detected
            HebbianLearning-->>NeuralCoreEngine: BEHAVIORAL mutation
            Note over NeuralCoreEngine: Trigger: navigation_speed<br/>Magnitude: 0.2-0.4
        else Random (1% probability)
            HebbianLearning-->>NeuralCoreEngine: VISUAL mutation
            Note over NeuralCoreEngine: Trigger: color_shift<br/>Magnitude: 0.1-0.3
        end

        NeuralCoreEngine-->>Background: Mutation object

        Background->>OrganismCore: applyMutation(mutation)
        activate OrganismCore

        alt Mutation type = VISUAL
            OrganismCore->>OrganismCore: Modify visualDNA
            Note over OrganismCore: Hue shift, saturation change,<br/>pattern complexity adjustment
        else Mutation type = BEHAVIORAL
            OrganismCore->>OrganismCore: Modify traits
            Note over OrganismCore: curiosity += magnitude<br/>focus += magnitude<br/>rhythm adjustment
        else Mutation type = COGNITIVE
            OrganismCore->>OrganismCore: Modify neural weights
            Note over OrganismCore: memory += magnitude<br/>intuition += magnitude<br/>consciousness boost
        end

        OrganismCore->>OrganismCore: Normalize traits (0-100)
        OrganismCore->>OrganismCore: Update consciousness level
        OrganismCore-->>Background: Updated organism state
        deactivate OrganismCore

        Background->>Storage: Save organism state
        Storage-->>Background: Saved

        Background->>Background: Generate contextual MURMUR
        Note over Background: Based on mutation type<br/>and current traits

        Background->>MessageBus: ORGANISM_UPDATE
        Note right of MessageBus: {<br/>  state: {...},<br/>  mutations: [recent 5]<br/>}

        Background->>MessageBus: MURMUR
        Note right of MessageBus: {<br/>  message: "I feel different...",<br/>  context: "mutation",<br/>  intensity: 0.8<br/>}

        MessageBus->>Popup: Forward messages
        activate Popup
        Popup->>Popup: Display mutation notification
        Popup->>Popup: Animate organism transition
        Popup->>Popup: Show MURMUR message
        deactivate Popup
    end

    Note over Background: Health decay (every 60s)
    Background->>OrganismCore: updateHealth(-0.1)
    Background->>OrganismCore: updateEnergy(-0.05)
    Background->>Storage: Save updated state
```

---

## 4. Social Invitation Flow

```mermaid
sequenceDiagram
    participant UserA as User A (Inviter)
    participant PopupA as Popup UI (A)
    participant MessageBus
    participant Background as Background Service
    participant InvitationService
    participant SecurityManager
    participant Storage as SymbiontStorage
    participant PopupB as Popup UI (B)
    participant UserB as User B (Invitee)

    UserA->>PopupA: Click "Generate Invitation"
    activate PopupA
    PopupA->>MessageBus: GENERATE_INVITATION
    Note right of MessageBus: {<br/>  donorId: "user-a-id"<br/>}
    deactivate PopupA

    MessageBus->>Background: Route message
    activate Background
    Background->>InvitationService: generateInvitation(donorId)
    activate InvitationService

    InvitationService->>InvitationService: generateSecureUUID()
    Note over InvitationService: Cryptographically secure

    InvitationService->>InvitationService: Anonymize behavior pattern
    Note over InvitationService: Remove PII:<br/>- URLs anonymized<br/>- Timestamps relative<br/>- Only trait averages

    InvitationService->>Storage: Store invitation
    Note right of Storage: {<br/>  code: "abc-123",<br/>  donorId: "user-a-id",<br/>  expiresAt: now + 24h,<br/>  used: false<br/>}
    Storage-->>InvitationService: Saved

    InvitationService-->>Background: Invitation created
    deactivate InvitationService

    Background->>MessageBus: INVITATION_GENERATED
    Note right of MessageBus: {<br/>  code: "abc-123",<br/>  expiresAt: timestamp<br/>}
    deactivate Background

    MessageBus->>PopupA: Forward message
    activate PopupA
    PopupA->>PopupA: Display invitation code
    PopupA->>PopupA: Show share UI (copy, QR, etc.)
    deactivate PopupA

    UserA->>UserB: Share invitation code "abc-123"

    UserB->>PopupB: Enter invitation code
    activate PopupB
    PopupB->>MessageBus: CHECK_INVITATION
    Note right of MessageBus: {<br/>  code: "abc-123"<br/>}
    deactivate PopupB

    MessageBus->>Background: Route message
    activate Background
    Background->>InvitationService: checkInvitation(code)
    activate InvitationService
    InvitationService->>Storage: Query invitation
    Storage-->>InvitationService: Invitation data

    alt Valid & not expired
        InvitationService-->>Background: { valid: true }
    else Invalid or expired
        InvitationService-->>Background: { valid: false, reason: "..." }
    end
    deactivate InvitationService

    Background->>MessageBus: INVITATION_CHECKED
    deactivate Background
    MessageBus->>PopupB: Forward result

    alt Valid invitation
        PopupB->>PopupB: Enable "Accept" button
        UserB->>PopupB: Click "Accept Invitation"

        activate PopupB
        PopupB->>MessageBus: CONSUME_INVITATION
        Note right of MessageBus: {<br/>  code: "abc-123",<br/>  receiverId: "user-b-id"<br/>}
        deactivate PopupB

        MessageBus->>Background: Route message
        activate Background
        Background->>InvitationService: consumeInvitation(code, receiverId)
        activate InvitationService

        InvitationService->>SecurityManager: validateDataAccess(receiverId)
        SecurityManager-->>InvitationService: Access granted

        InvitationService->>Storage: Update invitation (used=true, receiverId)
        InvitationService->>Storage: Record social connection (A ↔ B)

        alt User B has no organism
            InvitationService->>InvitationService: Create organism for User B
            Note over InvitationService: Initialize with:<br/>- Default traits<br/>- Generation = inviter.generation + 1<br/>- Visual DNA from inviter (mutated)
            InvitationService->>Storage: Save new organism
        end

        InvitationService-->>Background: Consumption successful
        deactivate InvitationService

        Background->>MessageBus: INVITATION_CONSUMED
        Note right of MessageBus: {<br/>  success: true,<br/>  newOrganism: {...}<br/>}
        deactivate Background

        MessageBus->>PopupB: Forward result
        activate PopupB
        PopupB->>PopupB: Display success message
        PopupB->>PopupB: Show new organism
        PopupB->>PopupB: Animate birth sequence
        deactivate PopupB

        MessageBus->>PopupA: ORGANISM_UPDATE (connection formed)
        activate PopupA
        PopupA->>PopupA: Update social connections count
        deactivate PopupA
    end
```

---

## 5. Collective Wake Flow

```mermaid
sequenceDiagram
    participant UserA as User A
    participant UserB as User B
    participant UserC as User C
    participant PopupA as Popup UI (A)
    participant PopupB as Popup UI (B)
    participant PopupC as Popup UI (C)
    participant MessageBus
    participant Background as Background Service
    participant CollectiveManager
    participant Storage as SymbiontStorage

    Note over UserA,UserC: Users simultaneously open popup

    UserA->>PopupA: Open popup
    activate PopupA
    PopupA->>MessageBus: COLLECTIVE_WAKE_REQUEST
    Note right of MessageBus: {<br/>  userId: "user-a-id",<br/>  timestamp: T0<br/>}
    deactivate PopupA

    MessageBus->>Background: Route message
    activate Background
    Background->>CollectiveManager: registerParticipant(userA, T0)
    activate CollectiveManager
    CollectiveManager->>CollectiveManager: Add to 10-second window
    Note over CollectiveManager: Participants: [A]<br/>Threshold: 3 needed
    deactivate CollectiveManager
    deactivate Background

    UserB->>PopupB: Open popup (T0 + 3s)
    activate PopupB
    PopupB->>MessageBus: COLLECTIVE_WAKE_REQUEST
    Note right of MessageBus: {<br/>  userId: "user-b-id",<br/>  timestamp: T0 + 3s<br/>}
    deactivate PopupB

    MessageBus->>Background: Route message
    activate Background
    Background->>CollectiveManager: registerParticipant(userB, T0+3s)
    activate CollectiveManager
    CollectiveManager->>CollectiveManager: Add to 10-second window
    Note over CollectiveManager: Participants: [A, B]<br/>Threshold: 3 needed
    deactivate CollectiveManager
    deactivate Background

    UserC->>PopupC: Open popup (T0 + 5s)
    activate PopupC
    PopupC->>MessageBus: COLLECTIVE_WAKE_REQUEST
    Note right of MessageBus: {<br/>  userId: "user-c-id",<br/>  timestamp: T0 + 5s<br/>}
    deactivate PopupC

    MessageBus->>Background: Route message
    activate Background
    Background->>CollectiveManager: registerParticipant(userC, T0+5s)
    activate CollectiveManager
    CollectiveManager->>CollectiveManager: Add to 10-second window
    Note over CollectiveManager: Participants: [A, B, C]<br/>THRESHOLD REACHED!

    CollectiveManager->>CollectiveManager: detectCollectiveSync()
    Note over CollectiveManager: 3+ users within 10s window

    CollectiveManager->>CollectiveManager: fuseTraits()
    Note over CollectiveManager: Calculate average:<br/>avg(A.traits, B.traits, C.traits)

    CollectiveManager->>CollectiveManager: applyCollectiveBonus()
    Note over CollectiveManager: empathy += 0.05<br/>creativity += 0.05

    loop For each participant
        CollectiveManager->>Storage: Load organism
        Storage-->>CollectiveManager: Organism state
        CollectiveManager->>CollectiveManager: Apply fused traits + bonus
        CollectiveManager->>Storage: Save updated organism
    end

    CollectiveManager-->>Background: Collective wake completed
    deactivate CollectiveManager

    Background->>MessageBus: COLLECTIVE_WAKE_RESULT (broadcast)
    Note right of MessageBus: {<br/>  participants: ["A", "B", "C"],<br/>  fusedTraits: {...},<br/>  bonus: {empathy: +0.05, ...}<br/>}
    deactivate Background

    MessageBus->>PopupA: Forward result
    activate PopupA
    PopupA->>PopupA: Display synchronization animation
    PopupA->>PopupA: Show participant avatars
    PopupA->>PopupA: Animate trait convergence
    PopupA->>PopupA: Show bonus notification
    deactivate PopupA

    MessageBus->>PopupB: Forward result
    activate PopupB
    PopupB->>PopupB: Display synchronization animation
    PopupB->>PopupB: Show participant avatars
    PopupB->>PopupB: Animate trait convergence
    PopupB->>PopupB: Show bonus notification
    deactivate PopupB

    MessageBus->>PopupC: Forward result
    activate PopupC
    PopupC->>PopupC: Display synchronization animation
    PopupC->>PopupC: Show participant avatars
    PopupC->>PopupC: Animate trait convergence
    PopupC->>PopupC: Show bonus notification
    deactivate PopupC
```

---

## 6. WebGL Rendering Flow

```mermaid
sequenceDiagram
    participant Popup as Popup UI
    participant useWebGL as useWebGL Hook
    participant WebGLOrchestrator
    participant MessageBus
    participant Background as Background Service
    participant OrganismCore

    Popup->>useWebGL: Mount component
    activate useWebGL
    useWebGL->>useWebGL: Initialize WebGL context
    useWebGL->>MessageBus: WEBGL_INIT
    Note right of MessageBus: {<br/>  canvas: canvasRef,<br/>  dimensions: {width, height}<br/>}
    deactivate useWebGL

    MessageBus->>Background: Route message
    activate Background
    Background->>WebGLOrchestrator: initialize(canvas, dimensions)
    activate WebGLOrchestrator

    WebGLOrchestrator->>WebGLOrchestrator: Create WebGL context
    WebGLOrchestrator->>WebGLOrchestrator: Load shaders (vertex + fragment)
    WebGLOrchestrator->>WebGLOrchestrator: Compile shader program
    WebGLOrchestrator->>WebGLOrchestrator: Setup buffers (vertices, colors, indices)

    alt Initialization success
        WebGLOrchestrator-->>Background: { success: true }
        Background->>MessageBus: WEBGL_INITIALIZED
    else Initialization error
        WebGLOrchestrator-->>Background: { error: "..." }
        Background->>MessageBus: WEBGL_ERROR
    end
    deactivate WebGLOrchestrator
    deactivate Background

    MessageBus->>Popup: Forward result
    activate Popup

    alt Success
        Popup->>Popup: Enable rendering
        Popup->>Popup: Start animation loop (requestAnimationFrame)
    else Error
        Popup->>Popup: Display fallback UI (SVG/Canvas 2D)
    end
    deactivate Popup

    Note over Popup,Background: Periodic organism update (30s)

    Background->>MessageBus: ORGANISM_UPDATE
    Note right of MessageBus: {<br/>  state: {traits, visualDNA, health},<br/>  mutations: [...]<br/>}

    MessageBus->>Popup: Forward update
    activate Popup
    Popup->>useWebGL: Update organism state
    activate useWebGL

    useWebGL->>useWebGL: Parse visualDNA
    Note over useWebGL: Extract:<br/>- Color (hue, saturation, lightness)<br/>- Geometry (complexity, symmetry)<br/>- Animation (speed, pattern)

    useWebGL->>WebGLOrchestrator: updateGeometry(traits)
    activate WebGLOrchestrator
    WebGLOrchestrator->>WebGLOrchestrator: Generate vertices based on traits
    Note over WebGLOrchestrator: curiosity → spikiness<br/>focus → symmetry<br/>creativity → complexity
    WebGLOrchestrator->>WebGLOrchestrator: Update vertex buffer
    deactivate WebGLOrchestrator

    useWebGL->>WebGLOrchestrator: updateColors(visualDNA)
    activate WebGLOrchestrator
    WebGLOrchestrator->>WebGLOrchestrator: Parse DNA color values
    WebGLOrchestrator->>WebGLOrchestrator: Update color buffer
    deactivate WebGLOrchestrator

    useWebGL->>useWebGL: Trigger re-render
    deactivate useWebGL

    loop Animation frame (60 FPS)
        Popup->>WebGLOrchestrator: render(deltaTime)
        activate WebGLOrchestrator
        WebGLOrchestrator->>WebGLOrchestrator: Clear canvas
        WebGLOrchestrator->>WebGLOrchestrator: Update uniforms (time, rotation)
        WebGLOrchestrator->>WebGLOrchestrator: Draw geometry
        Note over WebGLOrchestrator: gl.drawElements(gl.TRIANGLES, ...)
        WebGLOrchestrator-->>Popup: Frame rendered
        deactivate WebGLOrchestrator
    end

    deactivate Popup
```

---

## Architecture Patterns Summary

### Message-Driven Architecture
All components communicate exclusively through the MessageBus using 39 distinct message types, ensuring:
- **Loose coupling**: Components don't directly depend on each other
- **Async communication**: Non-blocking operations throughout
- **Type safety**: TypeScript enums for all message types

### Security Layers
1. **SecureMessageBus**: Validates, signs, and verifies all messages
   - Anti-replay protection (nonce tracking)
   - Message age verification (max 30s)
   - Schema validation per message type

2. **SecurityManager**: Encrypts sensitive data before storage
   - Access control validation
   - Data anonymization for sharing
   - GDPR-compliant handling

### Resilient Communication
- **Circuit Breaker**: Prevents cascade failures (5 failures → open circuit)
- **Persistent Queue**: Stores failed messages with retry strategies
- **Fallback Actions**: Graceful degradation per message type

### Event Sourcing
- All user behaviors recorded in events array
- Pattern detection on event history
- Mutation generation based on accumulated patterns

### Hebbian Learning
- Neural network strengthens connections between behaviors and outcomes
- High-intensity patterns trigger cognitive mutations
- Pattern learning drives behavioral mutations
- 1% random mutations for diversity

---

## Key Metrics

- **Message Types**: 39 distinct types across 6 categories
- **Components**: 3 main (Content, Background, Popup) + 15+ services
- **Storage**: IndexedDB (primary) + localStorage (fallback) + chrome.storage (flags)
- **Security**: 2 layers (message validation + encryption)
- **Resilience**: Circuit breaker + persistent queue + fallbacks
- **Performance**: 30s organism sync, 60s health decay, 100ms-1s behavior collection
- **Social**: P2P invitations, trait merging, collective synchronization

---

## File References

- MessageBus: `src/shared/messaging/MessageBus.ts:1`
- Content Script: `src/content/index.ts:1`
- Background Service: `src/background/index.ts:1`
- OrganismCore: `src/core/OrganismCore.ts:1`
- InvitationService: `src/background/InvitationService.ts:1`
- WebGL Orchestrator: `src/background/WebGLOrchestrator.ts:1`
- Popup Hooks: `src/popup/hooks/useMessaging.ts:1`
