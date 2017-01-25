const fs = require('fs');
const xmlparse = require('xml-parser');

export class FontSVG {
  public static Load(fontsObject, svgXmlPath) {
    var font = { glyphs: {}, hkern: {}, meta: {}};

    var fontStr = fs.readFileSync(svgXmlPath) + "";
    fontStr = fontStr.replace(/\<\?.*?\?\>/g, '');
    fontStr = fontStr.replace(/\<!DOCTYPE.*?\>/g, '');
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
        gNameToUnicode[gname] = node.attributes.unicode;
        //console.log('loaded glyph for unicode: '+node.attributes.unicode);
        //console.log(node.attributes);
        font.glyphs[node.attributes.unicode] = node.attributes;
      }

      // // by glyph-name ... (how to translate from unicode to this when no unicode specified?)
      // if (node.attributes && node.attributes['glyph-name']) {
      //   //console.log('loaded glyph for glyph-name: '+node.attributes['glyph-name']);
      //   //console.log(node.attributes);
      //   font.glyphs[node.attributes['glyph-name']] = node.attributes;
      // }
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
