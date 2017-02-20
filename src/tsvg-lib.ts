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

  public static Helpers = {
    with: TSVG.with,
    closedPolyPath: TSVG.closedPolyPath,
    translate: TSVG.translate,
    line: TSVG.line,
    lines: TSVG.lines,
    rotate: TSVG.rotate,
    range: TSVG.range,
    flatten: TSVG.flatten,
    makeStyle: TSVG.makeStyle,
    textWidth: TSVG.textWidthHelper
  };
  public static Templates = {};
  public static translate(x: string, y: string) { return `translate(${x}, ${y})`; }
  public static rotate(x: string, ox=0, oy=0) { return `rotate(${x}, ${ox}, ${oy})`; }
  public static line(x1: string, y1: string, x2: string, y2: string, opts: { [k: string]: any; }) {
    return FakeElement.creator('line', { x1: x1, y1: y1, x2: x2, y2: y2 }, {'stroke-width': 1, stroke: "black" }, opts);
  }
  public static with(obj1: any, key: string, rhs: any) {
    var obj2 = {};
    obj2[key] = rhs;
    return FakeElement.combineAttrs(obj1, obj2);
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
  public static textWidthHelper(fontId: string, fontSize: number, style: any, textStr: string): number {
    var attributes: any = {'font-id': fontId, 'font-size': fontSize, 'style': ''};
    if (typeof style === 'string' || style instanceof String) {
      attributes['style'] = style;
    }
    else {
      attributes['style'] = TSVG.makeStyle(style);
    }
    var params: FontAndTextParams = TextPath.parseParams(attributes);
    if (!params) {
      console.error('textWidth helper: invalid text params or missing font');
      return -1;
    }
    const children = [textStr];
    var width = TextPath.textWidth(children, params.font, params);
    return width;
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
    if (!attributes && !attributes.hasOwnProperty('path')) {
      throw "Font expects path=string";
    }
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    return [indentStr, '<!-- Loaded SVG font from path "', attributes.path, '" -->'];
  }
}

interface FontAndTextParams {
  x, y, fontSize, letterSpacing, lineHeight,
    em, ex, // based on current font size
    unitsPerEm, ascent, descent, horizAdvX: number;
  textAnchor: string; // left (default) right, middle (allow center for kicks)
  // nullable args passed through if non-null
  id, style, transform, className: string;
  font: any; // the glyph lookup and hkern lookup tables for the font (we have extracted any meta already)
}
class TextPath {
  // https://www.w3.org/TR/SVG/coords.html#Units
  // "1pt" equals "1.25px" (and therefore 1.25 user units)
  // "1pc" equals "15px" (and therefore 15 user units)
  // "1mm" would be "3.543307px" (3.543307 user units)
  // "1cm" equals "35.43307px" (and therefore 35.43307 user units)
  // "1in" equals "90px" (and therefore 90 user units)
  // NOTE: em is based on the font and font size
  public static makePixels(str: string, em: number, ex: number): number {
    str = "" + str; // force it to be a string if it is a number
    const strPartAsDouble: number = +(str.match(TextPath.NumberRegex));
    const otherPart = str.replace(TextPath.NumberRegex, '').toLowerCase().trim();
    var scale = 1.0; // 'px' or other unknown duded
    if (otherPart === 'pt') {
      scale = 1.25;
    }
    else if (otherPart === 'pc') {
      scale = 15;
    }
    else if (otherPart === 'mm') {
      scale = 3.543307;
    }
    else if (otherPart === 'cm') {
      scale = 35.43307;
    }
    else if (otherPart === 'in') {
      scale = 90;
    }
    else if (otherPart === 'rem') { // root em, defined to be 16px, I think...
      scale = 16;
    }
    else if (otherPart === 'em') {
      scale = em;
    }
    else if (otherPart === 'ex') {
      scale = ex;
    }
    return strPartAsDouble * scale;
  }
  public static parseParams(attributes: any): FontAndTextParams {
    // pull out all the attributes, style fields, font metadata, and merge with defaults, etc.
    var id = attributes['font-id'];
    var className = attributes['className'] || null;
    var styleStr = attributes['style'];
    var transform = attributes['transform'] || null;
    var style = TextPath.styleToObject(styleStr);
    // font-size in px, 16 px = 1 em
    var params: FontAndTextParams = {
      id: null, style: null, className: className, transform: transform,
      x: 0, y: 0, fontSize: 16, letterSpacing: 0, lineHeight: 1, unitsPerEm: 1, ex: 1, em: 1,
      ascent: 0, descent: 0, horizAdvX: 1, textAnchor: "start", font: null };
    TextPath.setAttrib(params, 'id', attributes);
    TextPath.setAttrib(params, 'x', attributes);
    TextPath.setAttrib(params, 'y', attributes);
    TextPath.setAttrib(params, 'fontSize', style, 'font-size');
    TextPath.setAttrib(params, 'fontSize', attributes, 'font-size'); // attributes override CSS
    TextPath.setAttrib(params, 'letterSpacing', style, 'letter-spacing');
    TextPath.setAttrib(params, 'letterSpacing', attributes, 'letter-spacing'); // attributes override CSS
    TextPath.setAttrib(params, 'lineHeight', style, 'line-height');
    TextPath.setAttrib(params, 'lineHeight', attributes, 'line-height'); // attributes override CSS
    // start = left, middle = center, end = right
    TextPath.setAttrib(params, 'textAnchor', style, 'text-anchor');
    TextPath.setAttrib(params, 'textAnchor', attributes, 'text-anchor'); // attributes override CSS
    params.textAnchor = params.textAnchor.toLowerCase();
    // get the string out of here
    params.x = +(params.x);
    params.y = +(params.y);
    params.lineHeight = +(params.lineHeight);
    params.fontSize = TextPath.makePixels(params.fontSize, 1, 1); // circular logic: let em be 1 if they use it, since it makes no sense for the font size, since other 'em' units are defined in terms of params.em, which is based on font size (same with x)
    params.em = params.fontSize; // 1 em is by definition the font height = font size :-) that is what an em is!
    //console.error('params:', params);

    // TODO copy attributes like stroke-width, fill and stroke (color) to style (object -> back to string), but only if style is missing those fields, then add that string in here
    params.style = styleStr;
    
    if (!TSVG.Fonts.hasOwnProperty(id)) {
      console.error("Could not find Font with id = "+id);
      return null;
    }
    var font = TSVG.Fonts[id];
    params.font = font;
    TextPath.setAttrib(params, 'unitsPerEm', font.meta['font-face'], 'units-per-em');
    params.unitsPerEm = +(params.unitsPerEm);
    TextPath.setAttrib(params, 'horizAdvX', font.meta, 'horiz-adv-x');
    params.horizAdvX = +(params.horizAdvX);
    TextPath.setAttrib(params, 'ascent', font.meta['font-face']);
    params.ascent = +(params.ascent);
    TextPath.setAttrib(params, 'descent', font.meta['font-face']);
    params.descent = +(params.descent);
    TextPath.setAttrib(params, 'ex', font.meta['font-face'], 'x-height');
    params.ex = +(params.ex);
    params.ex = params.ex * params.fontSize / params.unitsPerEm;
    TextPath.setAttrib(params, 'missingGlyph', font.meta, 'missing-glyph');

    if (params.letterSpacing) {
      params.letterSpacing = TextPath.makePixels(params.letterSpacing, params.em, params.ex);
    }

    return params;
  }
  // based on (sort of) EasySVG by Simon Tarchichi <kartsims@gmail.com>
  public static renderSpecial(indent: number, attributes: any, children: Array<any>): Array<string> {
    if (!attributes || !attributes.hasOwnProperty('font-id') || !attributes.hasOwnProperty('style')) {
      throw "TextPath expects font-id=string and style=string";
    }
    const params = TextPath.parseParams(attributes);
    const font = params.font;
    const styleStr = attributes['style'];
    if (!params) {
      console.error('Failed to parse params, so TextPath component render failes');
      return [];
    }

    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }

    var width = 0;
    // left or start or anything else draws text with anchor on the left
    if (params.textAnchor == "middle" || params.textAnchor == "center" ||
      params.textAnchor == "right" || params.textAnchor == "end") {
      width = TextPath.textWidth(children, font, params); // don't compute this unless we need to
    }
    var lastX = params.x;
    if (params.textAnchor == "middle" || params.textAnchor == "center") {
      lastX -= width / 2;
    }
    else if (params.textAnchor == "right" || params.textAnchor == "end") {
      lastX -= width;
    }
    var lastY = params.y;

    var ret = [indentStr, `<path style="${styleStr}" d="`];
    TextPath.walkChildren(children, font, params, lastX, lastY,
      (d, size, dx, dy) => {
        // 'render' a glyph
        ret.push(TextPath.DefTranslateAndScale(d, lastX, lastY, size, -size));
        lastX += dx;
        lastY += dy;
      });
    ret.push('"/>');

    return ret;
  }
  static walkChildren(children: any, font, params, lastX, lastY, useGlyph: any) {
    // children are UTF8 strings... right?
    children.forEach(s => {
      // TODO test if s is really Just A Single String and not nest nodes/components (or throw error)
      // TODO then maybe one day, look for tspans and typeset those, or do line wrapping, whatever...
      for (var ix = 0; ix < s.length; ix++) {
        var ch = s.charAt(ix); // TODO ? use EasySVG approach to pull out unicode from utf8 string
        var ch1 = ix < s.length - 1 ? ch1 = s.charAt(ix+1) : ''; // for kerning
        var ch2 = ix < s.length - 2 ? ch2 = s.charAt(ix+2) : ''; // could be a ligature or UTF
        if (params.letterSpacing == 0 &&
          ix < s.length - 2 && font.glyphs[ch+ch1]) { // if ligature or 'wide' unicode character exists -- don't use ligature if letter-spacing set to something interesting :-)
          //console.error('found '+ch+ch1);
          TextPath.advanceByGlyph(font, params, lastX, lastY, ch+ch1, ch2, useGlyph);
          ix++; // extra++
        }
        if (params.letterSpacing == 0 &&
          ix < s.length - 1 && font.glyphs[ch+ch1]) { // if ligature or 'wide' unicode character exists -- don't use ligature if letter-spacing set to something interesting :-)
          //console.error('found '+ch+ch1);
          TextPath.advanceByGlyph(font, params, lastX, lastY, ch+ch1, '', useGlyph);
          ix++; // extra++
        }
        else {
          TextPath.advanceByGlyph(font, params, lastX, lastY, ch, ch1, useGlyph);
        }
      }
    });
  }
  static advanceByGlyph(font: any, params: FontAndTextParams, 
    lastX: number, lastY: number,
    uni: string, uniNext: string,
    callMe: any) {
    var style: string = params.style;
    var glyph = font.glyphs[uni] || font.meta['missing-glyph'];
    var d = glyph.d || ''; // check if d is undefined (for example, space char -- just need horizontal advance :-)
    var size = params.fontSize / params.unitsPerEm;

    //d = TextPath.DefTranslateAndScale(d, lastX, lastY, size, -size);
    // compute how far to advance horizontally to draw the next character
    var horizAdvX = glyph['horiz-adv-x'] || params.horizAdvX;
    horizAdvX = +(horizAdvX);
    var hkern = 0;
    var kernkey = uni+','+uniNext; 
    if (font.hkern[kernkey]) {
      hkern = +(font.hkern[kernkey]);
    }
    horizAdvX -= hkern;
    // letterSpacing is in pixels already, or if in ems, converted to pixels based on font size
    var dx = horizAdvX * size + (uniNext != '' ? params.letterSpacing : 0);

    callMe(d, size, dx, 0); // result outline def ("d"), dx, dy
  }
  public static textWidth(children: any, font: any, params: FontAndTextParams) {
    var lastX = 0;
    var lastY = 0;
    TextPath.walkChildren(children, font, params, lastX, lastY,
      (d, size, dx, dy) => {
        lastX += dx;
        lastY += dy;
      });
    return lastX;
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
              .join(' ').trim();
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
      var newCoords: number[] = [];
      while (coords && coords.length > 0) {
        let [a, b, c, d, e, f] = matrix;
        if (i === i.toLowerCase()) { // do not translate relative instructions :-)
          e = 0; f = 0;
        }
        let pushPoint = (x, y) => {
          newCoords.push(a*x + c*y + e);
          newCoords.push(b*x + d*y + f);
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
        // TODO is this stanza even necessary
        else if (i === 'q') {
          pushPoint(+(coords.shift()), +(coords.shift()));
          pushPoint(+(coords.shift()), +(coords.shift()));
        }
        // TODO: handle 'a,A' (elliptic arc curve) commands
        // cf. http://www.w3.org/TR/SVG/paths.html#PathDataCurveCommands
        // every other command -- M m L l c C s S Q q T t -- come in multiples of two numbers (coordinate pair (x,y))
        else {
          pushPoint(+(coords.shift()), +(coords.shift()));
        }
      }
      // chop of weird digits after ten decimal places, then convert back to 'succinct' representation (skip trailing 0's)
      // remove useless commas (when dash for negative is there to separate the numbers)
      ret.push(i + newCoords.map(x => +(+(x).toFixed(7))).join(',').replace(TextPath.CommaMinusRegex, '-'));
    });
    return ret.join('') + ' ';
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
