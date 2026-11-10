# Jonathan's Galaxy

A static showcase of the personal automation system I run at home. The map contains five clusters and draws from a dated, allowlisted snapshot in `src/galaxy.json`.

Build with Node.js 20 or later. The project has no package dependencies.

```sh
node scripts/build.mjs
```

Open `dist/index.html` in a browser. Choose a cluster, then a system to read its description and follow a connection. Connections let you navigate in either direction. A directory grouped by cluster is available if the interactive map cannot load. External links are in the page HTML. The support interview walkthrough is in `talk-track.md`.

Update the snapshot date when changing the public facts. Add only descriptions and relationships approved for public use.

For a release review, stage the intended source changes, rebuild, and supply the maintainer's local `.privacy-policy.json`. The policy takes a nonempty `patterns` array of regular expressions. Keep it out of Git and out of the build output.

```sh
node scripts/check-privacy.mjs
gitleaks dir --redact --no-banner .
gitleaks git --redact --no-banner .
```

The privacy scan checks the tracked snapshot and the build output. Gitleaks checks for credentials and other secrets. For first publication, start a clean Git history from the reviewed snapshot and scan that export and its history. Keep the existing development history private.
