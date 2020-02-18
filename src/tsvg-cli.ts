// needed to get this older code to compile on TypeScript 2.x
// see https://stackoverflow.com/questions/31173738/typescript-getting-error-ts2304-cannot-find-name-require
declare var require: any
declare var __dirname: any
declare var process: any

const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

const optionDefinitions = [
  { name: 'help', alias: 'h', type: Boolean, description: "print this usage help and exit"},
  { name: 'keep', alias: 'k', type: Boolean, description: "do not delete .js.map, .js and .tsx temp files (.tsvg -> .tsx -> .js -> .svg); overwrite them if they exist (default is to delete upon success, and to bail if those files exist -- so as not to delete anything important)"},
  { name: 'force', alias: 'f', type: Boolean, description: "Always overwrite .js.map, .js and .tsx temp files (.tsvg -> .tsx -> .js -> .svg); they do not contain anything important"},
  { name: 'src', alias: 's', type: String, multiple: true, defaultOption: true, typeLabel: '[underline]{file.tsvg} ...',
    description: "(default if no flag specified) the input .tsvg files to process; by default x.tsvg will output x.svg (see --output below)"},
  { name: 'args', alias: 'a', multiple:true, type: String, typeLabel: '[underline]{k:v} ...',
    description: "one or more k:v pairs passed to the template, where @k takes the value v, e.g.  tsvg --args k:v  results in {k: 'v'}  passed to template"},
  { name: 'quiet', alias: 'q', type: Boolean,
    description: "produce no .svg ouput; generated .js code does not call  console.log(TSVG.Templates[<mine>]().render());  as is the default, for generating .svg files" },
  { name: 'output', alias: 'o', type: String, typeLabel: '[underline]{to/file.js}',
    description: "combine all .js code from all .tsvg src files into a single .js file, instead of generating .svg file(s); turns on --quiet as well" },
  { name: 'node', alias: 'n', type: Boolean,
    description: "output Node.js-compatible args-parsing code, when used with --output. The resulting .js file can be used as a commandline script which can be passed args, e.g.\n$ node stem.js k0:v0 k1:v1" },
  { name: 'global', alias: 'g', type: String,
    description: "define the global object to attach templates code to; for example  --global window generates code   window['TSVG'] = TSVG;  this turns on --quiet as well" },
  { name: 'dev', alias: 'd', type: Boolean,
    description: "a special flag for development, to force TypeScript files to be recompiled each time tsvg binary runs" },
  //{ name: 'jshelper', alias: 'j', type: String } // a helper file (.js or .ts) that gets prepended
];

const sections = [
  {
    header: 'TSVG',
    content: 'Turing-complete SVG preprocessor, using [italic]{JSX} and [italic]{JavaScript}'
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '$ tsvg input.tsvg',
        example: '1. Convert input.tsvg to input.svg.'
      },
      {
        desc: '$ tsvg input2.tsvg -a width:100',
        example: '2. Convert input2.tsvg to input2.svg; pass argument "@width" as "100".'
      },
      {
        desc: '$ tsvg *.tsvg -o tsvg-all.js -g window',
        example: '3. Convert multiple .tsvg files to one .js file (can call window.TSVG.Templates["fname"]({additional: "args"}).render() to generate SVG string).'
      },
    ]
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  },
  {
    content: 'Project home: [underline]{https://github.com/jupdike/tsvg}'
  }
]

const path = require('path');
const execFile = (file, args, cb) => { return require('child_process').execFile(file, args, {maxBuffer: 1024 * 1024}, cb); }
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
function getFontDefinitions(inputTSVGFilePath, input, fonts) {
  regexFont.forEach(reg => {
    var match = null;
    while ((match = reg.exec(input)) !== null) {
      if (match.length === 3) {
        var full = match[0];
        var whitelist = match[1];
        var path = match[2];
        // allow relative paths starting with ./whatever or ../whatever or ../../whatever
        if (path && path.length > 1 && path.charAt(0) == '.') {
          path = inputTSVGFilePath + '/' + path;
        }
        //console.error('match:', full);
        if (pathsSeen.hasOwnProperty(path)) {
          continue; // don't load font twice
        }
        pathsSeen[path] = true;
        FontSVG.Load(fonts, path, whitelist);
      } else if (match.length === 2) {
        var full = match[0];
        var path = match[1];
        // allow relative paths starting with ./whatever or ../whatever or ../../whatever
        if (path && path.length > 1 && path.charAt(0) == '.') {
          path = inputTSVGFilePath + '/' + path;
        }
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
  var parts = path.parse(infilename);
  var inputTSVGFilePath = parts.dir;
  var inkey = parts.base.replace(parts.ext, "");

  var infilecontents = fs.readFileSync(infilename) + "";

  getFontDefinitions(inputTSVGFilePath, infilecontents, fonts); // they all get added into one big dictionary of all the objects

  var kvs = {};
  infilecontents = getGlobals(infilecontents, kvs);
  var valbits = [];
  for (let prop in kvs) {
    valbits.push('that["' + prop + '"] = ' + kvs[prop] + ';');
  }
  var valStr = valbits.join('\n');

  // fix for certain XML v. JSX 'problems' in infilecontents, like these:
  infilecontents = infilecontents.replace(/xml:/g, 'xml_');
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

function wrapMeat(options, inkey, meat) {
  var pre = fs.readFileSync(__dirname + '/../lib/prepend.ts');
  var lib = fs.readFileSync(__dirname + '/../lib/tsvg-lib.ts');

  const argy = {};
  var loggy = '';
  if (options.args && !options.quiet && !options.node) {
    options.args.forEach(s => {
      const ps = s.split(':');
      if (ps.length >= 2) {
        const k = ps[0];
        const v = ps[1];
        argy[k] = v;
      }
    });
    loggy = `console.log(TSVG.Templates['${inkey}'](${JSON.stringify(argy, null, 2)}).render());`
  }
  if (options.node) {
    loggy = `
    var argy = {};
    if (process.argv && process.argv.length > 2) {
      process.argv.slice(2).forEach(function (s) {
          var ps = s.split(':');
          if (ps.length >= 2) {
              var k = ps[0];
              var v = ps[1];
              argy[k] = v;
          }
      });
    }
    console.log(TSVG.Templates['${inkey}'](argy).render());
`;
  }
  const global = options.global ? `var ${options.global}: any; ${options.global}['TSVG'] = TSVG;` : '';

  var result = `
${pre}
declare var process: any // deal with TypeScript type error which will not be a problem in the Node.js-specific .js file (if -n flag present)

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

function avoiding(outfilename) {
  return 'Avoiding overwriting file "'+outfilename+'". Use --force or --keep or delete the file manually to proceed. (TSVG makes temp files with this extension but only cleans them up upon successful compilation.)';
}

function processOneInfile(options, infilename) {
  var parts = path.parse(infilename);
  var inkey = parts.base.replace(parts.ext, "");
  var outfilename = infilename.replace(".tsvg", ".tsx");
  if (!options.keep && !options.force && fs.existsSync(outfilename)) {
    console.error(avoiding(outfilename));
    process.exit(1);
  }
  var meat = prepOneInfile(infilename);
  var result = wrapMeat(options, inkey, meat);
  fs.writeFileSync(outfilename, result);
}

// -------------------------------------------------------------
// do the stuff!
// replace the two lines of shell script with all of this stuff!

// tsc --sourceMap tsvg.ts tsvg-lib.ts prepend.ts && ...
var tsc = __dirname + '/../../typescript/bin/tsc';  // global would be '/usr/local/bin/tsc';
var tsc1 = tsc;
if (!fs.existsSync(tsc)) {
  // could not find tsc in typescript folder, as installed 'tsvg' package; could be tsvg development version
  tsc = __dirname + '/../node_modules/typescript/bin/tsc';  // global would be '/usr/local/bin/tsc';
}
if (!fs.existsSync(tsc)) {
  console.error('Could not find: '+tsc1);
  console.error('Could not find: '+tsc);
  console.error('Ensure that TypeScript is install in node_modules and that the path is relative to bin/tsvg as one of the above.');
  process.exit(1);
}
var node = '/usr/local/bin/node';

function ifhelper(cond: boolean, action, callback) {
  if (cond) {
    action(callback);
  }
  else {
    callback(null, '', '');
  }
}

// callback takes error as a first argument
export function main(options: any, callback: any) {
  if (!options) {
    if (process.argv.length < 3) {
      const usage = getUsage(sections);
      console.error(usage);
      console.error('Error: expected one or more source files.');
      process.exit(1);
    }
    options = commandLineArgs(optionDefinitions);
    if (options.output || options.global) {
      options.quiet = true;
    }
    if (options.help) {
      const usage = getUsage(sections);
      console.error(usage);
      process.exit(1);
    }
    console.error('FOUND THESE OPTIONS:', options);
  }
  ifhelper(options.dev, (cb) => execFile(tsc, ['--sourceMap', 'tsvg-lib.ts', 'prepend.ts'], cb),
    function (error, stdout, stderr) {
    if (error) {
      console.error('Problem compiling tsvg-lib.ts or prepend.ts:');
      console.error(error);
      console.error(stdout);
      console.error(stderr);
      process.exit(1);
    }

    // default: convert each .tsvg to .svg via .tsx and .js
    if (!options.output && !options.quiet && !options.global) {
      // ... && node tsvg.js $@
      options.src.forEach(infilename => {
        processOneInfile(options, infilename); // writes out a .tsx file

        var stem = infilename.replace('.tsvg', '');
        console.error('Input file stem: ' + stem);

        // avoid overwriting whatever.js
        var outfilename = stem+'.js';
        if (!options.keep && !options.force && fs.existsSync(outfilename)) {
          console.error(avoiding(outfilename));
          process.exit(1);
        }
        // avoid overwriting whatever.js.map
        var outfilename = stem+'.js.map';
        if (!options.keep && !options.force && fs.existsSync(outfilename)) {
          console.error(avoiding(outfilename));
          process.exit(1);
        }

        // tsc --sourceMap --jsx react $one.tsx && ...
        execFile(tsc, ['--sourceMap', '--jsx', 'react', stem+'.tsx'], function (error, stdout, stderr) {
          if (error) {
            console.error('Problem compiling .tsx file to .js:');
            console.error(error);
            console.error(stdout);
            console.error(stderr);
            process.exit(1);
          }

          // ... && node $one.js > $one.svg
          execFile(node, [stem+'.js'], function (error, stdout, stderr) {
            if (error) {
              console.error('Problem running .js file:');
              console.error(error);
              console.error(stdout);
              console.error(stderr);
              process.exit(1);
            }
            // success! write out the .svg
            console.error(stderr);
            fs.writeFileSync(stem+'.svg', stdout);
            if (!options.keep) {
              // upon success, remove the temp files
              fs.unlinkSync(stem+'.js', stdout);
              fs.unlinkSync(stem+'.js.map', stdout);
              fs.unlinkSync(stem+'.tsx', stdout);
            }
          });

        });
      });
    } else if (options.output) {
      // make a big .tsx file, and convert that to a single .js file. Do not run the .js output
      var outtsx = options.output.replace('.js','.tsx');

      var meats = [];
      if (options.node && options.src && options.src.length > 1) {
        console.error('Cannot use --node or -n flag unless there is only one .tsvg file specified in --src or -s');
        process.exit(1);
      }
      var stem = '';
      if (options.node && options.src && options.src.length > 0) {
        var parts = path.parse(options.src[0]);
        stem = parts.base.replace(parts.ext, "");
      }
      options.src.forEach(infilename => {
        console.error('Input file stem: ' + infilename);
        var meat = prepOneInfile(infilename);
        meats.push(meat);
      });

      // avoid overwriting whatever.tsx
      if (!options.keep && !options.force && fs.existsSync(outtsx)) {
        console.error(avoiding(outtsx));
        process.exit(1);
      }
      
      var result = wrapMeat(options, stem, meats.join('\n'));
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
        if (options.global) {
          // now replace   var exports;   or    var window;   or whatever with empty string
          var unneeded = `var ${options.global};`;
          var all = ''+fs.readFileSync(options.output);
          all = all.replace(unneeded, '');
          fs.writeFileSync(options.output, all);
          if (!options.keep) {
            // upon success, remove the temp files
            fs.unlinkSync(options.output.replace('.js','.js.map'), stdout);
            fs.unlinkSync(outtsx, stdout);
          }
        }
      });
      if (callback) {
        callback(null);
      }
    } else {
      console.error('Nothing to do. Choose a different combination of option flags, or add -o outputfilename.js');
    }
  });
}
