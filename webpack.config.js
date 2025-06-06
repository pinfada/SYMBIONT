const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

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
        test: /popup\/index\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /(?<!popup\/index)\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(vert|frag|glsl)$/,
        type: 'asset/source'
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      },
      {
        test: /\.(woff2?|ttf|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name]/index.css'
    }),
    new HtmlPlugin({
      template: './src/popup/popup-sub.html',
      filename: 'popup/index.html',
      chunks: [],
      inject: false
    }),
    new HtmlPlugin({
      template: './src/popup/popup-root.html',
      filename: 'popup.html',
      chunks: [],
      inject: false
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json', noErrorOnMissing: true },
        // { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
      ]
    })
  ]
}