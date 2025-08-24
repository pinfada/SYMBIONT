// shaders/energy-particles.frag
precision highp float;

varying float v_age;
varying float v_energy;
varying float v_alpha;

uniform float u_time;
uniform vec3 u_energyColor;
uniform vec3 u_coreColor;

void main() {
    // Coordonnées du point (centre = 0.5, 0.5)
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Forme circulaire douce
    float circle = smoothstep(0.5, 0.3, dist);
    
    // Effet de halo
    float halo = smoothstep(0.5, 0.0, dist);
    
    // Pulsation basée sur l'énergie
    float pulse = sin(u_time * 4.0 + v_energy * 10.0) * 0.3 + 0.7;
    
    // Couleur basée sur l'âge et l'énergie
    vec3 color = mix(u_coreColor, u_energyColor, v_age);
    color *= pulse;
    
    // Effet de scintillement
    float twinkle = fract(sin(v_energy * 123.456) * 43758.5453);
    twinkle = step(0.97, twinkle) * 2.0;
    color += vec3(twinkle * 0.5);
    
    // Alpha final
    float alpha = circle * v_alpha * (0.8 + halo * 0.2);
    
    gl_FragColor = vec4(color, alpha);
}