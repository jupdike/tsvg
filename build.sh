#!/bin/sh

mkdir -p lib
mkdir -p bin
(tsc --sourceMap src/tsvg-cli.ts src/FontSVG.ts src/tsvg-lib.ts src/prepend.ts && cp src/tsvg-lib.ts lib/ && cp src/prepend.ts lib/ && mv src/tsvg-cli.js* bin/ && mv src/FontSVG.js* bin/ && mv src/tsvg-lib.js* lib/ && mv src/prepend.js* lib/ && cp src/tsvg.js bin/tsvg && cp src/tsvg.js bin/tsvg.js && chmod +x bin/tsvg && chmod +x bin/tsvg.js)
