import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import typescript from '@rollup/plugin-typescript';

import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const isDev = process.env.DEV ? true : false;
const isServe = process.env.SERVE ? true : false;

const terserArgs = {
  keep_classnames: true,
  compress: { ecma: 2019 }
};
const external = [
  'react', '../IDB.js'
];

const base = {
  input: 'lib/IDB.js',
  output: [{
    file: 'index.js',
    format: 'es'
  }],
  plugins: []
};

let lib = {};
if (!isServe && isDev) {
  lib = {
    input: 'src/IDB.ts',
    output: {
      file: 'www/IDB.js',
      format: 'es'
    },
    plugins: [typescript()]
  };
} else if (!isServe) {
  lib = Object.assign(base, {
    plugins: [
      terser(terserArgs),
    ]
  });
}

const react = isServe ? {} : {
  input: 'lib/react/index.js',
  output: {
    file: isDev ? 'www/react.js' : 'react.js',
    format: 'es'
  },
  external,
  plugins: [
    !isDev && terser(terserArgs),
  ]
}

const types = isDev || isServe ? {} : {
  input: 'lib/types/IDB.d.ts',
  output: [{
    file: 'index.d.ts',
    format: 'es'
  }],
  plugins: [dts()]
};

const typesReact = isDev || isServe ? {} : {
  input: 'lib/types/react/index.d.ts',
  output: [{
    file: 'react.d.ts',
    format: 'es'
  }],
  external,
  plugins: [dts()]
};

const tests = isDev ? {
  input: 'test/__index__.test.js',
  output: {
    file: 'www/__index__.test.js',
    format: 'es'
  },
  plugins: [
    json(),
    nodeResolve(),
    commonjs(),
  ]
} : {};

if (isDev || isServe) {
  lib.plugins.push(...[
    copy({
      targets: [
        { src: 'test/__index__.html', dest: 'www', rename: 'index.html' },
        { src: 'node_modules/mocha/mocha.css', dest: 'www' }
      ]
    }),
    serve({
      contentBase: 'www', open: true,
      host: 'localhost', port: 3080
    }),
    livereload('www')
  ]);
}

export default [
  lib,
  react,
  types,
  typesReact,
  tests,
].filter((item) => Object.keys(item).length);
