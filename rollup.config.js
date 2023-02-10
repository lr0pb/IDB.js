import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import dts from 'rollup-plugin-dts';

import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const isDev = process.env.DEV ? true : false;
const isServe = process.env.SERVE ? true : false;

const base = {
  input: 'lib/IDB.js',
  output: [{
    file: 'dist/index.js',
    format: 'es'
  }],
  plugins: []
};

const lib = isServe
? {} : isDev
? Object.assign(base, {
    output: {
      file: 'www/IDB.js',
      format: 'es'
    }
  })
: Object.assign(base, {
    plugins: [
      terser({ keep_classnames: true, compress: { ecma: 2019 } }),
    ]
  });

const react = isServe ? {} : {
  input: 'lib/IDBProvider.js',
  output: {
    file: isDev ? 'www/react.js' : 'dist/react.js',
    format: 'es'
  },
  external: 'react',
  plugins: [
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**/*',
      presets: ["@babel/preset-react"],
    }),
    !isDev && terser({ compress: { ecma: 2019 } }),
  ]
}

const types = isDev || isServe ? {} : {
  input: 'lib/types/IDB.d.ts',
  output: [{
    file: 'dist/index.d.ts',
    format: 'es'
  }],
  plugins: [dts()]
};

const reactTypes = isDev || isServe ? {} : {
  input: 'lib/types/IDBProvider.d.ts',
  output: [{
    file: 'dist/react.d.ts',
    format: 'es'
  }],
  external: 'react',
  plugins: [dts()]
}

const tests = isDev ? {
  input: 'test/mocha.test.js',
  output: {
    file: 'www/mocha.test.js',
    format: 'es'
  },
  plugins: [
    json(),
    nodeResolve(),
    commonjs(),
  ]
} : {};

const server = isDev || isServe
? Object.assign(base, {
    plugins: [
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
  })
: {};

export default [
  lib,
  types,
  react,
  reactTypes,
  tests,
  server,
].filter((item) => Object.keys(item).length);
