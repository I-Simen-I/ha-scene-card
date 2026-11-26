# Local test environment

A local Home Assistant in Docker with `input_boolean` scenes, the demo
integration's lights and switches, and a dashboard covering the card's
options. The built card in `dist/` is mounted straight in, so nothing has to
be released to test a change.

## Usage

```bash
yarn build          # dist/ must exist before the container starts
yarn ha:up          # start Home Assistant on http://localhost:8123
yarn watch          # rebuild on every change, then hard refresh the browser
```

The first time, Home Assistant asks you to create a user (onboarding). After
that, the login is skipped when opened from localhost.

Open the **Scene card** dashboard in the sidebar. To try the visual editor,
add a card to the default Overview dashboard.

```bash
yarn ha:logs        # follow the Home Assistant log
yarn ha:down        # stop the container
```

The container uses port 8123, so stop other local Home Assistant containers
first.

## Files

- `config/configuration.yaml`: the scenes as `input_boolean`s, demo
  integration, card loaded via `frontend.extra_module_url`, and the dashboard
  below
- `config/dashboards/scenes.yaml`: test cards, a view each for the basics,
  titles and buttons without names, templates and secondary texts,
  overrides and colors, other entity types, actions, many buttons and
  sections. The README images are taken here.

Everything else Home Assistant writes to `config/` is ignored by git. Delete
it to start over from a fresh install.

## Releasing

1. Go to **Actions → Release → Run workflow** on `main`, pick the version
   bump and whether it's a beta.
2. The workflow works out the next version from the tags, checks and builds
   the card, and creates a **draft** release with generated release notes.
3. Review the draft, add highlights at the top if you like, and press
   **Publish**. The tag is created then, and Marketplace (HACS) users get the
   update.

Betas are tagged `vX.Y.Z-beta-N` and only reach users who enabled beta
versions in the Marketplace (HACS).

Release notes are grouped by pull request label. Labels are set from the
branch name: `feat/…` → Features, `fix/…` → Fixes, `chore/…`, `ci/…`,
`refactor/…` → Maintenance, `docs/…` → Maintenance. Dependabot's pull
requests go under Dependencies.

The version in `package.json` is a placeholder (`0.0.0-dev`). The card's
version comes from the tag: the release workflow passes it to the build as
`CARD_VERSION`, and local builds show `dev`.
