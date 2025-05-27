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
    const { messageBus } = (0, useMessaging_1.useMessaging)();
    const [error, setError] = (0, react_1.useState)(null);
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!canvasRef.current || !organism)
            return;
        // Créer l'adaptateur WebGL
        adapterRef.current = new WebGLMessageAdapter_1.WebGLMessageAdapter(messageBus);
        // Initialiser le moteur
        messageBus.send({
            type: MessageBus_1.MessageType.WEBGL_INIT,
            payload: {
                canvas: canvasRef.current,
                dna: organism.visualDNA
            }
        });
        // Écouter les événements
        const unsubscribeError = messageBus.on(MessageBus_1.MessageType.WEBGL_ERROR, (msg) => {
            setError(msg.payload.error);
        });
        const unsubscribeMetrics = messageBus.on(MessageBus_1.MessageType.PERFORMANCE_UPDATE, (msg) => {
            setMetrics(msg.payload);
        });
        return () => {
            unsubscribeError();
            unsubscribeMetrics();
            if (adapterRef.current) {
                adapterRef.current.destroy();
            }
        };
    }, [organism, messageBus]);
    if (error) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold", children: "WebGL Error" }), (0, jsx_runtime_1.jsx)("p", { children: error })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative w-full h-96 bg-black rounded-lg overflow-hidden", children: [(0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, className: "w-full h-full", width: 800, height: 600 }), metrics && ((0, jsx_runtime_1.jsxs)("div", { className: "absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { children: ["FPS: ", metrics.fps] }), (0, jsx_runtime_1.jsxs)("div", { children: ["GPU: ", (metrics.gpuLoad * 100).toFixed(1), "%"] })] }))] }));
};
exports.OrganismViewer = OrganismViewer;
