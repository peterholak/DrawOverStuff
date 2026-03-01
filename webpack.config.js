const path = require('path')
// const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require("html-webpack-plugin")

const isDevelopment = process.env.NODE_ENV !== 'production'

const config = {
    mode: 'development',
    entry: {
        'app': './src/index.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: isDevelopment ? '/' : '',
        clean: true
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        historyApiFallback: true,
        hot: true,
        open: true,
        port: 3000,
        devMiddleware: {
            publicPath: '/'
        }
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        modules: [path.resolve(__dirname, "src"), "node_modules"]
    },
    module: {
        rules: [
            { test: /\.tsx?$/, use: 'ts-loader' }
        ]
    },
    plugins: [
        // new CopyWebpackPlugin({
        //     patterns: [
        //         {from: 'src/index.html', to: '.'}
        //     ]
        // }),
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            scriptLoading: 'defer'
        })
    ],
    devtool: 'source-map',
    optimization: {
        splitChunks: isDevelopment ? {
            chunks: 'all'
        } : false
    },
    // Suppress some harmless warnings for a 3rd party library (the code already handles the missing modules properly).
    stats: {
        warningsFilter: ["source-map-support.js"]
    }
}

module.exports = config
