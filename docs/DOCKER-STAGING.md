# Container build — staging candidate

This branch adds a **build-only** multi-stage Dockerfile adapted to the repository's actual dependency manager, **Bun**, and Next.js **standalone** output. Unlike the illustrative npm-based Dockerfile, this repository has `bun.lock` and no tracked `package-lock.json`; `npm ci` would therefore fail.

## Build

```sh
docker build --target production-runtime -t agentswarm:staging .
```

The Docker build runs Prisma Client generation but **does not** run schema changes, connect to a live PostgreSQL database, start workers, or certify cryptographic verification. The existing tracked Prisma schema targets **PostgreSQL**, not SQLite; changes to datasource/provider require a separately reviewed migration plan.

For a local runtime smoke test, provide a dedicated, non-production `DATABASE_URL` through your secret manager or an untracked env file. Do not embed credentials in build arguments, images, or version control. Database schema migrations must be separately planned and executed with versioned migrations.

The image runs as non-root UID 10001 with the Node.js 24 runtime and Next.js standalone server. Non-root does not provide a browser sandbox. Actual browser execution still requires dedicated worker isolation, network egress policy, resource limits and fencing.

## CI and limitations

`.github/workflows/docker-build.yml` checks that the image builds on pull requests and selected pushes. It **does not** publish or deploy the image. The Docker build is not evidence of a completed execution, a STARK proof, settlement, tenant isolation, or multi-worker concurrency correctness.

The repository's `next.config.ts` currently sets `typescript.ignoreBuildErrors = true`. This build gate therefore does not prove TypeScript correctness. A separate strict typecheck and tests are required before staging release.

This commit intentionally does **not** replace `package.json`, `bun.lock`, or the existing Prisma schema, and does not merge proposed untested P0 backend snippets.
