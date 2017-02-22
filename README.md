# TSVG: Turing-complete SVG preprocessor, using JSX and JavaScript.

## Features and Benefits

The "T" stands for:

- **Turing-complete**: use a real programming language whose syntax you know (JSX is easy to learn -- you already know JavaScript and XML). TSVG does not use string interpolation, but builds real light-weight trees with attributes and children at runtime, then serialzies to text strings which can be exported to .svg. TSVG is completely declarative and by embedding modern JS (ES6) into SVG you get a concise, expressive functional language. Use helper tags like For and If, and helpers like @translate(x,y) to keep things concise.
- **TextPath**: use SVG fonts to render baked-out path outlines into your SVG, which will look the same on all devices -- the .svg file will have no external file dependencies. (The JS code that renders SVG will include a JSON-ified version of the SVG font(s). You can also whitelist a specific set of glyphs, reducing the output file size substantially.) &lt;TextPath&gt; mimics much of the API for SVG's &lt;text&gt; tag, including attributes and layout arithmetic, down to kerning and letter spacing.
- **Templates**: a compact way to 'write' JS template code, with variables that can be reassigned later, then call render() and get a new SVG at runtime -- in the browser (ES5) or in Node.js. Your code has no dependencies since the lightweight TSVG helper library is added to the generated JS. You can also combine multiple templates into one compiled file, resulting in only one copy of the TSVG helper code and fonts. Combined with TexPath, this is a powerful way to add professional, dynamic typography to the SVG parts of your applications.

- - -

## Installation

TSVG is built with Node.js. Install with:

    npm install -g tsvg

to access the command-line tool from anywhere on your system, or for local use in a given project,

    npm install --save tsvg

and look for <code>node_modules/tsvg/bin/tsvg</code>.

## Introduction

TSVG is (nearly) a superset of SVG (including allowing attributes like xmlns:xlink="whatever", a hack to work around limitations in JSX). This means (with a few caveats, read below) that you can rename .svg files to .tsvg and compile them with the <code>tsvg</code> command-line tool and get back essentially the same .svg file.

TSVG augments SVG with JavaScript code via <a href="https://facebook.github.io/react/docs/jsx-in-depth.html">JSX</a>. (TSVG provides its own React.createElement implementation, which creates nested FakeElements, which have a .render() method that can be used to get SVG back out of the in-memory trees. This React class and other helpers are not added to the global scope but everything is hygenic.) This is not a hacked together, string-concatenation-based approach to creating SVG, but a grammatical, structural, purely-functional, tree-based approach.

When you create a TSVG file, you are creating a pure JavaScript function that takes an (optional) object with key value
pairs and, by calling .render(), returns a string of SVG. This works in the browser or on the server.

## Basic "precprocessor" approach

TSVG embeds the expressive parts of JS, allowing anything from lightweight use to heavy use of JavaScript. For example

    <svg id="kb-svg-horiz" class="kb-bottom" version="1.1" xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="800" height="800"
        viewBox="0 0 800 800" preserveAspectRatio="xMidYMid none">
      <line x1="0" y1="200" x2="780" y2="200"/>
      <line x1="0" y1="400" x2="780" y2="400"/>
      <line x1="0" y1="600" x2="780" y2="600"/>
    </svg>

could become

    <svg id="kb-svg-horiz" class="kb-bottom" version="1.1" xmlns="http://www.w3.org/2000/svg" 
        xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="800" height="800"
        viewBox="0 0 800 800" preserveAspectRatio="xMidYMid none">
      <line x1="0" y1={200*1} x2="780" y2={200*1} />
      <line x1="0" y1={200*2} x2="780" y2={200*2} />
      <line x1="0" y1={200*3} x2="780" y2={200*3} />
    </svg>

JavaScript code is introduced as the right-hand side of an equals sign on an attribute with <code>{code}</code> instead of <code>"str"</code>. (When the render code walks the tree, this double/number gets converted to a string.) JavaScript code is introduced as a child with

    <rect x="" ... />
    {@callMyFunction(arg1, arg2, arg3)}
    <rect x="" ... />

But where do such <code>@callMyFunction</code> methods live?

## @abc =&gt; this.abc

Stealing an idea from Coffeescript, we use <code>@abc</code> as syntax sugar for <code>this.abc</code>. TSVG's built-in library helper methods (translate, lines, makeStyle, etc.) are added to the <code>this</code> object context when your generated JavaScript code is called, before render is called. So

    <rect x="" ... />
    {@lines([...])}
    <rect x="" ... />

can call the built-in helper <code>lines(..)</code>

## Define your own "global" (const) parameters and helpers

### @abc = "my variable";

Using <code>@abc = arbitrary("JavaScript", "goes", here");</code> you can make your own 'global' constants and helpers.

    <svg id="kb-svg-horiz" class="kb-bottom" version="1.1" xmlns="http://www.w3.org/2000/svg" 
        xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="800" height="800"
        viewBox="0 0 800 800" preserveAspectRatio="xMidYMid none">
      @verticalGap = 200;
      <line x1="0" y1={@verticalGap*1} x2="780" y2={@verticalGap*1} />
      <line x1="0" y1={@verticalGap*2} x2="780" y2={@verticalGap*2} />
      <line x1="0" y1={@verticalGap*3} x2="780" y2={@verticalGap*3} />
    </svg>

To make a helper, use arrow syntax on the right hand side:

    <svg id="kb-svg-horiz" class="kb-bottom" version="1.1" xmlns="http://www.w3.org/2000/svg" 
        xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="800" height="800"
        viewBox="0 0 800 800" preserveAspectRatio="xMidYMid none">
      @verticalGap = 800;
      @lineMaker = yIndex => <line x1="0" y1={@verticalGap * yIndex} x2="780" y2={@verticalGap * yIndex} />;
      {@lineMaker(1)}
      {@lineMaker(2)}
      {@lineMaker(3)}
    </svg>

The semicolon used to declare a constant is required, but do not put semicolons in calls to <code>@lineMaker(3)</code> because it is an expression, not a statement. Notice also that the yIndex variable is local to that function, so is not prefixed with @. Notice also that <code>&lt;tag attr1="whatever" attr2="wherever"/&gt;</code> is valid JavaScript code that can be used anywhere a tag can be used.

## For

Continuing the running example, you can use the For component (built-in tag) as follows:

    <svg id="kb-svg-horiz" class="kb-bottom" version="1.1" xmlns="http://www.w3.org/2000/svg" 
        xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="800" height="800"
        viewBox="0 0 800 800" preserveAspectRatio="xMidYMid none">
      @verticalGap = 800;
      @lineMaker = yIndex => <line x1="0" y1={@verticalGap * yIndex} x2="780" y2={@verticalGap * yIndex} />;
      <For from="1" upTo="3">
        {i => @lineMaker(i)}
        {i => @rectMaker(i)}
      </For>
    </svg>

Each function is invoked with the loop variable (which has no name besides the one you give it in the arrow function) and the results inserted as children. You can also nest For loops.

Note that the upTo argument is inclusive of the value. Also note that these strings are converted to numbers before the loop starts, and you can put <code>&lt;For from={0} upTo={@x-1}&gt;</code> or any other JavaScript code, as you would expect.

(You cannot mutate 'global' @parameters because they are pulled out long before the code is run. You can define @parameters more than once, but the last definition wins. Recursion is unsupported and untested.)

## Templates

Your generated JS code can be called with

    window.TSVG.Templates['my-file-name']({'abc': 123, 'efg': 456}).render();

in order to pass parameters to your TSVG code. (It is recommended to put in default values for @abc and @efg so you can generate SVG directly without changing specific the parameters external, making development and testing easier.)

### Template / parameters Caveat

Your parameters can depend on each other, but the order of the generated code is:

    this['helper'] = ...;   // from TSVG library helpers
    this['abc'] = ...;      // from your TSVG file
    this['abc'] = ...       // from the call, as above

This allows the call to the JS code to override the TSVG file, but in order for @parameter code to depend on each other, wrap it in an arrow:

    @height = 800;
    @quarter = () => +(@height) / 4;
    <line x={@quarter()} ... >

This is a limitation of JavaScript not being a <a href="http://haskell.org/">lazy, purely functional</a> language.

In addition, in order to handle string arguments as numbers, convert them to doubles/numbers as in:

<code>
    +(expressionThatCouldBeAStringButAlsoANumber)
</code>

## TextPath, Font

Here is a simple example of the drop-in SVG <code>&lt;text&gt;</code> replacement tag, TextPath:

    <svg id="kb-svg-horiz" class="kb-bottom" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="600" height="180" viewBox="0 0 600 180">
      <Font path='./svg-fonts/firasanscondensed-bold.svg'/>
      <TextPath
        x="300" y="120"
        font-size="100"
        letter-spacing="0"
        text-anchor="middle"
        font-id="FiraSansCondensed-Bold"
        style="fill: orange"
        >Hello World</TextPath>
      <text
        x="300" y="120"
        font-size="100"
        letter-spacing="0"
        text-anchor="middle"
        font-family="Fira Sans Condensed"
        weight="bold"
        fill="transparent" stroke="black" stroke-width="1px" 
        >Hello World</text>
    </svg>

If the Font path attribute starts with a . or .., the path of the current .tsvg file is prepended.

You can also whitelist characters, in order to keep the output .JS files small:

    <Font white-list-chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ,.; ' path='./svg-fonts/firasanscondensed-bold.svg'/>

Notice that you cannot put a newline inside this tag between white-list-chars and path and you must put white-list-chars first (if present) and you must match the single or double quote marks, due to limitations in the Font Regex-based preprocessor.

The Font tag will parse the .svg font file specified by path, as XML, and convert it to a normalized .JSON representation. TSVG will cache this as font-abcdef1234567890.json to speed up subsequent runs of <code>tsvg</code>. (The hash includes the contents of the file and the white listed characters, if any, so should be stable.)

The TextPath tag uses the same attributes as the <a href="">SVG text tag</a>, including those in the example above, as well as letter-spacing. (Ligatures like fi ff are supported, but not when letter-spacing is used. This matches the text tag) The TextPath-specific attribute font-id is mandatory (to know which font to use) but could later use the same system as the text tag, with family and weight.

In order to convert .otf and .ttf fonts to .svg fonts, just search online for converters, or use <a href="https://fontforge.github.io/en-US/">FontForge</a> at home. (FF's UI is terrible on the Mac, so I use it from the command-line. YMMV.) Remember that professional fonts have license restrictions, so good luck with that.

## Caveats

(!) do not put newlines inside of attributes, for example <code>&lt;path d="whatever NEWLINE whatever"/&gt;</code> because it will not parse correclty. This is a limitation of JSX.

(!) do not include <code>&lt;!DOCTYPE&gt;</code> or <code>&lt;?xml ...&gt;</code> -- just remove them completely. The generated JSX code looks like: <code>TSVG.Templates['my-file-name'] = &lt;svg ...&gt;</code> before it is compiled to vanilla JS, so this must be exactly one tag!

(!) @xyz = rhs; -- right hand side cannot have ; characters, even inside a string. Use @makeStyle({a: b, c: d}) instead.

(!) Quirk of parsing Font tags: only these four forms work!

    <Font path="" />
    <Font white-list-chars="" path="" />  (not path followed by white-list-chars)
    <Font path='' />
    <Font white-list-chars='' path='' />  (don't mix single and double quotes)

## Helper Methods

<code>
    @translate(x: string, y: string)
    @rotate(x: string, ox=0, oy=0)
    @line(x1: string, y1: string, x2: string, y2: string, opts: { [k: string]: any; })
    @with(obj1: any, key: string, rhs: any)
    @closedPolyPath(opts: { [k: string]: any; }, d: string[])
    @lines(opts: { [k: string]: any; }, pointPairs: Array<[any, any, any, any]>)
    @range(a: number, b: number = undefined)
    @flatten(array: any)
    @makeStyle(kvs)
    @textWidthHelper(fontId: string, fontSize: number, style: any, textStr: string): number
</code>

## Command-line arguments

    Examples

      $ tsvg input.tsvg                        1. Convert input.tsvg to input.svg.
      $ tsvg input2.tsvg -a width:100          2. Convert input2.tsvg to input2.svg; pass argument "@width" as "100".
      $ tsvg *.tsvg -o tsvg-all.js -g window   3. Convert multiple .tsvg files to one .js file (can call
                                               window.TSVG.Templates["fname"]({additional: "args"}).render() to generate SVG
                                               string).         

    Options

      -h, --help                print this usage help and exit
      -k, --keep                do not delete .js.map, .js and .tsx temp files (.tsvg -> .tsx -> .js ->
                                .svg); overwrite them if they exist (default is to delete upon success, and
                                to bail if those files exist -- so as not to delete anything important)
      -s, --src file.tsvg ...   (default if no flag specified) the input .tsvg files to process; by default
                                x.tsvg will output x.svg (see --output below)
      -a, --args k:v ...        one or more k:v pairs passed to the template, where @k takes the value v,
                                e.g.  tsvg --arg k:v  results in {k: 'v'}  passed to template
      -q, --quiet               produce no .svg ouput; generated .js code does not call
                                console.log(TSVG.Templates[<mine>]().render());  as is the default, for
                                generating .svg files
      -o, --output to/file.js   combine all .js code from all .tsvg src files into a single .js file, instead
                                of generating .svg file(s); turns on --quiet as well
      -g, --global string       define the global object to attach templates code to; for example  --global
                                window generates code   window['TSVG'] = TSVG;  this turns on --quiet as well
      -d, --dev                 a special flag for development, to force TypeScript files to be recompiled
                                each time tsvg binary runs

## Future Work

- More interesting, better examples -- as a sort of test suite

- Gallery of awesome examples

- <code>&lt;If&gt;</code> tag would be easy and useful -- include or not include based on

    <If cond={JavaScript code here}>
       ...
    </If>

- TextPath could use font-family and weight to find the right font-id instead of the current method, which is more confusing since you have to check the .svg font file for the right font-id string.

- TextPath could maybe have some way to use alternate glyphs (lower v. upper case numbers, etc.)

- replace TypeScript with custom Bablyon parser to fix all the parsing issues (esp. ; in right-hand side of @abc = rhs; and quoted @ symbols getting turned into this.)

- improve error reporting significantly, esp. by making sure new babelscript based TSVG system would correctly carry source maps through from .tsvg to .js so figuring

## Shout Out

- TSVG's approach to parsing and rendering SVG fonts (especially creating transformed path objects) is based on a partial port of <a href="https://github.com/kartsims/easysvg">EasySVG.php</a>, although TSVG's TextPath supports the hkern attribute and is more accurate.
