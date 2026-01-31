// Configuration Webpack pour les Web Workers
// Compilation séparée des workers pour optimiser les performances

const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'neural-worker': './src/workers/NeuralWorker.ts',
    'resonance-worker': './src/workers/ResonanceWorker.ts'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    globalObject: 'self', // Important pour les workers
    library: {
      type: 'self'
    }
  },

  target: 'webworker', // Target spécifique aux workers

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.worker.json', // Config TS spécifique workers
            transpileOnly: true
          }
        }],
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    }
  },

  optimization: {
    minimize: true,
    splitChunks: false, // Pas de split chunks pour les workers
  },

  // Performance optimizations pour workers
  performance: {
    maxAssetSize: 1024 * 1024, // 1MB max pour un worker
    maxEntrypointSize: 1024 * 1024,
  },

  devtool: 'source-map',

  // Exclude Node.js specific modules
  externals: {
    'fs': 'empty',
    'path': 'empty',
    'crypto': 'empty'
  }
}; 