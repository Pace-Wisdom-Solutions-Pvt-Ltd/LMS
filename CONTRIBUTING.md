# Contributing

Thanks for your interest in improving the LMS! This guide explains how to propose a change and what we look for when reviewing it.

By taking part in this project you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** or **request a feature** through [GitHub Issues](../../issues/new/choose). Please search existing issues first.
- **Improve the docs**: fixes to the README, the per-app `README.md` files, or [`frontend/README.md`](frontend/README.md) are always welcome.
- **Send code**: pick an open issue, or one of the 🚧 Community items and [roadmap](README.md#roadmap) ideas in the README. For anything large, open an issue first so we can agree on the approach before you spend time on it.

Found a security problem? **Do not open a public issue.** Follow [SECURITY.md](SECURITY.md) instead.

## Development setup

Follow [Getting started in the README](README.md#quickstart-with-docker-recommended). The Docker quickstart runs the whole stack with one command. The manual setup covers running the backend and frontend directly.

## Making a change

1. Fork the repository and create a branch from `main`, e.g. `fix/quiz-retake-count` or `feat/batch-export`.
2. Keep code in the app that owns the feature (`accounts`, `curriculum`, `organizations`, …), and scope every query to the organisation. This is a multi-tenant system: data must never leak between organisations.
3. Commit migrations together with the model changes that need them (`makemigrations --check` runs in the test suite).
4. Add or update tests:
   - Backend: under `<app>/tests/`.
   - Frontend: next to the component, or under the feature's `__tests__/` folder.
5. Make sure the checks below pass, then open a pull request and fill in the template.

### Checks to run before opening a pull request

```bash
# Backend (needs a running PostgreSQL)
poetry run pytest -p no:cacheprovider --no-cov -q
ruff check .

# Frontend
cd frontend
npm test
npm run lint
npm run build

# License headers (pip install reuse)
reuse lint
```

CI runs the same checks on every pull request.

### License headers

Every source file starts with an SPDX header. Copy it from a neighbouring file, or add it with [`reuse`](https://reuse.software/):

```python
# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0
```

```ts
// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0
```

```bash
reuse annotate --copyright "Pace Wisdom Solutions Pvt. Ltd." --year 2026 --license Apache-2.0 path/to/new_file.py
```

If you copy a file from another project, keep its original copyright and license header, and check that its license is compatible with Apache 2.0.

## Code style

- **Python:** PEP 8. Match the style of the surrounding code.
- **TypeScript / React:** follow the ESLint config in `frontend/eslint.config.js`. Avoid `any` in new code.
- Write clear commit messages that say *why* a change was made, not only what changed.
- Keep pull requests focused. One logical change per pull request is easier to review and to revert.

## Licensing of contributions

This project is licensed under the [Apache License, Version 2.0](LICENSE). Contributions are accepted under the same license ("inbound = outbound"). As stated in section 5 of the license, any contribution you intentionally submit for inclusion is licensed under Apache 2.0, with no additional terms or conditions. No separate contributor agreement is required.

Only submit work that you wrote yourself or have the right to submit under these terms.

## Getting help

See [SUPPORT.md](SUPPORT.md).
