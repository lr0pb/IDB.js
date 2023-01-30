import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

const isProd = process.env.PROD ? true : false;

export default isProd
? [{
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
  }]
: [{
    // build tests and open server
    input: 'test/mocha.test.js',
    output: {
      file: 'www/mocha.test.js',
      format: 'es'
    },
    plugins: [
      json(),
      nodeResolve(),
      commonjs(),
      typescript(),
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
  }];
