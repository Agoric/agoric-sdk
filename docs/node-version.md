# Node.js version

This repo supports the Active and Maintenance LTS versions of Node.js.

From https://nodejs.org/en/about/previous-releases:
> Major Node.js versions enter Current release status for six months, which gives library authors time to add support for them. After six months, odd-numbered releases (9, 11, etc.) become unsupported, and even-numbered releases (10, 12, etc.) move to Active LTS status and are ready for general use. LTS release status is "long-term support", which typically guarantees that critical bugs will be fixed for a total of 30 months. Production applications should only use Active LTS or Maintenance LTS releases.



## Updating

When a new version becomes Active LTS:
- [ ] update integrations to use it (e.g. `.github/workflows/integration.yml`)
- [ ] update the .node-version hint to use it
- [ ] update Node.js test ranges to remove the EOLed version and add the new LTS
- [ ] update package.json engines to allow the two LTS versions
- [ ] update README.md to document the new supported versions
- [ ] update repoconfig.sh to verify against the new supported versions
