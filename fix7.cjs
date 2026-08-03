const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(
  `date: new Date().toISOString(),`,
  ``
);
fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Listo');
