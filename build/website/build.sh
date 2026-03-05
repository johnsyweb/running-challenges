#!/usr/bin/env bash

# Set up tools variables
source build/tools.sh

# This script pushing the built copy of the this site to a staging repository

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

# Set the production flag
export JEKYLL_ENV=production

# Build the site
bundle install
bundle exec jekyll build --trace

# Print summary
echo "Built site, total size: `du -sh ${SITE_DIR}`"

# Initialise the git repo
cd ${SITE_DIR}
# Add a file to say that the site doesn't need building
touch .nojekyll

# Setup git to push to the staging repo
git init
# Add the target remote
git remote add production https://${RUNNING_CHALLENGES_GITHUB_TOKEN}@github.com/fraz3alpha/running-challenges.git
# Create a new branch, and commit all the code
git checkout -b gh-pages
git add -A
git commit -m 'CI build for production'
git log -1
git push --force production gh-pages
