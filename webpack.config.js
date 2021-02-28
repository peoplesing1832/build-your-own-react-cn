const { resolve } = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  target: 'web',

  mode: 'development',

  entry: resolve(__dirname, './index.jsx'),

  resolve: {
    extensions: ['.js', '.jsx'],

    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },

  devServer: {
    host: '127.0.0.1',
    port: '8060',
    hot: true
  },

  module: {
    rules: [
      {
        test: /.js|jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      filename: resolve(__dirname, './../dist/index.html'),
      template: resolve(__dirname, './../public/index.html')
    })
  ]
}
