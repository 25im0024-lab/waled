/* Build: node oilfield/build.js            -> oilfield/index.html (full PWA document)
          node oilfield/build.js --fragment out.html  -> fragment (for the claude.ai artifact) */
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const core = src('core.js').replace(/\nif \(typeof module[\s\S]*$/, '\n');
const script = core + '\n' + ['data.js', 'ui.js', 'hf.js', 'hf2.js', 'hf3.js', 'mapiso.js', 'init.js'].map(src).join('\n');
const head = src('head.html');
const i = process.argv.indexOf('--fragment');
if (i > -1) {
  fs.writeFileSync(process.argv[i + 1], head + '\n<div id="app"></div>\n<script>\n' + script + '\n</script>\n');
  console.log('fragment written');
} else {
  const doc = `<!doctype html>
<html lang="ar">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a5c6e">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="رحلة البرميل">
<meta name="description" content="أداة تفاعلية تشرح مسار النفط من قاع البئر إلى التصدير، مع تبويب للتكسير الهيدروليكي وحاسبات هندسية.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<style>:root{color-scheme:light;padding-block:env(safe-area-inset-top,0px) env(safe-area-inset-bottom,0px)}html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
<div id="app"></div>
<script>
${script}
</script>
<script>
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, 'index.html'), doc);
  console.log('index.html written,', doc.length, 'bytes');
}
