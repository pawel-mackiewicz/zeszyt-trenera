#!/usr/bin/env sh
set -eu

# Allow installs to succeed outside a Git checkout, such as archive builds or CI cache restores.
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  exit 0
fi

# Keep the hook location in the repository so every clone shares the same pre-commit checks.
git config core.hooksPath .githooks
