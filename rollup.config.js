import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
const fs = require('fs');

export default {
  input: 'src/IDB.ts',
  output: [{
    file: 'out/IDB.worker.js',
    format: 'iife',
    name: 'IDB'
  }, {
    file: 'out/IDB.module.js',
    format: 'es'
  }],
  plugins: [
    /*{
      name: 'readme-api-generator',
      buildStart: () => generateAPI()
    },*/
    typescript(),
    terser({ keep_classnames: true, compress: { ecma: 2019 } }),
  ]
};

function generateAPI() {
  let readme = fs.readFileSync('./README.md', 'utf8');
  const js = fs.readFileSync('./js/IDB.saved.js', 'utf8');
  readme = readme.replace(
    /(?<=# API\s)[\w\s(){}\[\]?:<>|\-,.'"`*#]+$/, `\n[tableOfContents]`
  );
  const fields = js.match(/(?<=@)[\w\s():;"'`|\-,?{}\[\]]+(?=\s\*)/g);
  const { n, e, t, f, p, r } = {
    n: 'name', e: 'example', t: 'typedef', f: 'function', p: 'param', r: 'return'
  };
  const tableOfContents = [];
  fields.map((field) => {
    const type = field.match(/^[\w]+/)[0];
    const firstWord = new RegExp(/^[\w]+\s/);
    let desc = type === e ? field.replace(firstWord, '') :
    type === p ? field.match(/(?<=}\s[\w?]+\s)[\w\s,-`]*/) : field.match(/(?<=\s)[\w\s,-]+$/);
    if (desc && typeof desc === 'object') desc = desc[0];
    const name = type === p ? new RegExp(/(?<=}\s)[\w]+/) : new RegExp(/(?<=\s)[\w]+/);
    return {
      type,
      value: type === e ? null : field.match(name)[0],
      optional: type === p ? field.includes('?') : null,
      dataType: [n, e, t, f].includes(type) ? null : (
        type === r ? field.replace(firstWord, '').replace(/\s$/, '') : field.match(/(?<={)[\w\[\]]+(?=})/)[0]
      ),
      args: [t, f].includes(type) ? field.match(/[(|{][\w\s{}|'?:,]*[)|}]/)[0] : null,
      description: type === n ? desc.replace(firstWord, '') : desc,
    };
  }).forEach((field, i, arr) => {
    const args = [readme, field, i, arr];
    if (field.type === n) {
      tableOfContents.push(field.value);
      readme = renderName(...args);
    }
    if (field.type === p) readme = renderParam(...args);
    if ([t, f].includes(field.type)) readme = renderDefinition(...args);
    if (field.type === e) readme = renderExample(...args);
  });
  let table = '';
  tableOfContents.forEach((item) => {
    const dontAddDB = item === 'constructor';
    if (dontAddDB) item = 'new IDB';
    const link = item.toLowerCase().replace(/\s/g, '-');
    table += `1. [\`${item}\`](#${dontAddDB ? '' : 'db'}${link})\n`;
  });
  readme = readme.replace('[tableOfContents]', table);
  fs.writeFileSync('./README.md', readme);
}

function renderName(readme, field, i, arr) {
  i++;
  const params = [];
  let returnType;
  while (arr[i].type !== 'name') {
    if (arr[i].type === 'param') params.push(arr[i]);
    if (arr[i].type === 'return') returnType = arr[i].dataType;
    i++;
    if (!arr[i]) break;
  }
  let args = '';
  for (let param of params) {
    args += `${param.value}${param.optional ? '?' : ''}: ${param.dataType}, `;
  }
  args = args.replace(/,\s$/, '');
  const isConstructor = field.value === 'constructor';
  const base = isConstructor ? 'new IDB' : `db.${field.value}`;
  readme += `## ${base}()\n`;
  readme += `${field.description}\n`;
  readme += `\`\`\`${isConstructor ? 'js' : 'ts'}\n`;
  readme += `${isConstructor ? '' : 'await '}${base}(${args}): ${returnType}`;
  readme += '\n```\n';
  return readme;
}

function renderParam(readme, field) {
  readme += `- \`${field.value}\` - ${field.description}\n`;
  return readme;
}

function renderDefinition(readme, field) {
  const isF = field.type === 'function';
  readme += `- **${field.value}**${field.description ? ` - ${field.description}` : ''}\n`;
  readme += '```ts\n';
  readme += `${isF ? 'function' : 'interface'} ${field.value}${isF ? '' : ' '}${field.args}`;
  readme += '\n```\n';
  return readme;
}

function renderExample(readme, field) {
  readme += `> **For example:** ${field.description}\n\n`;
  return readme;
}
