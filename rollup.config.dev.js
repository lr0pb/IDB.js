import serve from 'rollup-plugin-serve'

export default {
  input: 'IDB.js',
  output: {
    file: 'www/IDB.js',
    format: 'es'
  },
  plugins: [
    serve({
      contentBase: 'www', open: true,
      host: 'localhost', port: 3080
    })
  ]
};
