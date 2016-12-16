class TSVG {
  public static Templates = {};
  public static translate(x, y) { return "translate("+x+", "+y+")"; }
  public static Helpers = {translate: TSVG.translate};
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
    return this.renderInner(0, {}).join('');
  }
  static bind(obj, fn): any {
    return function() {
        return fn.apply(obj, arguments);
    };
  }
  public static doChildren(indent, children, env) {
    var ret: Array<string> = [];
    for (var i = 0; i < children.length; i++) {
      //console.log('---');
      //console.log(this.children[i]);
      if (children[i].renderInner) {
        ret = ret.concat((children[i] as FakeElement).renderInner(indent + 1, env));
        ret.push('\n');
      }
      else { // XML, SVG, HTML can have text in there. Thanks again morons who made SGML = whitespace doesn't matter except when it does.
        ret.push((children[i] as string).trim()); // use text as is except strip whitespace... ? this will F up HTML... TODOx
      }
    }
    return ret;
  }
  renderInner(indent: number, env: {[k: string]: any}): Array<string> {
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
        var envNew = FakeElement.clone(env); // enforce scoping by copying cloning once, for all the children
        ret = ret.concat(FakeElement.doChildren(indent, this.children, envNew));
        ret.push(indentStr, '</', this.tagName, '>');
      }
    }
    else { // Component mode, or capitilized special guys...
      ret = ret.concat(this.tagName.renderSpecial(indent, env, this.attributes, this.children));
    }
    return ret;
  }
}

class React {
  public static createElement(tagName: string, attributes: any, ...children: Array<FakeElement>) {
    return new FakeElement(tagName, attributes, children);
  }
}

/*
class Let {
  public static renderSpecial(indent: number, env: any, attributes: any, children: Array<any>): Array<string> {
    if (!attributes && attributes.hasOwnProperty('name') && attributes.hasOwnProperty('value')) {
      throw "Let expects name='identifier' and value=some-JS-value";
    }
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    // TODO if children, make this variable only exist in scope of children.   OR: IDEA: make variable = the children
    //      else add to env (which caller will preserve nicely)
    var name = attributes.name;
    var value = attributes.value;
    console.error('OK -- added variable called "'+name+'" with value: '+value);

    // var ret = []; //indentStr];
    env[name] = value;
    // //ret.push('Let: TODO do something with attrs and children');
    // return ret;

    return FakeElement.doChildren(indent, children, env);
  }
}
*/

class For {
  public static renderSpecial(indent: number, env: any, attributes: any, children: Array<any>): Array<string> {
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
    return FakeElement.doChildren(Math.max(0, indent-1), newChildren, env);
  }
}
