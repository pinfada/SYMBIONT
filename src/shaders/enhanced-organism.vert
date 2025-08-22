// shaders/enhanced-organism.vert
precision highp float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform float u_time;
uniform float u_complexity;
uniform float u_fluidity;
uniform float u_consciousness;
uniform vec2 u_resolution;
uniform mat3 u_transform;

// Traits de l'organisme
uniform float u_curiosity;
uniform float u_focus;
uniform float u_rhythm;
uniform float u_empathy;
uniform float u_creativity;

varying vec2 v_texCoord;
varying vec2 v_position;
varying float v_pattern;
varying float v_energy;
varying float v_consciousness;

// Fonction de bruit optimisée
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Bruit fractal basé sur les traits
float fractalNoise(vec2 p, float complexity) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0 + complexity * u_creativity;
    }
    
    return value;
}

void main() {
    v_texCoord = a_texCoord;
    v_position = a_position;
    
    // Déformation basée sur les traits
    vec2 pos = a_position;
    
    // Effet de fluidité basé sur empathy et rhythm
    float fluidEffect = sin(u_time * u_rhythm + pos.x * u_empathy) * u_fluidity;
    pos.x += fluidEffect * 0.1;
    
    // Déformation de curiosité (exploration spatiale)
    float curiosityWave = sin(u_time * 0.5 + length(pos) * u_curiosity * 5.0) * 0.05;
    pos += normalize(pos) * curiosityWave;
    
    // Focus affecte la stabilité (moins de déformation si focus élevé)
    float focusStability = 1.0 - u_focus * 0.3;
    float instability = noise(pos + u_time * 0.1) * focusStability * 0.02;
    pos += vec2(instability, instability * 0.7);
    
    // Pattern fractal pour la surface
    v_pattern = fractalNoise(pos * 2.0 + u_time * 0.1, u_complexity);
    
    // Énergie basée sur la distance au centre et la conscience
    float distanceFromCenter = length(pos);
    v_energy = (1.0 - distanceFromCenter) * u_consciousness;
    v_consciousness = u_consciousness;
    
    // Transformation finale
    vec3 worldPos = u_transform * vec3(pos, 1.0);
    
    gl_Position = vec4(worldPos.xy, 0.0, 1.0);
}