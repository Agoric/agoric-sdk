<!-- < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < ☺
v                               ✰  Thanks for creating a PR! ✰
☺ > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > >  -->

closes: #XXXX
refs: #XXXX

## Description

This PR upgrades deployment infrastructure dependencies to their latest stable versions:

**Terraform Upgrade (0.11.14 → 1.14.5)**
- Updated Terraform version from 0.11.14 to 1.14.5 through incremental version upgrades (0.12, 0.13, 0.14, 1.0, 1.14)
- Modernized Terraform configuration syntax to HCL2 (0.12+ syntax):
  - Removed string interpolations where unnecessary (e.g., `"${var.name}"` → `var.name`)
  - Updated type declarations (e.g., `type = "list"` → `type = list(string)`)
  - Added proper spacing around operators (e.g., `key=value` → `key = value`)
  - Converted old-style resource references to modern attribute syntax
- Added `versions.tf` files to specify required provider versions and sources
- Updated provider version constraints:
  - DigitalOcean provider: `~> 2.75.0` (from implicit v1.4)
  - Docker provider: `~> 2.25.0` (from implicit version)

**Debian Upgrade (10 → 12)**
- Updated DigitalOcean droplets from `debian-10-x64` to `debian-12-x64`
- Added support for Debian Trixie in the install script (maps to Ubuntu Noble)

**Node.js/Architecture Support**
- Improved ARM64 architecture detection and support in Terraform installation script
- Added proper arm64 support for Linux and Darwin platforms

**Files Modified:**
- `packages/deployment/scripts/install-deps.sh` - Updated Terraform version and improved platform detection
- `packages/deployment/src/init.js` - Updated Terraform syntax generation to use modern HCL2
- `packages/deployment/terraform/**/*.tf` - Modernized all Terraform configurations across all providers (digitalocean, docker, heroku)

### Security Considerations

This upgrade addresses potential security vulnerabilities in outdated infrastructure dependencies:

- **Terraform 0.11.14** (from 2019) is 6 years old and no longer receives security updates. Upgrading to 1.14.5 ensures we have the latest security patches.
- **Debian 10 (Buster)** reached end-of-life for regular support in 2022. Upgrading to Debian 12 (Bookworm) ensures systems receive current security updates.
- Updated provider versions use modern, maintained versions that receive active security support.

The changes maintain the same authentication and authorization model but benefit from security improvements in the newer versions. All provider configurations explicitly specify version constraints, preventing unintended upgrades to incompatible versions.

### Scaling Considerations

These upgrades improve scaling capabilities:

- Terraform 1.14 includes performance improvements for large-scale deployments with better state management and parallel operations
- Debian 12 includes kernel and system library updates that improve resource efficiency
- Modern provider versions include optimizations for handling larger numbers of resources

No significant increase in resource consumption is expected. The Terraform state management improvements may actually reduce memory usage for large deployments.

### Documentation Considerations

**Backwards Compatibility:**
- Existing Terraform state files will need to be migrated when upgrading. Terraform 1.x can automatically upgrade state from 0.11-0.14.
- The HCL syntax changes are not backwards compatible with Terraform 0.11.x, so downgrades are not possible.
- Existing deployments can continue to run, but new deployments or modifications will require Terraform 1.14+.

**Upgrade Path:**
- Users running deployment scripts will need to install Terraform 1.14.5 (handled automatically by `install-deps.sh`)
- Existing Terraform deployments should run `terraform init -upgrade` to update provider plugins
- No data migration is required for the Debian upgrade as this only affects newly provisioned droplets

**Documentation Updates Needed:**
- Update deployment documentation to reflect Terraform 1.14.5 requirement
- Document the Debian 12 base image change
- Note ARM64 platform support improvements

### Testing Considerations

**Unit Tests:**
- The Terraform configuration changes are declarative and syntax-focused
- Manual verification of generated Terraform files from `init.js` confirms correct HCL2 syntax

**Integration Testing:**
- Should test deployment with both DigitalOcean and Docker providers
- Verify Terraform state initialization and provider plugin installation
- Test on both x86_64 and ARM64 platforms to confirm architecture detection

**Required Tests:**
- [ ] Run `install-deps.sh` on x86_64 Linux
- [ ] Run `install-deps.sh` on ARM64 Linux/macOS
- [ ] Initialize a new deployment with `init.js` and verify generated Terraform syntax
- [ ] Run `terraform plan` with generated configurations
- [ ] Test Docker provider deployment
- [ ] Test DigitalOcean provider deployment (if API access available)

### Upgrade Considerations

**Production Deployment:**

This change affects infrastructure provisioning only, not the runtime behavior of deployed applications. The upgrade has two distinct impacts:

1. **Development/Deployment Tooling** (immediate):
   - Developers and CI systems running deployment scripts will automatically get Terraform 1.14.5
   - First run after upgrade will download new provider plugins
   - Existing Terraform state remains compatible (Terraform handles migration automatically)

2. **Newly Provisioned Infrastructure** (on next deployment):
   - New DigitalOcean droplets will use Debian 12 instead of Debian 10
   - Existing running instances are not affected and do not need to be reprovisioned
   - When instances are eventually reprovisioned, they benefit from Debian 12's improvements

**Verification Steps:**
- Verify Terraform version: `terraform version` should show v1.14.5
- Run `terraform init -upgrade` in deployment directories
- Execute `terraform plan` to ensure no unexpected changes
- For new deployments, verify droplets are created with debian-12-x64 image

**Rollback Considerations:**
- Rolling back Terraform to 0.11 after using 1.14 is not supported due to state format changes
- If issues arise, pin to a specific Terraform 1.x version rather than reverting to 0.11
- Debian version can be manually adjusted in Terraform configs if needed (not recommended)

**Risk Assessment:**
- Low risk for existing deployments (no changes to running infrastructure)
- Medium risk for new deployments (new OS version and Terraform syntax)
- Mitigated by incremental Terraform version upgrades in commit history, allowing bisection if needed
