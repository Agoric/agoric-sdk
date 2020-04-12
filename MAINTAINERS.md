# Maintainer Hints

```sh
# Create a release branch.
now=`date -u +%Y%m%dT%H%M%S`
git checkout -b release-$now
```

To generate a new alpha release, and CHANGELOG.md files:

```sh
# Generate CHANGELOG.md files and update packages to .alpha
yarn lerna version --no-push --conventional-prerelease
# Tell which packages need news.
scripts/need-news HEAD^ > needs-news.md
# Push the branch.
git push -u origin release-$now
# Make docker containers.
make -C packages/deployment docker-build docker-push
```

Then, create a release PR, pasting `needs-news.md` into the body.  If you need to do more work on the branch before the final release, fix, commit, and repeat the above section.

Have the relevant maintainers fill out the `NEWS.md` for their package and
commit it to the release branch.

To perform the release (and push all the git tags), do on the branch:

```sh
# Merge the NEWS.md changes.
git pull
# Create the final release CHANGELOGs and tags, and push.
yarn lerna version --conventional-graduate
```

Then you can run:

```sh
# Make and push docker containers (in a separate terminal).
make -C packages/deployment docker-build docker-push
# Build all package generated files.
yarn install
yarn build
# Pulblish to NPM.
yarn lerna publish from-package
```

Merge the release PR into master.  DO NOT REBASE OR SQUASH OR YOU WILL LOSE YOUR TAGS.

## More subtlety

To get help for the command-line options that will affect these commands, use:

```sh
yarn lerna version --help
yarn lerna publish --help
```

Useful testing commands are:

```sh
yarn lerna version --conventional-prerelease --no-git-tag-commit
```
