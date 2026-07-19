# Publishing @hivehub/rulebook

Releases publish to npm via **Trusted Publishing (OIDC)** from GitHub Actions —
no npm tokens exist anywhere. The workflow is
[`.github/workflows/release.yml`](../.github/workflows/release.yml); it fires
on version tags (`v*`), verifies the tag matches `package.json`, runs the full
quality gate (type-check → lint → prettier → tests) and publishes with
automatic provenance attestations.

## One-time setup (npmjs.com — requires package owner)

1. Sign in to npmjs.com with an account that owns `@hivehub/rulebook`.
2. Package page → **Settings** → **Trusted Publisher** → *GitHub Actions*.
3. Fill in:
   - **Organization or user**: `hivellm`
   - **Repository**: `rulebook`
   - **Workflow filename**: `release.yml`
   - **Environment**: `npm` (must match the workflow's `environment: npm` —
     same pattern as hivellm/thunder).
4. Save. From now on the workflow can publish without any token; npm also
   marks releases with **provenance** (visible on the package page).

Optional hardening after the first trusted publish: in the same Settings page,
set *Publishing access* to **Require two-factor authentication and disallow
tokens**, making OIDC the only publish path.

## Cutting a release

```bash
# on main, with CI green and CHANGELOG showing the version
npm version 7.0.0 --no-git-tag-version   # if the bump isn't committed yet
git commit -am "release: v7.0.0"
git tag v7.0.0
git push origin main --tags               # tag push triggers release.yml
```

Watch the run: `gh run watch` (or Actions tab). The publish fails safely if
the tag and `package.json` disagree, if any gate step fails, or if the
Trusted Publisher config doesn't match the repo/workflow.

## Manual fallback (emergencies only)

`npm publish` locally still works for owners with 2FA (until token publishing
is disallowed). `prepublishOnly` runs the build; run the gates yourself first:
`npm run type-check && npm run lint && npm test`.
