import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { GlobalNetworkGraph } from './GlobalNetworkGraph';
// @ts-expect-error Import réservé pour usage futur
import { PluginManager, Plugin } from '../../core/PluginManager';

describe('GlobalNetworkGraph (plugins)', () => {
  it('affiche les visualisations plugins', () => {
    PluginManager.register({ id: 'viz-test', type: 'visualization', name: 'Test Viz', component: () => <div>Test Viz</div> });
    const { getByText } = render(<GlobalNetworkGraph />);
    expect(getByText('Visualisations disponibles :')).toBeInTheDocument();
    expect(getByText('Test Viz')).toBeInTheDocument();
  });
}); 