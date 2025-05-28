import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { PluginManager, Plugin } from '../../core/PluginManager';
import { GlobalNetworkGraph } from './GlobalNetworkGraph';

describe('GlobalNetworkGraph (plugins)', () => {
  it('affiche les visualisations plugins', () => {
    PluginManager.register({ id: 'viz-test', type: 'visualization', name: 'Test Viz', component: () => <div>Test Viz</div> });
    const { getByText } = render(<GlobalNetworkGraph />);
    expect(getByText('Visualisations disponibles :')).toBeInTheDocument();
    expect(getByText('Test Viz')).toBeInTheDocument();
  });
}); 