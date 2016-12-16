#!/bin/sh

# tsc --jsx react test.tsx && node test.js > test.svg

# convert a .tsvg file to .svg

one=`echo $1 | sed s/[.]tsvg//`
echo TODO $1

tsc tsvg.ts && node tsvg.js 
