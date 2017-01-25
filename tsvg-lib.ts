/*

TODO
bug with the stupid regex for @xyz = rhs;  --  when rhs is a string with ; inside of it!

TODO
<If test={test-condition-code}>
  child1
  child2
</If> component

TODO
make a TSVG.Helper function that takes attrs {} and a <g> and makes <g attrs/>

*/

class TSVG {

  public static Fonts: any = {};

  // hack! -- TSVG needs a way to supply helper methods in user code from an external file (outside of TSVG file itself)
  public static unescapeSharpsFlatsNats(s) {
    s = s.replace(/\\#\\#/gi, '&#9839;&#9839;'); // double sharp
    s = s.replace(/\\b\\b/gi, '&#9837;&#9837;'); // double flat
    s = s.replace(/\\b/gi, '&#9837;'); // \b = \ then b characters
    s = s.replace(/\\n/gi, '&#9838;');  // not newline, but actual \ and then n characters
    s = s.replace(/\\#/gi, '&#9839;'); // \# = \ then # symbol
    s = s.replace(/\\o/gi, '&#176;'); // \o = \ then o character
    s = s.replace(/\\\//gi, '&#8730;'); // \/ = \ then / character -- sqaure root symbol, U+2713
    return s;
  }

  public static Helpers = {
    //hack
    unescapeSharpsFlatsNats: TSVG.unescapeSharpsFlatsNats,

    closedPolyPath: TSVG.closedPolyPath,
    translate: TSVG.translate,
    line: TSVG.line,
    lines: TSVG.lines,
    rotate: TSVG.rotate,
    range: TSVG.range,
    flatten: TSVG.flatten,
    makeStyle: TSVG.makeStyle
  };
  public static Templates = {};
  public static translate(x: string, y: string) { return `translate(${x}, ${y})`; }
  public static rotate(x: string, ox=0, oy=0) { return `rotate(${x}, ${ox}, ${oy})`; }
  public static line(x1: string, y1: string, x2: string, y2: string, opts: { [k: string]: any; }) {
    return FakeElement.creator('line', { x1: x1, y1: y1, x2: x2, y2: y2 }, {'stroke-width': 1, stroke: "black" }, opts);
  }
  public static closedPolyPath(opts: { [k: string]: any; }, d: string[]) {
    if (d.length < 4) {
      throw "Expected at least 4 scalars in coordinate list";
    }
    var d2 = d.slice(2);
    var data = `M ${d[0]} ${d[1]} ` + d2.byPairs().map(one => `L ${one[0]} ${one[1]}`).join(' ') + ' z';
    return FakeElement.creator('path', {d: data}, {'stroke-width': 1, stroke: "black"}, opts);
  }
  public static lines(opts: { [k: string]: any; }, pointPairs: Array<[any, any, any, any]>) {
    pointPairs.forEach(pointPair => {
      if (pointPair.length < 4) {
        throw "Expected at least 4 scalars in coordinate list";
      }
    });
    return React.createElement('g', {}, ...pointPairs.map( ([a,b, c,d]) => TSVG.line(a,b, c,d, opts) ));
  }
  static range2(start: number, count: number) {
    return Array.apply(0, Array(count))
      .map(function (element, index) { 
        return index + start;  
    });
  }
  public static range(a: number, b: number = undefined) {
    if (b) {
      return TSVG.range2(a, b - a);
    }
    return TSVG.range2(0, a);
  }
  public static flatten(array: any) {
    var result = [];
    TSVG.flattenInner(array, result);
    return result;
  }
  static flattenInner(array: any, result) {
    var length = array.length;
    var ii = 0;
    while (length--) {
      var current = array[ii++];
      if (Array.isArray(current)) {
        TSVG.flattenInner(current, result);
      } else {
        result.push(current);
      }
    }
  }
  public static makeStyle(kvs) {
    var ret = [];
    for (let k in kvs) {
      var v = kvs[k];
      ret.push(k + ': ' + v);
    }
    return ret.join('; ');
  }
}

function bind(obj, fn) {
  return function() {
    return fn.apply(obj, arguments);
  };
}

class FakeElement {
  public static addSlashes(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  }
  public static creator(tagName: string, args: { [k: string]: any; },  defaultOpts: { [k: string]: any; }, opts: { [k: string]: any; }) {
    var newOpts = opts || {};
    defaultOpts = FakeElement.combineAttrs(defaultOpts, newOpts);
    var combinedAttrs = FakeElement.combineAttrs(defaultOpts, args);
    return React.createElement(tagName, combinedAttrs);
  }
  constructor(public tagName: any, public attributes: { [k: string]: string; },
    public children: Array<any>) {
  }
  public render(): string {
    return this.renderInner(0).join('');
  }
  public static combineAttrs(oldAttrs: { [k: string]: any; }, newAttrs: { [k: string]: any; } ) {
    var ret = {};
    for (let prop in oldAttrs) {
      ret[prop] = oldAttrs[prop];
    }
    for (let prop in newAttrs) {
      ret[prop] = newAttrs[prop];
    }
    return ret;
  }
  public static doChildren(indent, children) {
    var ret: Array<string> = [];
    for (var i = 0; i < children.length; i++) {
      //console.log('---');
      //console.log(children[i]);
      if (children[i] === undefined) {
        ret.push('undefined'); // don'r crash
      }
      else if (children[i] === null) {
        ret.push('null'); // don'r crash
      }
      else if (children[i].renderInner) {
        ret = ret.concat((children[i] as FakeElement).renderInner(indent + 1));
        ret.push('\n');
      }
      else { // XML, SVG, HTML can have text in there. Thanks again morons who made SGML = whitespace doesn't matter except when it does.
        ret.push((children[i] as string).trim()); // use text as is except strip whitespace... ? this will F up HTML... TODOx
      }
    }
    return ret;
  }
  renderInner(indent: number): Array<string> {
    var ret = [];
    let moreAttribs = ' ';
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    if (typeof this.tagName === 'string') {
      ret.push(indentStr, '<', this.tagName);
      // TODO style 'tag' string according to whether children and/or attributes or not!
      //      e.g.  <br /> (desired)  vs.  <br></br> (current)
      for (let prop in this.attributes) {
        let prop2 = prop.replace(/xmlns_/g, 'xmlns:').replace(/xlink_/g, 'xlink:');
        ret.push(' ', prop2, '="', FakeElement.addSlashes(this.attributes[prop]), '"'); // escape the string
      }
      if (this.children.length == 0) { // no nesting
        ret.push('/>');
      }
      else {
        ret.push('>', '\n');
          // NOTE: other children can access stuff stored in here ... that is good
        ret = ret.concat(FakeElement.doChildren(indent, this.children));
        ret.push(indentStr, '</', this.tagName, '>');
      }
    }
    else { // Component mode, or capitilized special guys...
      ret = ret.concat(this.tagName.renderSpecial(indent, this.attributes, this.children));
    }
    return ret;
  }
}

class React {
  public static createElement(tagName: string, attributes: any, ...children: Array<FakeElement>) {
    return new FakeElement(tagName, attributes, children);
  }
}

class For {
  public static renderSpecial(indent: number, attributes: any, children: Array<any>): Array<string> {
    if (!attributes && attributes.hasOwnProperty('from') && attributes.hasOwnProperty('upTo')) {
      throw "For expects from=number and upTo=number";
    }
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }

    var from: any = attributes.from;
    var upTo: any = attributes.upTo;

    // run the for loop on each child in order
    var newChildren = [];
    children.forEach(kid => {
      for (var i = (from|0); i <= (upTo|0); i++) {
        newChildren.push( kid(i) );
      }
    });
    return FakeElement.doChildren(Math.max(0, indent-1), newChildren);
  }
}

class Font {
  public static renderSpecial(indent: number, attributes: any, children: Array<any>): Array<string> {
    if (!attributes && attributes.hasOwnProperty('id') && attributes.hasOwnProperty('path')) {
      throw "For expects id=string and path=string";
    }
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    // TODO check that path exists and load it, strip out some messy garbage, etc.
    // TODO load some stuff into TSVG.Fonts
    return [indentStr, '<!-- Loaded SVG font from path "', attributes.path, '" as id "', attributes.id, '" -->'];
  }
}

interface FontAndTextParams {
  x, y, fontSize, letterSpacing, lineHeight,
    unitsPerEm, ascent, descent, horizAdvX: number;
  emGlyph: any;
  // nullable args passed through if non-null
  id, style, transform, className: string;
  // a little statefulness
  lastX, lastY: number;
}
class TextPath {
  // based on (sort of) EasySVG by Simon Tarchichi <kartsims@gmail.com>
  public static renderSpecial(indent: number, attributes: any, children: Array<any>): Array<string> {
    if (!attributes || !attributes.hasOwnProperty('font-id') || !attributes.hasOwnProperty('style')) {
      throw "TextPath expects font-id=string and style=string";
    }

    // ----
    // pull out all the attributes, style fields, font metadata, and merge with defaults, etc.
    var id = attributes['font-id'];
    var className = attributes['className'] || null;
    var styleStr = attributes['style'];
    var transform = attributes['transform'] || null;
    var style = TextPath.styleToObject(styleStr);
    // font-size in px, 16 px = 1 em
    var params: FontAndTextParams = {
      id: null, style: null, className: className, transform: transform,
      x: 0, y: 0, fontSize: 16, letterSpacing: 0, lineHeight: 1, unitsPerEm: 1, emGlyph: null,
      ascent: 0, descent: 0, horizAdvX: 1,
      // a little statefulness
      lastX: 0, lastY: 0};
    TextPath.setAttrib(params, 'id', attributes);
    TextPath.setAttrib(params, 'x', attributes);
    TextPath.setAttrib(params, 'y', attributes);
    TextPath.setAttrib(params, 'fontSize', style, 'font-size');
    TextPath.setAttrib(params, 'fontSize', attributes, 'font-size'); // attributes override CSS
    TextPath.setAttrib(params, 'letterSpacing', style, 'letter-spacing');
    TextPath.setAttrib(params, 'letterSpacing', attributes, 'letter-spacing'); // attributes override CSS
    TextPath.setAttrib(params, 'lineHeight', style, 'line-height');
    TextPath.setAttrib(params, 'lineHeight', attributes, 'line-height'); // attributes override CSS
    // get the string out of here
    params.x = +(params.x);
    params.y = +(params.y);
    params.lastX = params.x;
    params.lastY = params.y;
    params.fontSize = +(params.fontSize);
    params.letterSpacing = +(params.letterSpacing);
    params.lineHeight = +(params.lineHeight);

    // TODO copy attributes like stroke-width, fill and stroke (color) to style (object -> back to string), but only if style is missing those fields, then add that string in here
    params.style = styleStr;
    
    if (!TSVG.Fonts.hasOwnProperty(id)) {
      console.error("Could not find Font with id = "+id);
      return [];
    }
    var font = TSVG.Fonts[id];
    TextPath.setAttrib(params, 'emGlyph', font.glyphs, 'm');
    TextPath.setAttrib(params, 'horizAdvX', font.meta, 'horiz-adv-x');
    TextPath.setAttrib(params, 'unitsPerEm', font.meta['font-face'], 'units-per-em');
    TextPath.setAttrib(params, 'ascent', font.meta['font-face']);
    TextPath.setAttrib(params, 'descent', font.meta['font-face']);
    params.horizAdvX = +(params.horizAdvX);
    params.unitsPerEm = +(params.unitsPerEm);
    params.ascent = +(params.ascent);
    params.descent = +(params.descent);
    TextPath.setAttrib(params, 'missingGlyph', font.meta, 'missing-glyph');
    //console.error(params);
    // ---- done pulling out params

    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    var ret = [indentStr];
    // children are UTF8 strings... right?
    children.forEach(s => {
      // TODO test if s is really Just A Single String and not nest nodes/components (or throw error)
      // TODO then maybe one day, look for tspans and typeset those, or do line wrapping, whatever...
      for (var ix = 0; ix < s.length; ix++) {
        var ch = s.charAt(ix); // TODO ? use EasySVG approach to pull out unicode from utf8 string
        var ch1 = ix < s.length - 1 ? ch1 = s.charAt(ix+1) : ''; // for kerning
        ret.push(TextPath.renderGlyph(font, params, ch, ch1));
      }
    });
    return ret;
  }
  static renderGlyph(font: any, params: FontAndTextParams, uni: string, uniNext: string) {
    var style: string = params.style;
    var glyph = font.glyphs[uni] || font.meta['missing-glyph'];
    var d = glyph.d || ''; // check if d is undefined (for example, space char -- just need horizontal advance :-)
    var size = params.fontSize / params.unitsPerEm;
    d = TextPath.DefTranslateAndScale(d, params.lastX, params.lastY, size, -size);
    var ret = `<path style="${style}" d="${d}"/>` + '\n'; // this whole bit is a hack, should be one path for entire run of glyphs
    // this is a hack too, since the math needs to be correct!
    var horizAdvX = glyph['horiz-adv-x'] || params.horizAdvX;
    horizAdvX = +(horizAdvX);
    var hkern = 0;
    var kernkey = uni+','+uniNext; 
    if (font.hkern[kernkey]) {
      hkern = font.hkern[kernkey];
      hkern = +(hkern);
    }
    horizAdvX -= hkern;
    params.lastX += horizAdvX * size;

    return ret;
  }

  // the math lives here
  static DefTranslateAndScale(def, tx, ty, sx, sy) {
    return TextPath.DefApplyMatrix(def, [sx, 0, 0, sy, tx, ty]);
  }
  static DefTranslate(def: string, x: number = 0, y: number = 0) {
    return TextPath.DefApplyMatrix(def, [1, 0, 0, 1, x, y]);
  }
  // this code may be unnecessary and we should probably just pass the  transform  attribute through from TSVG to SVG
  static DefRotate(def: string, angleDegrees: number, x: number = 0, y: number = 0) {
    if (x === 0 && y === 0){
      let theta = angleDegrees * Math.PI / 180.0;
      return TextPath.DefApplyMatrix(def, [Math.cos(theta), Math.sin(theta), -Math.sin(theta), Math.cos(theta), 0, 0]);
    }
    // rotate by a given point
    var def2 = TextPath.DefTranslate(def, x, y);
    def2 = TextPath.DefRotate(def, angleDegrees);
    def2 = TextPath.DefTranslate(def, -x, -y);
    return def2;
  }
  static DefScale(def, x: number = 1, y: number = 1) {
    return TextPath.DefApplyMatrix(def, [x, 0, 0, y, 0, 0]);
  }
  static DefApplyMatrix(def, matrix: number[]) {
    //console.error(def);
    return (def.match(TextPath.MzZzZRegex) || [])
              .map(shape => TextPath.DefApplyMatrix_OneShape(shape, matrix))
              .join(' ');
  }
  static MzZzZRegex = new RegExp('M[^zZ]*[zZ]', 'g');
  static AzAZazAZRegex = new RegExp('[a-zA-Z]+[^a-zA-Z]*', 'g');
  static NotazAZRegex = new RegExp('[^a-zA-Z]*', 'g');
  static NumberRegex = new RegExp('\-?[0-9\.]+', 'g');
  static CommaMinusRegex = new RegExp(',\-', 'g');
  static DefApplyMatrix_OneShape(def, matrix: number[]) {
    var ret = [];
    def.match(TextPath.AzAZazAZRegex).forEach(instruction => {
      var i = instruction.replace(TextPath.NotazAZRegex, '');
      var coords = instruction.match(TextPath.NumberRegex);
      var newCoords = [];
      while (coords && coords.length > 0) {
        let [a, b, c, d, e, f] = matrix;
        if (i === i.toLowerCase()) { // do not translate relative instructions :-)
          e = 0; f = 0;
        }
        let pushPoint = (x, y) => {
          newCoords.push([ a*x + c*y + e, b*x + d*y + f ]);
        }
        // convert horizontal lineto to lineto (relative)
        if (i === 'h') {
          i = 'l';
          pushPoint(+(coords.shift()), 0);
        }
        // convert vertical lineto to lineto (relative)
        else if (i === 'v') {
          i = 'l';
          pushPoint(0, +(coords.shift()));
        }
        // convert quadratic bezier curve (relative)
        else if (i === 'q') {
          pushPoint(+(coords.shift()), +(coords.shift()));
          pushPoint(+(coords.shift()), +(coords.shift()));
        }
        // TODO: handle 'a,A' (elliptic arc curve) commands
        // cf. http://www.w3.org/TR/SVG/paths.html#PathDataCurveCommands
        // every other command -- M m L l c C s S -- come in multiples of two numbers (coordinate pair (x,y))
        else {
          pushPoint(+(coords.shift()), +(coords.shift()));
        }
      }
      ret.push(i + newCoords.join(',').replace(TextPath.CommaMinusRegex, '-')); // remove useless commas (when dash for negative is there to separate the numbers)
    });
    return ret.join('');
  }

  // helpers
  public static setAttrib(params: any, k: string, attribs: any, k2: string=null) {
    if (!k2) { k2 = k; }
    if (attribs.hasOwnProperty(k2)) {
      params[k] = attribs[k2];
    }
  }
  public static styleToObject(styleStr) {
    var ret = {}
    var pieces = styleStr.split(';');
    pieces.forEach(pair => {
      if (pair.indexOf(':') > -1) {
        var ps2 = pair.split(':');
        var a = ps2[0].trim();
        var b = ps2[1].trim();
        ret[a] = b;
      }
    });
    return ret;
  }
}
