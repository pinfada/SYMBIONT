// shaders/organism.frag
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

// GLSL 1.0 compatible
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // Pattern organique
    float pattern = v_pattern * u_patternDensity;
    pattern += sin(length(v_position.xy) * 10.0 + u_time) * 0.1;
    
    // Coordonnées pour la texture fractale (centrées et normalisées)
    vec2 texCoord = v_position.xy * 0.5 + 0.5;
    float fractal = texture2D(u_fractalTex, texCoord).r;
    
    // Mutation color shift
    vec3 color = mix(u_primaryColor, u_secondaryColor, pattern);
    
    // Variance chromatique
    float hue = atan(color.g, color.r) / (2.0 * 3.14159) + 0.5;
    hue += sin(u_time * 0.1) * u_colorVariance * 0.1;
    
    vec3 hsv = vec3(hue, 0.8, 0.9);
    color = hsv2rgb(hsv);
    
    // Modulation par la texture fractale
    color = mix(color, color * fractal, 0.5);
    
    // Effet de mutation
    color = mix(color, vec3(1.0) - color, u_mutation * 0.3);
    
    // Effet de halo pulsant selon l'énergie (u_fluidity)
    float dist = length(v_position.xy);
    float halo = smoothstep(0.6, 0.9, dist) * (0.4 + 0.6 * abs(sin(u_time * u_fluidity)));
    color = mix(color, vec3(0.8, 1.0, 1.0), halo);
    
    // Anti-aliasing simple
    float alpha = smoothstep(0.0, 0.01, pattern);
    alpha = max(alpha, halo * 0.5);

    gl_FragColor = vec4(color, alpha * 0.95);
}