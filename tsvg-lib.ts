class TSVG {
  public static Templates = {};
  public static translate(x: string, y: string) { return `translate(${x}, ${y})`; }
  public static line(x1: string, y1: string, x2: string, y2: string, opts: { [k: string]: any; }) {
    return FakeElement.creator('line', { x1: x1, y1: y1, x2: x2, y2: y2 }, {'stroke-width': 1, stroke: "black" }, opts);
  }
  public static closedPolyPath(opts: { [k: string]: any; }, ...d: string[]) {
    if (d.length < 4) {
      throw "Expected at least 4 scalars in coordinate list";
    }
    var d2 = d.slice(2);
    var data = `M ${d[0]} ${d[1]} ` + d2.byPairs().map(one => `L ${one[0]} ${one[1]}`).join(' ') + ' z';
    return FakeElement.creator('path', {d: data }, {'stroke-width': 1, stroke: "black"}, opts);
  }
  public static Helpers = {
    closedPolyPath: TSVG.closedPolyPath,
    translate: TSVG.translate,
    line: TSVG.line
  };
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
  public static clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
      copy = new Date();
      copy.setTime(obj.getTime());
      return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
      copy = [];
      for (var i = 0; i < obj.length; i++) {
          copy[i] = FakeElement.clone(obj[i]);
      }
      return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
      copy = {};
      for (var attr in obj) {
          if (obj.hasOwnProperty(attr)) copy[attr] = FakeElement.clone(obj[attr]);
      }
      return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
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
      //console.log(this.children[i]);
      if (children[i].renderInner) {
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

    // run the for loop on each child in order
    var newChildren = [];
    children.forEach(kid => {
      for (var i = attributes.from; i <= attributes.upTo; i++) {
        newChildren.push( kid(i) );
      }
    });
    return FakeElement.doChildren(Math.max(0, indent-1), newChildren);
  }
}
