import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

const isProd = process.env.DEV ? false : true;

const base = {
  input: 'lib/IDB.js',
  output: [{
    file: 'dist/index.js',
    format: 'es'
  }],
  plugins: [
    terser({ keep_classnames: true, compress: { ecma: 2019 } }),
  ]
};

const dev = isProd ? {} : Object.assign(base, {
  output: {
    file: 'www/IDB.js',
    format: 'es'
  },
  plugins: []
});

const types = {
  input: 'lib/types/IDB.d.ts',
  output: [{
    file: 'dist/index.d.ts',
    format: 'es'
  }],
  plugins: [dts()]
};

const tests = isProd ? {} : {
  input: 'test/mocha.test.js',
  output: {
    file: 'www/mocha.test.js',
    format: 'es'
  },
  plugins: [
    json(),
    nodeResolve(),
    commonjs(),
    copy({
      targets: [
        {src: 'test/index.html', dest: 'www'},
        {src: 'node_modules/mocha/mocha.css', dest: 'www'}
      ]
    }),
    serve({
      contentBase: 'www', open: true,
      host: 'localhost', port: 3080
    }),
    livereload('www')
  ]
};

export default isProd
? [base, types]
: [dev, tests];
