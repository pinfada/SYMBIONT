// shaders/resonance-organism.frag
// Fragment shader avec visualisation de la résonance infrastructurelle
precision highp float;

varying vec2 v_texCoord;
varying float v_pattern;
varying vec3 v_position;

uniform float u_time;
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform float u_mutation;
uniform float u_colorVariance;
uniform float u_patternDensity;
uniform float u_fluidity;
uniform sampler2D u_fractalTex;

// Nouveaux uniforms pour la résonance
uniform float u_resonance;      // Niveau de résonance (0.0 - 1.0)
uniform float u_domJitter;       // Jitter DOM détecté
uniform float u_networkLatency;  // Latence réseau normalisée
uniform int u_resonanceType;     // 0 = none, 1 = network, 2 = dom

// GLSL 1.0 compatible
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Fonction de distorsion chromatique pour signaler l'interférence
vec3 applyChroma ticAberration(vec3 color, vec2 uv, float strength) {
    vec2 center = vec2(0.5, 0.5);
    vec2 offset = (uv - center) * strength;

    vec3 aberrated;
    aberrated.r = texture2D(u_fractalTex, uv + offset * 1.2).r;
    aberrated.g = texture2D(u_fractalTex, uv).g;
    aberrated.b = texture2D(u_fractalTex, uv - offset * 0.8).b;

    return mix(color, aberrated * color, strength);
}

// Fonction de vague de résonance
float resonanceWave(vec2 pos, float time, float frequency) {
    float wave = sin(length(pos) * frequency - time * 2.0);
    wave += sin(pos.x * frequency * 1.3 + time) * 0.5;
    wave += sin(pos.y * frequency * 0.7 - time * 1.5) * 0.3;
    return wave * 0.33;
}

void main() {
    // Pattern organique de base
    float pattern = v_pattern * u_patternDensity;
    pattern += sin(length(v_position.xy) * 10.0 + u_time) * 0.1;

    // Coordonnées pour la texture fractale
    vec2 texCoord = v_position.xy * 0.5 + 0.5;
    float fractal = texture2D(u_fractalTex, texCoord).r;

    // Couleur de base avec mutation
    vec3 color = mix(u_primaryColor, u_secondaryColor, pattern);

    // Variance chromatique standard
    float hue = atan(color.g, color.r) / (2.0 * 3.14159) + 0.5;
    hue += sin(u_time * 0.1) * u_colorVariance * 0.1;

    // Application de la résonance si détectée
    if (u_resonance > 0.1) {
        // Calcul de la fréquence de résonance
        float resonanceFreq = 10.0 + u_resonance * 20.0;
        float wave = resonanceWave(v_position.xy, u_time, resonanceFreq);

        // Modulation de la teinte basée sur le type de résonance
        if (u_resonanceType == 1) {
            // Network pressure: teintes rouges/oranges
            hue = mix(hue, 0.0, u_resonance * 0.7);

            // Distorsion basée sur la latence réseau
            float distortion = u_networkLatency * u_resonance;
            color.r += sin(v_position.y * 100.0 + u_time * 3.0) * distortion * 0.2;
        } else if (u_resonanceType == 2) {
            // DOM oppression: teintes bleues/violettes
            hue = mix(hue, 0.6, u_resonance * 0.7);

            // Distorsion basée sur le jitter DOM
            float distortion = u_domJitter * u_resonance;
            color.b += cos(v_position.x * 100.0 + u_time * 2.0) * distortion * 0.2;
        }

        // Application de l'onde de résonance
        hue += wave * u_resonance * 0.1;

        // Aberration chromatique proportionnelle à la résonance
        if (u_resonance > 0.5) {
            color = applyChroma ticAberration(color, texCoord, u_resonance * 0.3);
        }
    }

    // Conversion HSV vers RGB
    vec3 hsv = vec3(hue, 0.8 + u_resonance * 0.2, 0.9);
    color = hsv2rgb(hsv);

    // Modulation par la texture fractale
    color = mix(color, color * fractal, 0.5);

    // Effet de mutation standard
    color = mix(color, vec3(1.0) - color, u_mutation * 0.3);

    // Effet de halo pulsant avec amplification par résonance
    float dist = length(v_position.xy);
    float haloIntensity = 0.4 + 0.6 * abs(sin(u_time * u_fluidity));

    // Amplification du halo si résonance critique
    if (u_resonance > 0.8) {
        haloIntensity *= 1.0 + u_resonance;

        // Effet de "glitch" visuel pour signaler l'interférence
        float glitch = step(0.95, sin(u_time * 50.0)) * u_resonance;
        color = mix(color, 1.0 - color, glitch);
    }

    float halo = smoothstep(0.6 - u_resonance * 0.2, 0.9, dist) * haloIntensity;

    // Couleur du halo adaptée au type de résonance
    vec3 haloColor = vec3(0.8, 1.0, 1.0);
    if (u_resonanceType == 1) {
        haloColor = vec3(1.0, 0.7, 0.5); // Orange pour network
    } else if (u_resonanceType == 2) {
        haloColor = vec3(0.6, 0.8, 1.0); // Bleu pour DOM
    }

    color = mix(color, haloColor, halo);

    // Effet de "battement" synchronisé avec la résonance
    if (u_resonance > 0.3) {
        float pulse = sin(u_time * (5.0 + u_resonance * 10.0)) * 0.5 + 0.5;
        color *= 0.8 + pulse * 0.2 * u_resonance;
    }

    // Anti-aliasing avec modification par résonance
    float alpha = smoothstep(0.0, 0.01, pattern);
    alpha = max(alpha, halo * 0.5);

    // Augmentation de l'opacité en cas de résonance forte
    alpha = mix(alpha * 0.95, 1.0, u_resonance * 0.3);

    // Effet de scintillement subtil pour les résonances faibles
    if (u_resonance > 0.2 && u_resonance < 0.5) {
        float flicker = sin(u_time * 30.0 + v_position.x * 50.0) * 0.5 + 0.5;
        alpha *= 0.9 + flicker * 0.1 * u_resonance;
    }

    gl_FragColor = vec4(color, alpha);
}