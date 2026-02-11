---
name: Task
about: A specific piece of work
title: 'Refresh Node.js, Debian, and Terraform dependencies'
type: 'task'
assignees: ''

---

# What

Upgrade deployment infrastructure dependencies including Terraform, Debian base images, and platform support to current stable versions.

## Why

**Security and Maintenance:**
- **Node.js 20** has been superseded by Node.js 22 (current LTS), which includes important security updates and bug fixes
- **Terraform 0.11.14** (from April 2019) is over 6 years old and no longer receives security updates or bug fixes
- **Debian 10 (Buster)** reached end-of-life for regular support in August 2022 and only has extended LTS until June 2024
- **Debian 11 (Bullseye)** is approaching end-of-life and will lose regular support in 2026
- Using outdated infrastructure components creates security vulnerabilities and prevents access to bug fixes and improvements

**Modern Features and Performance:**
- **Node.js 22** includes V8 engine improvements, better performance, and native support for modern JavaScript features
- **Terraform 1.x** includes significant improvements in state management, performance, and error handling
- **HCL2 syntax** (introduced in Terraform 0.12) provides better type safety and clearer configuration
- **Debian 12 (Bookworm)** includes updated kernel (6.1 LTS), libraries, and security features
- Modern provider versions include important bug fixes and feature improvements

**Platform Support:**
- Current ARM64 architecture detection in the installation script is incomplete
- Growing adoption of ARM64 platforms (Apple Silicon, AWS Graviton, etc.) requires proper support

**Technical Debt:**
- The deployment configurations use Terraform 0.11 syntax which is no longer considered best practice
- Missing version constraints on providers can lead to unexpected behavior with provider updates
- Inconsistent quote usage and interpolation syntax makes configurations harder to maintain

## How

**Incremental Terraform Upgrade (0.11 → 1.14):**

Terraform cannot be upgraded directly from 0.11 to 1.14 in a single step due to breaking changes. The upgrade follows Terraform's recommended migration path:

1. **0.11 → 0.12:** Update HCL syntax to remove unnecessary string interpolations, add proper types
2. **0.12 → 0.13:** Add required_providers blocks with explicit provider sources
3. **0.13 → 0.14:** Update provider version constraints
4. **0.14 → 1.0:** Verify compatibility with Terraform 1.x
5. **1.0 → 1.14:** Update to latest stable version

Each step is a separate commit to allow bisection if issues arise.

**Configuration Changes:**

1. **Node.js and Debian Updates in Docker:**
   - Update all `FROM node:20-bullseye` to `FROM node:22-bookworm` in `Dockerfile.sdk`
   - Update `FROM golang:1.23-bullseye` to `FROM golang:1.23-bookworm`
   - This affects all build stages: cosmos-go, otel, cosmos-package, xsnap-package, build-js, and install

2. **Terraform Syntax Modernization:**
   - Remove unnecessary string interpolations: `"${var.name}"` → `var.name`
   - Update type declarations: `type = "list"` → `type = list(string)`
   - Add spacing around operators: `key=value` → `key = value`
   - Update resource references to attribute syntax: `"${resource.name.*.id}"` → `resource.name.*.id`

3. **Add Version Constraints:**
   - Create `versions.tf` files in each module
   - Specify `required_version = ">= 0.13"`
   - Define required providers with sources and version constraints
   - DigitalOcean: `~> 2.75.0`, Docker: `~> 2.25.0`

4. **Update Resources:**
   - Change DigitalOcean droplet image from `debian-10-x64` to `debian-12-x64`
   - Update Docker provider configuration for Terraform 2.x compatibility
   - Fix deprecated resource attributes (e.g., `tmpfs` block syntax)

5. **Platform Support:**
   - Update `install-deps.sh` to version 1.14.5
   - Improve ARM64 architecture detection for Linux and Darwin
   - Add Debian Trixie support mapping to Ubuntu Noble repositories

**Files to Modify:**
- `packages/deployment/Dockerfile.sdk` - Update Node.js to v22 and Debian to Bookworm
- `packages/deployment/scripts/install-deps.sh` - Update Terraform version and architecture detection
- `packages/deployment/src/init.js` - Update generated Terraform syntax
- `packages/deployment/terraform/**/*.tf` - Modernize all Terraform configurations
- `packages/deployment/terraform/**/versions.tf` - New files for version constraints

**Testing:**
- Build Docker images to verify Node.js 22 compatibility
- Verify `install-deps.sh` on x86_64 and ARM64 platforms
- Generate Terraform configurations with `init.js` and validate syntax
- Run `terraform plan` on generated configurations
- Test deployments with Docker and DigitalOcean providers (if available)

**Risks and Mitigations:**
- **Risk:** Node.js 22 compatibility issues with existing code
  - **Mitigation:** Node.js 22 maintains backwards compatibility with v20; minimal changes expected
- **Risk:** Terraform state incompatibility
  - **Mitigation:** Terraform 1.x can read and upgrade 0.11 state automatically
- **Risk:** Provider API changes
  - **Mitigation:** Use conservative version constraints (`~>` for minor version compatibility)
- **Risk:** Debian 12 compatibility issues
  - **Mitigation:** Only affects new deployments; existing instances continue running current OS

**Success Criteria:**
- [ ] Docker images build successfully with Node.js 22
- [ ] Terraform 1.14.5 installs successfully on all supported platforms
- [ ] Generated Terraform configurations use modern HCL2 syntax
- [ ] `terraform plan` executes without errors
- [ ] New Docker containers run Node.js 22
- [ ] New deployments create Debian 12 instances
- [ ] All existing Terraform state files remain compatible
