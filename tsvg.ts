if (process.argv.length < 3) { // || process.argv[2].indexOf('.tsvg') < 0) {
    console.error(`Expected\n\t${process.argv[1]} infile.tsvg`);
    process.exit(1);
}

const execFile = require('child_process').execFile;
const commandLineArgs = require('command-line-args');
const optionDefinitions = [
  { name: 'quiet', alias: 'q', type: Boolean }, // do not call console.log(TSVG.Templates[<mine>]().render());
  { name: 'src', type: String, multiple: true, defaultOption: true },
  { name: 'arg', alias: 'a', multiple:true, type: String }, // --arg k:v
  { name: 'output', alias: 'o', type: String },
  { name: 'global', alias: 'g', type: String } // generate code:   window['TSVG'] = TSVG;
  //{ name: 'jshelper', alias: 'j', type: String } // a helper file (.js or .ts) that gets prepended
];
const options = commandLineArgs(optionDefinitions);
if (options.output || options.global) {
  options.quiet = true;
}
console.error('FOUND THESE OPTIONS:', options);

const fs = require('fs');
import {FontSVG} from './FontSVG';

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

const regexDefine = new RegExp(`(@[a-zA-Z0-9_\-]+)[ ]*=[ ]*([^;]+);`, "g"); // this should be smarter and account for semicolons inside strings

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

function prepOneInfile(infilename) {
  var inkey = infilename.replace(".tsvg", "");
  var infilecontents = fs.readFileSync(infilename) + "";

  getFontDefinitions(infilecontents, fonts); // they all get added into one big dictionary of all the objects

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

  var meat = `
(function() { // protect that->this prepper from infecting global namespace

var that2: any = {};
// allow @xyz = rhs; for rhs to use TSVG.Helpers!
var that: any = FakeElement.combineAttrs(TSVG.Helpers, that2); // does a copy
${valStr};

bind(that, function() {
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
`;

  return meat;
}

function wrapMeat(infilename, meat) {
  var inkey = infilename.replace(".tsvg", "");
  var pre = fs.readFileSync('prepend.ts'); // TODO use the right path
  var lib = fs.readFileSync('tsvg-lib.ts');

  const argy = {};
  if (options.arg) {
    options.arg.forEach(s => {
      const ps = s.split(':');
      if (ps.length >= 2) {
        const k = ps[0];
        const v = ps[1];
        argy[k] = v;
      }
    });
  }
  const loggy = options.quiet ? '' : `console.log(TSVG.Templates['${inkey}'](${JSON.stringify(argy, null, 2)}).render());`
  const global = options.global ? `var ${options.global}: any; ${options.global}['TSVG'] = TSVG;` : '';

  var result = `
${pre}
(function() { // protect TSVG lib + React, TextPath, For, Font, etc. from infecting global

${lib}

TSVG.Fonts = ${JSON.stringify(fonts, null, 2).replace(/ \-/g, '-')};

${meat}

${loggy}
${global}

})(); // protect TSVG, React, etc. from infecting global namespace
`;
// NOTE: the stringify(..).replace(.., ..) code above removes unnecessary spaces before hyphens (minus signs) to save ~3% file size on some fonts

  return result;
}

function processOneInfile(infilename) {
  var inkey = infilename.replace(".tsvg", "");
  var outfilename = inkey + ".tsx";
  var meat = prepOneInfile(infilename);
  var result = wrapMeat(infilename, meat);
  fs.writeFileSync(outfilename, result);
}

// -------------------------------------------------------------
// do the stuff!
// replace the two lines of shell script with all of this stuff!

// TODO major -- remove reliance on tsvg.sh so this script (./tsvg.js or just node tsvg.js mapped to tsvg executable)
//               can stand on its own, compile multiple files, allow optional -o = --output, etc.


// tsc --sourceMap tsvg.ts tsvg-lib.ts prepend.ts && ...
var tsc = '/usr/local/bin/tsc';
var node = '/usr/local/bin/node';

execFile(tsc, ['--sourceMap', 'tsvg-lib.ts', 'prepend.ts'], function (error, stdout, stderr) {
  if (error) {
    console.error('Problem compiling tsvg-lib.ts or prepend.ts:');
    console.error(error);
    process.exit(1);
  }

  // default: convert each .tsvg to .svg via .tsx and .js
  if (!options.output && !options.quiet && !options.global) {
    // ... && node tsvg.js $@
    options.src.forEach(infilename => {
      processOneInfile(infilename); // writes out a .tsx file

      var stem = infilename.replace('.tsvg', '');
      console.error('Input file stem: ' + stem);

        // tsc --sourceMap --jsx react $one.tsx && ...
        execFile(tsc, ['--sourceMap', '--jsx', 'react', stem+'.tsx'], function (error, stdout, stderr) {
          if (error) {
            console.error('Problem compiling .tsx file to .js:');
            console.error(error);
            process.exit(1);
          }

          //if (todo == 0) { // do this once, when the last one ends
            // ... && node $one.js > $one.svg
            execFile(node, [stem+'.js'], function (error, stdout, stderr) {
              if (error) {
                console.error('Problem running .js file:');
                console.error(error);
                process.exit(1);
              }
              fs.writeFileSync(stem+'.svg', stdout)
            });
          //}

        });
      });
  } else {
    // make a big .tsx file, and convert that to a single .js file. Do not run the .js output
    var outtsx = options.output.replace('.js','.tsx');

    var meats = [];
    options.src.forEach(infilename => {
      console.error('Input file stem: ' + infilename);
      var inkey = infilename.replace(".tsvg", "");
      var meat = prepOneInfile(infilename);
      meats.push(meat);
    });

    var result = wrapMeat('', meats.join('\n'));
    fs.writeFileSync(outtsx, result);

    // tsc --sourceMap --jsx react $one.tsx && ...
    execFile(tsc, ['--sourceMap', '--jsx', 'react', outtsx], function (error, stdout, stderr) {
      if (error) {
        console.error('Problem compiling .tsx file to .js:');
        console.error(error);
        console.error(stderr);
        console.error(stdout);
        process.exit(1);
      }
    });
  }
});
