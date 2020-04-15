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
# Make docker containers to test the build.
make -C packages/deployment docker-build
```

Then, create a release PR, pasting `needs-news.md` into the body.  If you need to do more work on the branch before the final release, fix, commit, and repeat the above section.

Have the relevant maintainers fill out the `NEWS.md` for their package and
commit it to the release branch.

To prepare the release version, do on the branch:

```sh
# Merge the NEWS.md changes.
git pull
# Create the final release CHANGELOGs and tags, and push.
yarn lerna version --no-push --conventional-graduate
git push
```

Then you can run the following :

```sh
# Build all package generated files.
yarn install
yarn build
# Publish to NPM. NOTE: You may have to repeat this several times if there are failures.
yarn lerna publish from-package
# Push the released non-alpha tags:
./scripts/get-released-tags | xargs git push origin
```

Merge the release PR into master.  DO NOT REBASE OR SQUASH OR YOU WILL LOSE REFERENCES TO YOUR TAGS.

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
