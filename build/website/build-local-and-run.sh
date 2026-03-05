#!/usr/bin/env bash
set -e

JEKYLL_PORT=${JEKYLL_PORT:-4000}

BUILD_WEBSITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$BUILD_WEBSITE_DIR/copy-assets.sh"

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
