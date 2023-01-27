import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';

const isProd = process.env.PROD ? true : false;

export default [{
  // build package itself
  input: 'src/IDB.ts',
  output: [{
    file: 'dist/IDB.js',
    format: 'es'
  }],
  plugins: [
    typescript(),
    terser({ keep_classnames: true, compress: { ecma: 2019 } }),
  ]
}, {
  // build declaration file
  input: 'dist/IDB.d.ts',
  output: [{
    file: 'dist/index.d.ts',
    format: 'es'
  }],
  plugins: [dts()]
}];
