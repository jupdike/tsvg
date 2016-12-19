// TODO make this a module and rearrange and put stuff where it goes, etc.

interface PairFunc {
  (a: any, b: any): any;
}
interface Array<T> {
  byPairs(): Array<T>;
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
