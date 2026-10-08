// Builds the self-contained FPSO Console page from src/ (CSS + JS inlined).
//   node fpso/build.js  -> fpso/index.html
const fs = require('fs'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = rd('src/page.html')
  .replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + rd('src/style.css') + '</style>')
  .replace('<script src="../../drillers-console/src/i18n.js"></script>', () => '<script>\n' + rd('../drillers-console/src/i18n.js') + '</script>')
  .replace('<script src="i18n-ar.js"></script>', () => '<script>\n' + rd('src/i18n-ar.js') + '</script>')
  .replace('<script src="info.js"></script>', () => '<script>\n' + rd('src/info.js') + '</script>')
  .replace('<script src="sim.js"></script>', () => '<script>\n' + rd('src/sim.js') + '</script>')
  .replace('<script src="ui.js"></script>', () => '<script>\n' + rd('src/ui.js') + '</script>');
if (/(href|src)="(style\.css|[./]*drillers-console\/src\/i18n\.js|i18n-ar\.js|info\.js|sim\.js|ui\.js)"/.test(html)) throw new Error('unresolved asset reference');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('fpso/index.html', (html.length / 1024).toFixed(0) + ' KB');
