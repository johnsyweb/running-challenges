#!/usr/bin/env bash
source build/tools.sh
set -e

BUILD_WEBSITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$BUILD_WEBSITE_DIR/copy-assets.sh"

# Move into the website directory
cd website

SITE_DIR=_site

# Clear out the build directory
rm -rf ${SITE_DIR} && mkdir ${SITE_DIR}

# Staging-specific config
echo "staging.running-challenges.co.uk" > CNAME
sed -i -e 's/https:\/\/www.running-challenges.co.uk/https:\/\/staging.running-challenges.co.uk/' _config.yml
sed -i -e 's/Running Challenges/Running Challenges - Staging/' _config.yml

# Build the site
bundle install
bundle exec jekyll build --trace --future

# Print summary
echo "Built site, total size: `du -sh ${SITE_DIR}`"

# Initialise the git repo
cd ${SITE_DIR}
# Add a file to say that the site doesn't need building
touch .nojekyll

# Setup git to push to the staging repo
git init
# Add the target remote
git remote add staging https://${RUNNING_CHALLENGES_GITHUB_TOKEN}@github.com/fraz3alpha/running-challenges-staging.git
# Create a new branch, and commit all the code
git checkout -b gh-pages
git add -A
git commit -m 'CI build for staging'
git log -1
git push --force staging gh-pages
