// Builds a single self-contained page from src/ (CSS + JS inlined) so it opens anywhere,
// including file viewers that do not load sibling files.
//   node drillers-console/build.js            -> drillers-console/index.html
//   node drillers-console/build.js --fragment <out.html>  -> same page without <html>/<head>/<body> wrapper
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
let html = src('page.html')
  .replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + src('style.css') + '</style>')
  .replace('<script src="i18n.js"></script>', () => '<script>\n' + src('i18n.js') + '</script>')
  .replace('<script src="sim.js"></script>', () => '<script>\n' + src('sim.js') + '</script>')
  .replace('<script src="ui.js"></script>', () => '<script>\n' + src('ui.js') + '</script>');
if (/(href|src)="(style\.css|i18n\.js|sim\.js|ui\.js)"/.test(html)) throw new Error('unresolved asset reference');
const i = process.argv.indexOf('--fragment');
if (i > 0) {
  const frag = html.replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/?head>\s*/gi, '')
    .replace(/<meta (charset|name="viewport")[^>]*>\s*/gi, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*<\/html>\s*$/i, '');
  fs.writeFileSync(process.argv[i + 1], frag);
  console.log('fragment ->', process.argv[i + 1], (frag.length / 1024).toFixed(0) + ' KB');
} else {
  fs.writeFileSync(path.join(__dirname, 'index.html'), html);
  console.log('index.html', (html.length / 1024).toFixed(0) + ' KB');
}
