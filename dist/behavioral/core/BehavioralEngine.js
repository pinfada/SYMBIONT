"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralEngine = void 0;
// Moteur d'analyse comportementale
const PatternAnalyzer_1 = require("./PatternAnalyzer");
const BehaviorPredictor_1 = require("./BehaviorPredictor");
const SessionTracker_1 = require("../analyzers/SessionTracker");
const SymbiontStorage_1 = require("../../core/storage/SymbiontStorage");
class BehavioralEngine {
    constructor() {
        this.patterns = new Map();
        this.analyzer = new PatternAnalyzer_1.PatternAnalyzer();
        this.predictor = new BehaviorPredictor_1.BehaviorPredictor();
        this.sessionTracker = new SessionTracker_1.SessionTracker();
        this.storage = SymbiontStorage_1.SymbiontStorage.getInstance();
        this.initialize();
    }
    static getInstance() {
        if (!BehavioralEngine.instance) {
            BehavioralEngine.instance = new BehavioralEngine();
        }
        return BehavioralEngine.instance;
    }
    async analyzeBehavior(event) {
        // Code d'analyse comportementale...
    }
}
exports.BehavioralEngine = BehavioralEngine;
