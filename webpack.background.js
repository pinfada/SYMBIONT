const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { manifestCopyPattern } = require('./scripts/build-manifest');

// `env` vient de `--env browser=firefox` ; défaut = chrome.
module.exports = (env) => ({
  mode: process.env.NODE_ENV || 'production',
  entry: './src/background/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'background/index.js',
    clean: false
  },
  target: 'webworker',
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@popup': path.resolve(__dirname, 'src/popup'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@types': path.resolve(__dirname, 'src/types')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        manifestCopyPattern(env),
        { from: 'public/assets', to: 'assets', noErrorOnMissing: true }
      ]
    })
  ]
});
