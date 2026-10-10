// Builds the self-contained UHS Pore Lab page from web/src/ (CSS + JS inlined).
//   node uhs-md/web/build.js  -> uhs-md/index.html
const fs = require('fs'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const html = rd('page.html')
  .replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + rd('style.css') + '</style>')
  .replace('<script src="sim.js"></script>', () => '<script>\n' + rd('sim.js') + '</script>')
  .replace('<script src="render3d.js"></script>', () => '<script>\n' + rd('render3d.js') + '</script>')
  .replace('<script src="ui.js"></script>', () => '<script>\n' + rd('ui.js') + '</script>');
if (/(href|src)="(style\.css|sim\.js|render3d\.js|ui\.js)"/.test(html)) throw new Error('unresolved asset reference');
fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html);
console.log('uhs-md/index.html', (html.length / 1024).toFixed(0) + ' KB');
