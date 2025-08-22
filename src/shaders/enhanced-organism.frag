// shaders/enhanced-organism.frag
precision highp float;

varying vec2 v_texCoord;
varying vec2 v_position;
varying float v_pattern;
varying float v_energy;
varying float v_consciousness;

uniform float u_time;
uniform float u_mutation;
uniform float u_energy;
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;
uniform sampler2D u_noiseTexture;

// Traits pour influencer l'apparence
uniform float u_curiosity;
uniform float u_focus;
uniform float u_rhythm;
uniform float u_empathy;
uniform float u_creativity;

// Conversion HSV vers RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Fonction de mélange de couleurs basée sur les traits
vec3 traitColorMix(vec3 base, float pattern) {
    // Curiosity affecte la variance des couleurs
    float hueShift = u_curiosity * sin(u_time * 0.5 + v_position.x * 10.0) * 0.1;
    
    // Creativity influence la saturation
    float saturation = 0.6 + u_creativity * 0.4;
    
    // Focus affecte la cohérence (moins de variations si focus élevé)
    float coherence = u_focus;
    float noise = texture(u_noiseTexture, v_texCoord + u_time * 0.01).r;
    float colorVariation = mix(noise, 0.5, coherence);
    
    // Empathy influence la chaleur des couleurs
    vec3 warmShift = vec3(u_empathy * 0.2, 0.0, -u_empathy * 0.1);
    
    // Rhythm crée des pulsations de couleur
    float rhythmPulse = sin(u_time * u_rhythm * 2.0) * 0.1 + 1.0;
    
    vec3 color = mix(u_primaryColor, u_secondaryColor, pattern);
    color += warmShift;
    color *= rhythmPulse;
    
    // Conversion en HSV pour manipulation
    float hue = atan(color.y, color.x) / (2.0 * 3.14159) + 0.5 + hueShift;
    vec3 hsv = vec3(hue, saturation, 0.8 + colorVariation * 0.2);
    
    return hsv2rgb(hsv);
}

void main() {
    // Distance du centre pour les effets radiaux
    float distanceFromCenter = length(v_position);
    
    // Pattern organique complexe
    vec2 noiseCoord = v_texCoord + u_time * 0.05;
    float noise1 = texture(u_noiseTexture, noiseCoord).r;
    float noise2 = texture(u_noiseTexture, noiseCoord * 2.0 + vec2(100.0)).r;
    
    float organicPattern = v_pattern + noise1 * 0.3 + noise2 * 0.1;
    organicPattern += sin(distanceFromCenter * 8.0 + u_time * 2.0) * 0.1;
    
    // Couleur de base basée sur les traits
    vec3 baseColor = traitColorMix(u_primaryColor, organicPattern);
    
    // Effet de conscience (halo central)
    float consciousnessGlow = v_consciousness * exp(-distanceFromCenter * 2.0);
    consciousnessGlow *= (1.0 + sin(u_time * 3.0) * 0.3);
    
    // Mélange avec couleur d'accent pour la conscience
    baseColor = mix(baseColor, u_accentColor, consciousnessGlow * 0.4);
    
    // Effet d'énergie (pulsation)
    float energyPulse = v_energy * (0.8 + 0.2 * sin(u_time * 4.0));
    baseColor *= (0.7 + energyPulse * 0.3);
    
    // Effet de mutation (inversion partielle)
    if (u_mutation > 0.1) {
        float mutationMask = noise1 * noise2;
        if (mutationMask > (1.0 - u_mutation)) {
            baseColor = vec3(1.0) - baseColor * 0.8;
        }
    }
    
    // Éclairage procédural
    vec3 lightDir = normalize(vec3(cos(u_time * 0.5), sin(u_time * 0.5), 0.5));
    vec3 normal = normalize(vec3(v_position, sqrt(1.0 - dot(v_position, v_position))));
    float lighting = max(0.3, dot(normal, lightDir));
    
    baseColor *= lighting;
    
    // Effet de bord (rim lighting)
    float rimEffect = 1.0 - distanceFromCenter;
    rimEffect = pow(rimEffect, 2.0);
    baseColor += u_accentColor * rimEffect * 0.2;
    
    // Transparence basée sur la distance et l'énergie
    float alpha = smoothstep(1.0, 0.7, distanceFromCenter);
    alpha *= (0.8 + v_energy * 0.2);
    
    // Anti-aliasing doux
    alpha *= smoothstep(0.0, 0.02, organicPattern);
    
    gl_FragColor = vec4(baseColor, alpha * 0.9);
}