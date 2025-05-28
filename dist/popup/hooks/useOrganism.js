"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebGL = exports.useOrganism = exports.OrganismContext = void 0;
// src/popup/hooks/useOrganism.ts
const react_1 = require("react");
exports.OrganismContext = (0, react_1.createContext)(null);
const useOrganism = () => {
    const context = (0, react_1.useContext)(exports.OrganismContext);
    if (!context) {
        throw new Error('useOrganism must be used within OrganismProvider');
    }
    return context;
};
exports.useOrganism = useOrganism;
// src/popup/hooks/useWebGL.ts
const react_2 = require("react");
const useWebGL = () => {
    const [isSupported, setIsSupported] = (0, react_2.useState)(null);
    const engineRef = (0, react_2.useRef)(null);
    (0, react_2.useEffect)(() => {
        // Vérifier le support WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        setIsSupported(!!gl);
    }, []);
    const initWebGL = async (canvas, organism) => {
        // Lazy load le moteur WebGL
        const { OrganismEngine } = await Promise.resolve().then(() => __importStar(require('../../generative/OrganismEngine')));
        engineRef.current = new OrganismEngine(canvas, organism.visualDNA);
        // Animation loop
        let animationId;
        let lastTime = 0;
        const animate = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            if (engineRef.current) {
                engineRef.current.render(deltaTime);
            }
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);
        // Cleanup function
        return () => {
            cancelAnimationFrame(animationId);
            if (engineRef.current) {
                engineRef.current.cleanup();
                engineRef.current = null;
            }
        };
    };
    return {
        isSupported,
        initWebGL,
        engine: engineRef.current
    };
};
exports.useWebGL = useWebGL;
