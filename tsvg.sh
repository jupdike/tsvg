#!/bin/bash

# tsc --jsx react test.tsx && node test.js > test.svg

# convert a .tsvg file to .svg

if [ -z "$1" ]; then
    echo Expected argument: infile.tsvg
    exit 1
fi
one=`echo $1 | sed s/[.]tsvg//`
tsc --sourceMap tsvg.ts tsvg-lib.ts prepend.ts && node tsvg.js $one.tsvg
tsc --sourceMap --jsx react $one.tsx && node $one.js > $one.svg
