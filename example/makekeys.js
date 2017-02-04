#!/usr/bin/env node
const keys = require('./keys-node.js');
const fs = require('fs');

// run tsvg with -g exports   to get it to export keys.js in node/require-comaptible manner!

for (var i = -10; i <= 10; i++) {
  var oneSVG = keys.TSVG.Templates['example/keys']({keyIndex: i}).render();
  var fname = 'key-' + (i < 0 ? 's'+(-i) : (i > 0 ? 'b'+i : '0')) + '.svg';
  fs.writeFileSync(fname, oneSVG);
  console.error('wrote '+fname);
}
