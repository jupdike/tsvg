if (process.argv.length < 3 || process.argv[2].indexOf('.tsvg') < 0) {
    console.error(`Expected\n\t${process.argv[1]} infile.tsvg`);
    process.exit(1);
}
var fs = require('fs');

var infilename = process.argv[2];
var inkey = infilename.replace(".tsvg", "");
//console.log(infile);

var pre = fs.readFileSync('prepend.ts');

//let tree = React.createElement('a', {}, []); // todo read in file!
//console.log(tree.render());

var infilecontents = fs.readFileSync(infilename) + "";

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

var result = `(function() {
${pre}
  bind(TSVG.Helpers, function() {
    TSVG.Templates['${inkey}'] = ${infilecontents}
    console.log(TSVG.Templates['${inkey}'].render());
  })();
})();
`;

var outfilename = inkey + ".tsx";
fs.writeFileSync(outfilename, result);
