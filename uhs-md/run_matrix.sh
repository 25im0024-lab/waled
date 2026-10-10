#!/usr/bin/env bash
# Scenario matrix: cushion gas x salinity x bacterial metabolism.
# Usage:  NP=8 LMP=lmp ./run_matrix.sh        (run from uhs-md/)
# Each case goes in runs/<name>/ and is analysed when it finishes.
# EXTRA passes further build_system.py options (e.g. "--calcite-ff my.json").
set -euo pipefail
NP=${NP:-4}
LMP=${LMP:-lmp}
EXTRA=${EXTRA:-}
T=${T:-333.15}       # K   (~60 C, typical shallow carbonate)
P=${P:-10e6}         # Pa  (10 MPa)
NEQ=${NEQ:-500000}   # 0.5 ns
NPROD=${NPROD:-2000000}  # 2 ns
HERE=$(cd "$(dirname "$0")" && pwd)

for cushion in CO2 CH4 N2; do
  for m in 0.0 1.0 3.0; do
    for bio in none methanogenesis; do
      name="${cushion}_m${m}_${bio}"
      out="$HERE/runs/$name"
      python3 "$HERE/build_system.py" --cushion "$cushion" --x-cushion 0.3 \
          --T "$T" --P "$P" --molality "$m" --bio "$bio" --bio-conversion 0.10 \
          --out "$out" $EXTRA > /dev/null
      (cd "$out" && mpirun -np "$NP" "$LMP" -in "$HERE/in.uhs.lmp" \
          -var neq "$NEQ" -var nprod "$NPROD" > out.log)
      python3 "$HERE/analyze.py" "$out" > /dev/null
      echo "done: $name"
    done
  done
done
