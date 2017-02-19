# TSVG: Turing-complete SVG preprocessor, using JSX and JavaScript.

The "T" stands for:

- Turing-complete: use a real programming language whose syntax you know (JSX is easy to learn -- you already know JavaScript and XML). TSVG does not use string interpolation, but builds real light-weight trees with attributes and children at runtime, then serialzies to text strings which can be exported to .svg. TSVG is completely declarative and by embedding ES6 you get a concise, expressive functional language. Use helper tags like For and If, and helpers like @translate(x,y) to keep things concise.
- TextPath: use SVG fonts to render baked-out path outlines into your SVG, which will look the same on all devices -- the .svg file will have no external file dependencies. (The JS code that renders SVG will include a JSON-ified version of the SVG font(s). You can also whitelist a specific set of glyphs, reducing the output file size substantially.) <TextPath> mimics much of the API for SVG's <text> tag, including attributes and layout arithmetic, down to kerning and letter spacing.
- Templates: a compact way to 'write' JS template code, with variables that can be reassigned later, then call render() and get a new SVG at runtime -- in the browser (ES5) or in Node.js. Your code has no dependencies since the lightweight TSVG helper library is added to the generated JS. You can also combine multiple templates into one compiled file, resulting in only one copy of the TSVG helper code and fonts.

<hr/>

Notes:

(Eventually will probably replace use of TypeScript with Babel, pure JS)

FYI typescript type for a Dictionary<string, any> =    myKVDict: {[k: string]: any}
