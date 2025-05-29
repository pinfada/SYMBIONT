const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { merge } = require('webpack-merge');

module.exports = {
  mode: process.env.NODE_ENV || 'production',
  entry: {
    content: './src/content/index.ts',
    popup: './src/popup/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]/index.js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@popup': path.resolve(__dirname, 'src/popup'),
      '@generative': path.resolve(__dirname, 'src/generative'),
      '@behavioral': path.resolve(__dirname, 'src/behavioral'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@shaders': path.resolve(__dirname, 'src/shaders'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(vert|frag|glsl)$/,
        type: 'asset/source'
      }
    ]
  },
  plugins: [
    new HtmlPlugin({
      template: './src/popup/index.html',
      filename: 'popup/index.html',
      chunks: ['popup']
    }),
    new HtmlPlugin({
      template: './src/popup/index.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/popup/styles/popup.css', to: 'popup/styles/popup.css' }
      ]
    })
  ]
}