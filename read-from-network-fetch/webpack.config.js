var fs = require('fs');
var path = require('path');
var webpack = require('webpack');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: ['babel-polyfill', './src/app/background.js']
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: "/build/",
    filename: '[name].js',
    chunkFilename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /.js$/,
        include: path.resolve(__dirname, 'src', 'app'),
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          presets: [['es2015', { 'modules': false }], 'stage-0']
        }
      },
      // {
      //   test: /\.less$|\.css$/,
      //   include: path.resolve(__dirname, 'src'),
      //   loader: multi(
      //     'style-loader!css-loader?url=false!less-loader',
      //     'less-vars-loader?camelCase&resolveVariables'
      //   )
      // },
      // {
      //   test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
      //   loader: 'url-loader?limit=10000&mimetype=image/svg+xml'
      // },
      // {
      //   test: /\.(jpe?g|png|gif)$/i,
      //   loader: 'url-loader?limit=10000!img-loader'
      // }
    ]
  },
  devtool: 'inline-source-map',
  plugins: [
    new CleanWebpackPlugin(['build'], {
      verbose: true,
      dry: false,
    }),
    new CopyWebpackPlugin([
      {
        from: 'src/static',
        to: ''
      }
    ])
  ]
};