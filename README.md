# README #

FYI typescript type for a Dictionary<string, any> =    myKVDict: {[k: string]: any}

TSVG: Turing-complete SVG preprocessor, using JSX and TypeScript.
(Eventually will probably replace use of TypeScript with Babel, pure JS)

The "T" stands for:
- Turing-complete: use a real programming language whose syntax you know (JSX is easy to learn). TSVG does not use string interpolation, but builds real light-weight trees with attributes and children at runtime, then serialzies to text strings which can be exported to .svg, etc.
- Templates: compact way to 'write' JS template code, with variables that can be reassigned later, then call render() and get a new SVG at runtime -- in the browser (ES5) or in Node.js. Your code has no dependencies since the lightweight TSVG helper library is added to the generated JS.
- Text paths: use SVG fonts to render baked-out path outlines into your SVG, which will look the same on all devices -- the .svg file will have no external file dependencies. (The JS code that renders SVG will include a JSON-ified version of the SVG font(s).)

### What is this repository for? ###

* Quick summary
* Version
* [Learn Markdown](https://bitbucket.org/tutorials/markdowndemo)

### How do I get set up? ###

* Summary of set up
* Configuration
* Dependencies
* Database configuration
* How to run tests
* Deployment instructions

### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact