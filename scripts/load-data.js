// Loads concerts.js / seasonal.js / config.js (plain browser files) into Node.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
function loadData() {
  const ctx = vm.createContext({});
  const src = ['config.js', 'concerts.js', 'seasonal.js', 'sports.js']
    .filter(f => fs.existsSync(path.join(ROOT, f)))
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  vm.runInContext(src + '\n;globalThis.__d={CONCERTS,SEASONAL,LAST_UPDATED,CONFIG:typeof CONFIG!=="undefined"?CONFIG:{},TEAMS:typeof TEAMS!=="undefined"?TEAMS:[],GAMES:typeof GAMES!=="undefined"?GAMES:[]};', ctx);
  return ctx.__d;
}
module.exports = { loadData, ROOT };
