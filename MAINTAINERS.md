# Maintainer Hints

To tag, commit, and push to Github new semver package.json version number changes (and `CHANGELOG.md`), use:

```sh
yarn lerna version --conventional-prerelease
```

If you instead you want to create a non-prerelease version, use:

```sh
yarn lerna version --conventional-graduate
```

Then you can run:

```sh
yarn lerna publish
```

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
