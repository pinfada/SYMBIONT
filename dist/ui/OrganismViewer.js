"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismViewer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const OrganismEngine_1 = require("../generative/OrganismEngine");
const OrganismViewer = ({ dna, traits, width = 320, height = 320, onMetrics }) => {
    const canvasRef = (0, react_1.useRef)(null);
    const engineRef = (0, react_1.useRef)(null);
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    // Initialisation et cleanup du moteur WebGL
    (0, react_1.useEffect)(() => {
        if (!canvasRef.current)
            return;
        engineRef.current = new OrganismEngine_1.OrganismEngine(canvasRef.current, dna);
        let running = true;
        // Boucle de rendu
        const renderLoop = () => {
            if (!running || !engineRef.current)
                return;
            engineRef.current.render();
            const m = engineRef.current.getPerformanceMetrics();
            setMetrics(m);
            if (onMetrics)
                onMetrics(m);
            requestAnimationFrame(renderLoop);
        };
        renderLoop();
        return () => {
            running = false;
            engineRef.current?.cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dna]);
    // Mise à jour des traits si modifiés
    (0, react_1.useEffect)(() => {
        if (engineRef.current && traits) {
            // engineRef.current.setTraits(traits); // À activer si API disponible
        }
    }, [traits]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-block', position: 'relative' }, children: [(0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, width: width, height: height, style: { border: '1px solid #222', background: '#111', borderRadius: 8 } }), metrics && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    left: 8,
                    top: 8,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 4
                }, children: [(0, jsx_runtime_1.jsxs)("div", { children: ["FPS : ", metrics.fps] }), (0, jsx_runtime_1.jsxs)("div", { children: ["GPU : ", (metrics.gpuLoad * 100).toFixed(0), "%"] }), (0, jsx_runtime_1.jsxs)("div", { children: ["RAM : ", metrics.memoryUsage.toFixed(1), " Mo"] })] }))] }));
};
exports.OrganismViewer = OrganismViewer;
