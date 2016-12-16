class TSVG {
  public static Templates = {};
}

class FakeElement {
  public static addSlashes(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  }
  /* TODO come back and make attribs: whatever to make {string: string} ? */
  constructor(public tagName: any, public attributes: { [k: string]: string; },
    public children: Array<any>) {
  }
  public render(): string {
    return this.renderInner(0).join('');
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
        for (var i = 0; i < this.children.length; i++) {
          //console.log('---');
          //console.log(this.children[i]);
          if (this.children[i].renderInner) {
            ret = ret.concat((this.children[i] as FakeElement).renderInner(indent + 1));
            ret.push('\n');
          }
          else { // XML, SVG, HTML can have text in there. Thanks again morons who made SGML = whitespace doesn't matter except when it does.
            ret.push((this.children[i] as string).trim()); // use text as is except strip whitespace... ? this will F up HTML... TODOx
          }
        }
        ret.push(indentStr, '</', this.tagName, '>');
      }
    }
    else {
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

class Var {
  public static renderSpecial(indent: number, attributes: any, children: Array<any>): Array<string> {
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    var ret = [indentStr];
    ret.push('Var: TODO do something with attrs and children');
    return ret;
  }
}

class For {
  public static renderSpecial(indent: number, attributes: any, children: Array<any>): Array<string> {
    var indentStr = '';
    for (var i = 0; i < indent; i++) {
      indentStr += '  '; // 2 spaces per indent
    }
    var ret = [indentStr];
    ret.push('For: TODO do something with attrs and children');
    return ret;
  }
}
