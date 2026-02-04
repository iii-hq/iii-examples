import('@iii-dev/sdk').then(m => {
  const seen = new Set();
  const print = (obj, prefix = '') => {
    if (!obj || seen.has(obj)) return;
    seen.add(obj);
    const keys = Object.getOwnPropertyNames(obj).sort();
    for (const k of keys) {
      if (k === 'constructor' || k.startsWith('_')) continue;
      try {
        const val = obj[k];
        const type = typeof val;
        const kind = type === 'function' ? (val.prototype ? 'class/fn' : 'fn') : type;
        console.log(prefix + k + ' (' + kind + ')');
        if (val && type === 'object' && !Array.isArray(val)) {
          print(val, prefix + '  ');
        }
        if (type === 'function' && val.prototype && Object.getOwnPropertyNames(val.prototype).length > 1) {
          print(val.prototype, prefix + '  .');
        }
      } catch {}
    }
  };
  print(m);
});
