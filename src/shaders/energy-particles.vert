// shaders/energy-particles.vert
precision highp float;

attribute vec2 a_position;
attribute float a_age;
attribute float a_energy;
attribute vec2 a_velocity;

uniform float u_time;
uniform float u_globalEnergy;
uniform vec2 u_resolution;
uniform mat3 u_transform;

varying float v_age;
varying float v_energy;
varying float v_alpha;

// Fonction de bruit simple
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // Position avec effet de flottement
    vec2 pos = a_position;
    
    // Mouvement brownien basé sur l'âge
    float lifetime = 3.0; // 3 secondes de vie
    float normalizedAge = a_age / lifetime;
    
    // Drift avec le temps
    vec2 drift = a_velocity * a_age;
    pos += drift;
    
    // Oscillation subtile
    float oscillation = sin(u_time * 2.0 + pos.x * 10.0) * 0.02;
    pos.y += oscillation * (1.0 - normalizedAge);
    
    // Attraction vers le centre si énergie globale élevée
    vec2 toCenter = -normalize(pos) * u_globalEnergy * 0.1;
    pos += toCenter * normalizedAge;
    
    // Taille de la particule basée sur l'énergie et l'âge
    float size = a_energy * (1.0 - normalizedAge * 0.7) * 8.0;
    
    // Alpha fade out
    v_alpha = (1.0 - normalizedAge) * a_energy;
    v_age = normalizedAge;
    v_energy = a_energy;
    
    // Transformation finale
    vec3 worldPos = u_transform * vec3(pos, 1.0);
    
    gl_Position = vec4(worldPos.xy, 0.0, 1.0);
    gl_PointSize = size;
}