#!/usr/bin/env bash

# Set up tools variables
source build/tools.sh

# This script pushing the built copy of the this site to a staging repository

JEKYLL_PORT=${JEKYLL_PORT:-4000}

# Use this to make a file that won't be cached if we changed the contents.
# RUNNING_CHALLENGES_DATA_COMMIT=`cd running-challenges-data && git rev-parse HEAD`

# Enable exit on failure
set -e

BUILD_WEBSITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$BUILD_WEBSITE_DIR/copy-assets.sh"

# echo "Copying data to website"
# mkdir -p website/assets/js/lib/data
# export DATA_GEO_JS="website/assets/js/lib/data/geo-${RUNNING_CHALLENGES_DATA_COMMIT}.js" && echo "var parkrun_data_geo = " > "${DATA_GEO_JS}" && cat running-challenges-data/data/parkrun-geo/parsed/geo.json >> "${DATA_GEO_JS}"
# export DATA_SPECIAL_EVENTS_JS="website/assets/js/lib/data/special-events-${RUNNING_CHALLENGES_DATA_COMMIT}.js" && echo "var parkrun_data_special_events = " > "${DATA_SPECIAL_EVENTS_JS}" && cat running-challenges-data/data/parkrun-special-events/2019-20/parsed/all.json >> "${DATA_SPECIAL_EVENTS_JS}"

# Replace the placeholders in the map includes, there is probably a better way to do this
# ${SED} -i "s/data\/geo-.*.js/data\/geo-${RUNNING_CHALLENGES_DATA_COMMIT}.js/" website/_pages/map.md
# ${SED} -i "s/data\/special-events-.*.js/data\/special-events-${RUNNING_CHALLENGES_DATA_COMMIT}.js/" website/_pages/map.md
# originally based on https://jekyllrb.com/docs/continuous-integration/

# Move into the website directory
cd website

SITE_DIR=_site

# Clear out the build directory
rm -rf ${SITE_DIR} && mkdir ${SITE_DIR}

docker run --rm --name jekyll \
-p ${JEKYLL_PORT}:4000 \
-v `pwd`:/srv/jekyll \
-v `pwd`/vendor/bundle:/usr/local/bundle \
jekyll/jekyll jekyll serve --future --trace

# Print summary
echo "Built site, total size: `du -sh ${SITE_DIR}`"
