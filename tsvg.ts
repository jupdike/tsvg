if (process.argv.length < 3 || process.argv[2].indexOf('.tsvg') < 0) {
    console.error(`Expected\n\t${process.argv[1]} infile.tsvg`);
    process.exit(1);
}
var fs = require('fs');

var infilename = process.argv[2];
var inkey = infilename.replace(".tsvg", "");
//console.log(infile);

var pre = fs.readFileSync('prepend.ts'); // TODO use the right path
var lib = fs.readFileSync('tsvg-lib.ts');

//let tree = React.createElement('a', {}, []); // todo read in file!
//console.log(tree.render());

var regexDefine = new RegExp("(@[a-zA-Z0-9_\-]+):\w*([^;]+);", "g");

var infilecontents = fs.readFileSync(infilename) + "";

// returns a copy of the input string with template stuff pulled out
// and key values pairs added to vals
function getGlobals(input, vals) {
	var match;
	var copyInput = input;
	while ((match = regexDefine.exec(input)) !== null) {
		var full = match[0];
		var lhs = match[1];
		var rhs = match[2];
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
  valbits.push('"' + prop + '": ' + kvs[prop]);
}
var valStr = '{ ' + valbits.join(', ') + ' }';

// fix for certain XML v. JSX 'problems' in infilecontents, like these:
infilecontents = infilecontents.replace(/xmlns:/g, 'xmlns_');
infilecontents = infilecontents.replace(/xlink:/g, 'xlink_');
infilecontents = infilecontents.replace(/\<\!\-\-/g, '{/*');
infilecontents = infilecontents.replace(/\-\-\>/g, '*/}');

infilecontents = infilecontents.replace(/@/g, 'this.');

// TODO try    {"<!--   and  -->"}  to make it pass through...  (DOESN'T WORK since we have to count / escape quotes correctly...) NEEDS REGEX
//
//  TODO? also remove newlines from within strings, since SVG allows this,
//  but JSX does not

var result = `
${pre}
(function() {

  ${lib}

  var that = FakeElement.combineAttrs(TSVG.Helpers, ${valStr});
  bind(that, function() {
    TSVG.Templates['${inkey}'] = ${infilecontents}
  })();

  console.log(TSVG.Templates['${inkey}'].render());

})();
`;

var outfilename = inkey + ".tsx";
fs.writeFileSync(outfilename, result);
