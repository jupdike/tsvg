// TODO make this a module and rearrange and put stuff where it goes, etc.

interface PairFunc {
  (a: any, b: any): any;
}
interface Array<T> {
  byPairs(): Array<T>;
  flatten(): Array<T>;
}
Array.prototype.flatten = function(this) {
  return [].concat(...this)
}
Array.prototype.byPairs = function() {
  if (this.length % 2 != 0) {
    throw "Expected at least 4 scalars in coordinate list";
  }
  var ret: any[] = [];
  for (var i = 0; i < this.length / 2; i++) {
    var x = i*2;
    var p = [this[x+0], this[x+1]];
    ret.push(p);
  }
  return ret;
};

/*
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
*/
