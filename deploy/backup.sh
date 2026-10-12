#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
# Run from the project directory. The Docker volume is copied through a temporary container.
docker run --rm -v tbass_v11_tbass_data:/data -v "$PWD/backups":/backup alpine sh -c "tar czf /backup/tbass-data-$STAMP.tar.gz -C /data ."
echo "Backup created: backups/tbass-data-$STAMP.tar.gz"
