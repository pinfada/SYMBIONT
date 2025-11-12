const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/content/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/content'),
    filename: 'index.js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core')
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
  }
};