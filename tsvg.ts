if (process.argv.length < 3 || process.argv[2].indexOf('.tsvg') < 0) {
    console.error(`Expected\n\t${process.argv[1]} infile.tsvg`);
    process.exit(1);
}
const fs = require('fs');
import {FontSVG} from './FontSVG';

var infilename = process.argv[2];
var inkey = infilename.replace(".tsvg", "");

var pre = fs.readFileSync('prepend.ts'); // TODO use the right path
var lib = fs.readFileSync('tsvg-lib.ts');

const regexDefine = new RegExp(`(@[a-zA-Z0-9_\-]+)[ ]*=[ ]*([^;]+);`, "g"); // this should be smarter and account for semicolons inside strings

var infilecontents = fs.readFileSync(infilename) + "";

var fonts: any = {};
var pathsSeen = {};
// single and double quotes
const regexFont = [new RegExp(`\<Font path\="([^"]*)\".*\/\>`, 'g'),
                   new RegExp(`\<Font path\='([^']*)'.*\/\>`, 'g'),
                   // this is such a hack since the order matters and both must use either single or double quotes. Oops
                   new RegExp(`\<Font white-list-chars\="([^"]*)" path\="([^"]*)".*\/\>`, 'g'),
                   new RegExp(`\<Font white-list-chars\='([^']*)' path\='([^']*)'.*\/\>`, 'g')];
function getFontDefinitions(input, fonts) {
  regexFont.forEach(reg => {
    var match = null;
    while ((match = reg.exec(input)) !== null) {
      if (match.length === 3) {
        var full = match[0];
        var whitelist = match[1];
        var path = match[2];
        //console.error('match:', full);
        if (pathsSeen.hasOwnProperty(path)) {
          continue; // don't load font twice
        }
        pathsSeen[path] = true;
        FontSVG.Load(fonts, path, whitelist);
      } else if (match.length === 2) {
        var full = match[0];
        var path = match[1];
        //console.error('match:', full);
        if (pathsSeen.hasOwnProperty(path)) {
          continue; // don't load font twice
        }
        pathsSeen[path] = true;
        FontSVG.Load(fonts, path, whitelist);
      }
    }
  });
}
getFontDefinitions(infilecontents, fonts);

// returns a copy of the input string with template stuff pulled out
// and key values pairs added to vals
function getGlobals(input, vals) {
  var match;
  var copyInput = input;
  while ((match = regexDefine.exec(input)) !== null) {
    var full = match[0];
    var lhs = match[1];
    var rhs = match[2].replace(/@/g, 'that.');
    var k = lhs.replace('@','');
    copyInput = copyInput.replace(full, '');
    vals[k] = rhs; // possibly overwrite previous value
  }
  return copyInput;
}

var kvs = {};
infilecontents = getGlobals(infilecontents, kvs);
var valbits = [];
for (let prop in kvs) {
  valbits.push('that["' + prop + '"] = ' + kvs[prop] + ';');
}
var valStr = valbits.join('\n');

// fix for certain XML v. JSX 'problems' in infilecontents, like these:
infilecontents = infilecontents.replace(/xmlns:/g, 'xmlns_');
infilecontents = infilecontents.replace(/xlink:/g, 'xlink_');
infilecontents = infilecontents.replace(/\<\!\-\-/g, '{/*');
infilecontents = infilecontents.replace(/\-\-\>/g, '*/}');

infilecontents = infilecontents.replace(/@/g, 'this.');

// TODO try    {"<!--   and  -->"}  to make it pass through...  (DOESN'T WORK since we have to count / escape quotes correctly...) NEEDS > REGEX
//
//  TODO? also remove newlines from within attribute strings, since SVG allows this,
//  but JSX does not

var loggy = `console.log(TSVG.Templates['${inkey}']({}).render());`
// TODO if option for no log,  loggy = '';

var result = `
${pre}
(function() { // protect TSVG lib + React, TextPath, For, Font, etc. from infecting global

${lib}

(function() { // protect that->this prepper from infecting global namespace

var that2: any = {};
// allow @xyz = rhs; for rhs to use TSVG.Helpers!
var that: any = FakeElement.combineAttrs(TSVG.Helpers, that2); // does a copy
${valStr};

bind(that, function() {
  TSVG.Fonts = ${JSON.stringify(fonts, null, 2).replace(/ \-/g, '-')};
  TSVG.Templates['${inkey}'] = (arg) => {
    if (arg) { // optionally augment or overwrite fields in 'this' (e.g. @xyz = this.xyz)
      for (let k in arg) {
        this[k] = arg[k];
      }
    }
    return ${infilecontents}
  };
})();

})(); // protect that->this prepper from infecting global namespace

${loggy}

})(); // protect TSVG, React, etc. from infecting global namespace
`;

// the stringify(..).replace(.., ..) code above removes unnecessary spaces before hyphens (minus signs) to save ~3% file size on some fonts

var outfilename = inkey + ".tsx";
fs.writeFileSync(outfilename, result);
