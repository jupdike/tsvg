const fs = require('fs');
const xmlparse = require('xml-parser');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const jsmd5 = require('js-md5');
const path = require('path');

export class FontSVG {
  static GetMD5Hash(input: string): string{
    var ob = jsmd5.update(input);
    return ob.hex();
  }
  // assumes an acyclic structure, otherwise would loop forever
  static walker(node: any, name: string, f: any) {
    if (node.name === name) {
      f(node);
    }
    if (node.children) {
      node.children.forEach(c => FontSVG.walker(c, name, f));
    }
  }
  public static Load(fontsObject, svgXmlPath, whitelist) {
    //console.error(svgXmlPath);
    if (whitelist) {
      console.error('whitelisting these characters: '+ whitelist);
    }

    var fontStr = fs.readFileSync(svgXmlPath) + "";
    var dir = path.dirname(svgXmlPath);
    var cachedName = path.join(dir, 'font-' + FontSVG.GetMD5Hash(fontStr + whitelist) + '.json'); // same if font contents and whitelist are the same

    if (!fs.existsSync(cachedName)) {
      console.error('Could not find cached file '+cachedName);

      var font: any = { glyphs: {}, hkern: {}, meta: {}};

      // normal case; build the JSON font and write to disk
      fontStr = fontStr.replace(/\<\?.*?\?\>/g, '');
      fontStr = fontStr.replace(/\<!DOCTYPE.*?\>/g, '');
      fontStr = entities.decode(fontStr);
      var fontJson = xmlparse(fontStr);
      //console.log(fontJson);

      // TODO load data into 'font' object
      FontSVG.walker(fontJson.root, 'font', node => {
        //console.log(node);
        font.meta['id'] = node.attributes.id;
        font.meta['horiz-adv-x'] = node.attributes['horiz-adv-x'];
      });
      FontSVG.walker(fontJson.root, 'font-face', node => {
        //console.log(node);
        font.meta['font-face'] = node.attributes;
      });
      FontSVG.walker(fontJson.root, 'missing-glyph', node => {
        //console.log(node);
        font.meta['missing-glyph'] = node.attributes;
      });
      var gNameToUnicode = {}
      FontSVG.walker(fontJson.root, 'glyph', node => {
        //console.log(node);
        if (node.attributes && node.attributes.unicode && node.attributes['glyph-name']) {
          var gname = node.attributes['glyph-name'];
          const uni = node.attributes.unicode;
          if (whitelist && whitelist.indexOf(uni) < 0) {
            return;
          }
          delete node.attributes['unicode'];
          delete node.attributes['glyph-name'];
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
          delete node.attributes['glyph-name'];
          const fakeent = '&'+gname+';';
          const uni = entities.decode(fakeent);
          if (uni && fakeent != uni && uni.length <= 2) { // got back a real decoded character
            if (whitelist && whitelist.indexOf(uni) < 0) {
              return;
            }
            gNameToUnicode[gname] = uni;
            //console.log('* loaded glyph for _fake_ unicode: '+uni);
            //console.log(node.attributes);
            font.glyphs[uni] = node.attributes;
          }
        }
      });
      FontSVG.walker(fontJson.root, 'hkern', node => {
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
      console.error('Loaded font with id: '+ font.meta['id']);
      console.error('... Found '+Object.keys(font.glyphs).length+ ' glyphs');
      console.error('... Found '+Object.keys(font.hkern).length+ ' kerning pairs');

      fontsObject[font.meta['id']] = font;

      var serialized = JSON.stringify(font, null, 2);
      console.error('Cached '+serialized.length+' bytes to file '+cachedName);
      fs.writeFileSync(cachedName, serialized);
    } else {
      var data = fs.readFileSync(cachedName);
      var font: any = JSON.parse(data);
      var id = font.meta['id'];
      fontsObject[id] = font;
      console.error('Retrieved cached file '+cachedName+' of length '+data.length+' as id '+id);
    }
  }
}
