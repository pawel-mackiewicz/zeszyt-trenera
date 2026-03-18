#!/usr/bin/env sh
set -eu

# Preserve the usual "format the project" behavior while still letting Git hooks target only staged files.
if [ "${1-}" = "--" ]; then
  shift
fi

# Normalize pnpm's argument separator so wrapper scripts can delegate to this command safely.
if [ "$#" -eq 0 ]; then
  set -- .
fi

exec prettier --write "$@"
