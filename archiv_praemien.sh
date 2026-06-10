#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${TARGET_DIR:-data/raw/ofsp/archives}"
FORCE="${FORCE:-0}"

mkdir -p "$TARGET_DIR"

download_archive() {
  local year="$1"
  local url="$2"
  local output="$TARGET_DIR/Archiv_Praemien_${year}.zip"

  if [[ "$FORCE" != "1" && -s "$output" ]]; then
    echo "skip $year: $output already exists"
    return 0
  fi

  echo "download $year -> $output"
  wget --continue --tries=3 --timeout=60 --waitretry=5 --output-document="$output" "$url"

  if command -v unzip >/dev/null 2>&1; then
    unzip -t "$output" >/dev/null
    echo "ok $year: zip validated"
  else
    echo "ok $year: downloaded (unzip not found, validation skipped)"
  fi
}

download_archive 2011 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDExLnppcA%3D%3D"
download_archive 2013 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDEzLnppcA%3D%3D"
download_archive 2015 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDE1LnppcA%3D%3D"
download_archive 2017 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDE3LnppcA%3D%3D"
download_archive 2019 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDE5LnppcA%3D%3D"
download_archive 2021 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDIxLnppcA%3D%3D"
download_archive 2023 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDIzLnppcA%3D%3D"
download_archive 2025 "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDI1LnppcA%3D%3D"

echo "done: archives are in $TARGET_DIR"
echo "next: DATA_MODE=auto pnpm normalize && DATA_MODE=auto pnpm simulate && DATA_MODE=auto pnpm export:web"
