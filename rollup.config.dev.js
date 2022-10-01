import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

export default {
  input: 'src/IDB.ts',
  output: {
    file: 'www/IDB.js',
    format: 'es'
  },
  plugins: [
    typescript(),
    serve({
      contentBase: 'www', open: true,
      host: 'localhost', port: 3080
    }),
    livereload('www')
  ]
};
