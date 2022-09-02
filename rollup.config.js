import { terser } from 'rollup-plugin-terser'
const fs = require('fs');

const prod = process.env.PRODUCTION;
console.log(prod);

export default {
  input: 'IDB.js',
  output: [{
    file: 'out/IDB.worker.js',
    format: 'iife',
    name: 'IDB'
  }, {
    file: 'out/IDB.module.js',
    format: 'es'
  }],
  plugins: [
    {
      name: 'readme-api-generator',
      buildStart: () => generateAPI()
    },
    terser({ keep_classnames: true, compress: { ecma: 2019 } }),
  ]
};

function generateAPI() {
  let readme = fs.readFileSync('./README.md', 'utf8');
  const js = fs.readFileSync('./IDB.js', 'utf8');
  readme = readme.replace(/(?<=# API\s)[\w\s(){}\[\]?:>\-,.`*#]+$/, `\n`);
  const fields = js.match(/(?<=@)[\w\s():;"'\-,?{}\[\]]+(?=\s\*)/g);
  const { n, e, t, f, p } = { n: 'name', e: 'example', t: 'typedef', f: 'function', p: 'param' };
  fields.map((field) => {
    const type = field.match(/^[\w]+/)[0];
    let desc = type === e ? field.replace(/^[\w]+\s/, '') : field.match(/(?<=\s)[\w\s,-]+$/);
    if (desc) desc = desc[0];
    return {
      type,
      value: type === e ? null : field.match(/(?<=\s)[\w]+/)[0],
      optional: [n, e, t, f].includes(type) ? null : field.includes('?:'),
      dataType: [n, e, t, f].includes(type) ? null : field.match(/(?<=\:\s)[\w\[\]]+/)[0],
      args: [t, f].includes(type) ? field.match(/[(|{][\w\s{}?:,]+[)|}]/)[0] : null,
      description: [n, p].includes(type) ? desc.replace(/^[\w]+\s/, '') : desc,
    };
  }).forEach((field, i, arr) => {
    const args = [readme, field, i, arr];
    if (field.type === n) readme = renderName(...args);
    if (field.type === p) readme = renderParam(...args);
    if ([t, f].includes(field.type)) readme = renderDefinition(...args);
  });
  fs.writeFileSync('./README.md', readme);
}

function renderName(readme, field, i, arr) {
  i++;
  const params = [];
  while (arr[i].type !== 'name') {
    if (arr[i].type === 'param') params.push(arr[i]);
    i++;
    if (!arr[i]) break;
  }
  let args = '';
  for (let param of params) {
    args += `${param.value}${param.optional ? '?' : ''}: ${param.dataType}, `;
  }
  args = args.replace(/,\s$/, '');
  readme += `## ${field.value === 'constructor' ? 'new IDB' : `db.${field.value}`}(${args})\n`;
  readme += `${field.description}\n`;
  return readme;
}

function renderParam(readme, field) {
  readme += `- **${field.value}** - ${field.description}\n`;
  return readme;
}

function renderDefinition(readme, field) {
  const isF = field.type === 'function';
  readme += `- **${field.value}**${field.description ? ` - ${field.description}` : ''}\n`;
  readme += '```ts\n';
  readme += `${isF ? 'function' : 'interface'} ${field.value}${isF ? '' : ' '}${field.args}${isF ? ' {}' : ''}`;
  readme += '\n```\n';
  return readme;
}
