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

// TODO 'fix' problems in infilecontents, like these:
infilecontents = infilecontents.replace(/xmlns:/g, 'xmlns_');
infilecontents = infilecontents.replace(/xlink:/g, 'xlink_');

// TODO -- Very Simple string replace:
//
//   <!-- small string -->
//   vvvv              vvv
//   {/*  small string */}
//
//  TODO? also remove newlines from within strings, since SVG allows this, but JSX does not

var result = `(function() {
${pre}
TSVG.Templates['${inkey}'] = ${infilecontents};
})();
`;

var outfilename = inkey + ".tsx";
fs.writeFileSync(outfilename, result);
