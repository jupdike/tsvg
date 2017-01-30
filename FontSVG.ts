const fs = require('fs');
const xmlparse = require('xml-parser');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

export class FontSVG {
  public static Load(fontsObject, svgXmlPath) {
    var font = { glyphs: {}, hkern: {}, meta: {}};

    var fontStr = fs.readFileSync(svgXmlPath) + "";
    fontStr = fontStr.replace(/\<\?.*?\?\>/g, '');
    fontStr = fontStr.replace(/\<!DOCTYPE.*?\>/g, '');
    fontStr = entities.decode(fontStr);
    var fontJson = xmlparse(fontStr);
    //console.log(fontJson);

    // assumes an acyclic structure, otherwise would loop forever
    function walker(node: any, name: string, f: any) {
      if (node.name === name) {
        f(node);
      }
      if (node.children) {
        node.children.forEach(c => walker(c, name, f));
      }
    }

    // TODO load data into 'font' object
    walker(fontJson.root, 'font', node => {
      //console.log(node);
      font.meta['id'] = node.attributes.id;
      font.meta['horiz-adv-x'] = node.attributes['horiz-adv-x'];
    });
    walker(fontJson.root, 'font-face', node => {
      //console.log(node);
      font.meta['font-face'] = node.attributes;
    });
    walker(fontJson.root, 'missing-glyph', node => {
      //console.log(node);
      font.meta['missing-glyph'] = node.attributes;
    });
    var gNameToUnicode = {}
    walker(fontJson.root, 'glyph', node => {
      //console.log(node);
      if (node.attributes && node.attributes.unicode && node.attributes['glyph-name']) {
        var gname = node.attributes['glyph-name'];
        const uni = node.attributes.unicode;
        if (uni === entities.decode("&#x2028;") ||
          uni === entities.decode("&#x2029;")) {
          return; // skip verical line separator and paragraph separator
          // http://www.fileformat.info/info/unicode/char/2028/index.htm ... screws up JavaScript output
        }
        gNameToUnicode[gname] = uni;
        //console.log('loaded glyph for unicode: '+node.attributes.unicode);
        //console.log(node.attributes);
        font.glyphs[uni] = node.attributes;
      }
      // try converting the glyph name to unicode (we don't already have valid unicode for that glyph, above)
      else if (node.attributes && node.attributes['glyph-name']) {
        var gname = node.attributes['glyph-name'];
        const fakeent = '&'+gname+';';
        const uni = entities.decode(fakeent);
        if (uni && fakeent != uni && uni.length <= 2) { // got back a real decoded character
          gNameToUnicode[gname] = uni;
          //console.log('* loaded glyph for _fake_ unicode: '+uni);
          //console.log(node.attributes);
          font.glyphs[uni] = node.attributes;
        }
      }
    });
    walker(fontJson.root, 'hkern', node => {
      //console.log(node);
      if (node.attributes.g1 && node.attributes.g2) {
        var g1 = node.attributes.g1.split(',');
        var g2 = node.attributes.g2.split(',');
        var kerning = node.attributes.k;
        g1.forEach(g => {
          if (!(g1 in gNameToUnicode)) {
            return;
          }
          g2.forEach(h => {
            if (!(g2 in gNameToUnicode)) {
              return;
            }
            var p = gNameToUnicode[g1]+','+gNameToUnicode[g2];
            font.hkern[p] = kerning;
          });
        });
      }
      if (node.attributes.u1 && node.attributes.u2) {
        var u1 = node.attributes.u1.split(',');
        var u2 = node.attributes.u2.split(',');
        var kerning = node.attributes.k;
        u1.forEach(u => {
          u2.forEach(v => {
            var p = u+','+v;
            font.hkern[p] = kerning;
          });
        });
      }
      
    });
    console.error('Loaded font: '+svgXmlPath);
    console.error('... Found '+Object.keys(font.glyphs).length+ ' glyphs');
    console.error('... Found '+Object.keys(font.hkern).length+ ' kerning pairs');
    //console.log(JSON.stringify(font, null, 2));

    //process.exit(1);

    fontsObject[font.meta['id']] = font;

  }
}
