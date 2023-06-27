import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

/**
 *
 * @param {string} inText
 * @param {string} outText
 * @param {string[]} files
 */
async function replace(inText, outText, files) {
  for (const file of files) {
    const address = path.join(process.cwd(), file);
    const data = await fs.readFile(address, 'utf8');
    const output = data.replaceAll(inText, outText);
    await fs.writeFile(address, output);
  }
}

await replace('../IDB', './index', ['react.js', 'react.d.ts']);
await replace('a();', '"use client";', ['react.js']);
