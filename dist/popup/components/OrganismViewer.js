"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismViewer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/OrganismViewer.tsx
const react_1 = require("react");
const useMessaging_1 = require("../hooks/useMessaging");
const useOrganism_1 = require("../hooks/useOrganism");
const WebGLMessageAdapter_1 = require("../../integration/WebGLMessageAdapter");
const MessageBus_1 = require("@shared/messaging/MessageBus");
const OrganismViewer = () => {
    const canvasRef = (0, react_1.useRef)(null);
    const adapterRef = (0, react_1.useRef)(null);
    const { organism } = (0, useOrganism_1.useOrganism)();
    const messaging = (0, useMessaging_1.useMessaging)();
    const [error, setError] = (0, react_1.useState)(null);
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!canvasRef.current || !organism)
            return;
        // Mock complet d'OrganismEngine pour satisfaire le typage
        const engine = {
            render: () => { },
            mutate: () => { },
            getPerformanceMetrics: async () => ({}),
            canvas: canvasRef.current,
            gl: null,
            program: null,
            dnaInterpreter: {},
            mutationEngine: {},
            generator: {},
            performanceMonitor: {},
            setupGL: () => { },
            setupShaders: () => { },
            setupBuffers: () => { },
            setupAttributes: () => { },
            setupUniforms: () => { },
            cleanup: () => { },
            isInitialized: () => true,
            createGLTexture: () => null,
            vertexBuffer: null,
            indexBuffer: null,
            frameCount: 0,
            elapsedTime: 0,
            geometry: {},
            traits: {},
            visualProperties: {},
            currentState: {},
            lastGeometryComplexity: 0,
            fractalTexture: null
        };
        adapterRef.current = new WebGLMessageAdapter_1.WebGLMessageAdapter(engine, {
            on: () => { },
            off: () => { },
            send: () => { },
        });
        // Initialiser le moteur
        messaging.send(MessageBus_1.MessageType.WEBGL_INIT, {
            canvas: canvasRef.current,
            dna: organism.visualDNA
        });
        // Écouter les événements
        messaging.subscribe(MessageBus_1.MessageType.WEBGL_ERROR, (msg) => {
            setError(msg.payload.error);
        });
        messaging.subscribe(MessageBus_1.MessageType.PERFORMANCE_UPDATE, (msg) => {
            setMetrics(msg.payload);
        });
    }, [organism, messaging]);
    if (error) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold", children: "WebGL Error" }), (0, jsx_runtime_1.jsx)("p", { children: error })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative w-full h-96 bg-black rounded-lg overflow-hidden", children: [(0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, className: "w-full h-full", width: 800, height: 600 }), metrics && ((0, jsx_runtime_1.jsxs)("div", { className: "absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { children: ["FPS: ", metrics.fps] }), (0, jsx_runtime_1.jsxs)("div", { children: ["GPU: ", (metrics.gpuLoad * 100).toFixed(1), "%"] })] }))] }));
};
exports.OrganismViewer = OrganismViewer;
