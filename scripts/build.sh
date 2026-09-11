#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist/client/assets dist/server

cp index.html research.html publications.html teaching.html service.html privacy.html analytics.html 404.html dist/client/
cp style.css analytics.css analytics.js robots.txt photo.pic.jpg .nojekyll dist/client/
cp assets/favicon.svg assets/og-card.png dist/client/assets/
cp -R assets/vendor dist/client/assets/
cp worker.js dist/server/index.js
