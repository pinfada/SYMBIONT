"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
require("@testing-library/jest-dom");
const react_1 = require("@testing-library/react");
const PluginManager_1 = require("../../core/PluginManager");
const GlobalNetworkGraph_1 = require("./GlobalNetworkGraph");
describe('GlobalNetworkGraph (plugins)', () => {
    it('affiche les visualisations plugins', () => {
        PluginManager_1.PluginManager.register({ id: 'viz-test', type: 'visualization', name: 'Test Viz', component: () => (0, jsx_runtime_1.jsx)("div", { children: "Test Viz" }) });
        const { getByText } = (0, react_1.render)((0, jsx_runtime_1.jsx)(GlobalNetworkGraph_1.GlobalNetworkGraph, {}));
        expect(getByText('Visualisations disponibles :')).toBeInTheDocument();
        expect(getByText('Test Viz')).toBeInTheDocument();
    });
});
