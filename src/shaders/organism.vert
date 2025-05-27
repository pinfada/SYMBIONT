// shaders/organism.vert
#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
in float a_instanceId;

uniform mat3 u_transform;
uniform float u_time;
uniform float u_complexity;
uniform float u_symmetry;

out vec2 v_texCoord;
out float v_pattern;
out vec3 v_position;

// Noise function optimisée
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    v_texCoord = a_texCoord;
    
    // Transformation basée sur l'instance
    float angle = a_instanceId * 3.14159 * 2.0 / 8.0;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    vec2 pos = a_position;
    
    // Déformation organique
    float wave = sin(u_time + a_instanceId) * 0.1 * u_fluidity;
    pos += vec2(cos(u_time * 0.5 + a_instanceId), sin(u_time * 0.7)) * wave;
    
    // Application symétrie
    if (u_symmetry > 0.5) {
        pos = rotation * pos;
    }
    
    // Complexité fractale
    float fractal = 0.0;
    vec2 p = pos * 2.0;
    for (int i = 0; i < 5; i++) {
        fractal += noise(p) / pow(2.0, float(i + 1));
        p *= 2.0 + u_complexity;
    }
    
    v_pattern = fractal;
    v_position = vec3(pos, 0.0);
    
    gl_Position = vec4(pos, 0.0, 1.0);
}