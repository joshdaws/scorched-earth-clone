const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'physics-enhanced': './js/physics-enhanced.js',
    'renderer-pixi': './js/renderer-pixi.js',
    'ui-animations': './js/ui-animations.js',
    'game-enhanced': './js/game-enhanced.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'js/bundles'),
    library: '[name]',
    libraryTarget: 'window'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true
  }
};