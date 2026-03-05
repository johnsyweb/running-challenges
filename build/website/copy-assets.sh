#!/usr/bin/env bash

# Enable exit on failure
set -e

echo "Copying shared resources to the website folder"

echo "Copying badges to website img/badges directory"
mkdir -p website/img/badges
cp -r images/badges/256x256/*.png website/img/badges/

echo "Copying flags to website img/flags directory"
mkdir -p website/img/flags
cp -r images/flags/twemoji/png/*.png website/img/flags/

echo "Copying logos to website img/logo directory"
mkdir -p website/img/logo
cp -r images/logo/*.png website/img/logo/

echo "Copying screenshots to website img/screenshots directory"
mkdir -p website/img/screenshots
cp -r images/screenshots/*.png website/img/screenshots/

echo "Copying third party Javascript libraries into the assets directory"
mkdir -p website/assets/js/lib/third-party/
JQ_NM="browser-extensions/extension/node_modules/jquery/dist"
mkdir -p website/assets/js/lib/third-party/jquery
cp "$JQ_NM/jquery.min.js" website/assets/js/lib/third-party/jquery/jquery-3.6.0.js
L_NM="browser-extensions/extension/node_modules/leaflet/dist"
mkdir -p website/assets/js/lib/third-party/leaflet
cp "$L_NM/leaflet.js" website/assets/js/lib/third-party/leaflet/leaflet-1.3.1.js
D3_NM="browser-extensions/extension/node_modules/d3-voronoi/dist"
mkdir -p website/assets/js/lib/third-party/d3-voronoi
cp "$D3_NM/d3-voronoi.js" website/assets/js/lib/third-party/d3-voronoi/d3-voronoi.js
cp -r js/lib/third-party/leaflet-canvasicon website/assets/js/lib/third-party/
cp -r js/lib/third-party/leaflet-extramarkers website/assets/js/lib/third-party/
cp -r js/lib/third-party/leaflet-fullscreen website/assets/js/lib/third-party/
cp -r js/lib/third-party/leaflet-markercluster website/assets/js/lib/third-party/
cp -r js/lib/third-party/leaflet-piechart website/assets/js/lib/third-party/

echo "Copying third party CSS libraries into the assets directory"
# Copy the required third party libraries from the top level shared project dir
mkdir -p website/assets/css/third-party/
mkdir -p website/assets/css/third-party/leaflet
cp "$L_NM/leaflet.css" website/assets/css/third-party/leaflet/
cp -r "$L_NM/images" website/assets/css/third-party/leaflet/
LEM_DIST="browser-extensions/extension/node_modules/leaflet-extra-markers/dist"
mkdir -p website/assets/css/third-party/leaflet-extramarkers/images
cp "$LEM_DIST/css/leaflet.extra-markers.min.css" website/assets/css/third-party/leaflet-extramarkers/leaflet.extra-markers.css
sed 's|url("../img/|url("images/|g' website/assets/css/third-party/leaflet-extramarkers/leaflet.extra-markers.css > website/assets/css/third-party/leaflet-extramarkers/leaflet.extra-markers.css.tmp && mv website/assets/css/third-party/leaflet-extramarkers/leaflet.extra-markers.css.tmp website/assets/css/third-party/leaflet-extramarkers/leaflet.extra-markers.css
cp "$LEM_DIST/img/"*.png website/assets/css/third-party/leaflet-extramarkers/images/
cp -r css/third-party/leaflet-fullscreen website/assets/css/third-party/
cp -r css/third-party/leaflet-markercluster website/assets/css/third-party/
