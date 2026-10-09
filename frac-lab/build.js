// Builds the self-contained Frac-Fluid Lab page from src/ (CSS + JS inlined).
//   node frac-lab/build.js  -> frac-lab/index.html
const fs = require('fs'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = rd('src/page.html')
  .replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + rd('src/style.css') + '</style>')
  .replace('<script src="core.js"></script>', () => '<script>\n' + rd('src/core.js') + '</script>')
  .replace('<script src="protocols.js"></script>', () => '<script>\n' + rd('src/protocols.js') + '</script>')
  .replace('<script src="ui.js"></script>', () => '<script>\n' + rd('src/ui.js') + '</script>');
if (/(href|src)="(style\.css|core\.js|protocols\.js|ui\.js)"/.test(html)) throw new Error('unresolved asset reference');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('frac-lab/index.html', (html.length / 1024).toFixed(0) + ' KB');
