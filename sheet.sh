#!/bin/bash
# usage: sheet.sh name t1 t2 ... (up to 12) -> out/dialog-trainings/<name>.png (3 cols of 960x540)
source /home/claude/project/env.sh
name=$1; shift
cd /home/claude/project
node $S/scripts/render.mjs --film dialog-trainings --at $(IFS=,; echo "$*") --workers 3 >/dev/null 2>&1
cd out/dialog-trainings/stills
n=$#; ins=""; fl=""; lay=""; i=0
for t in "$@"; do ins="$ins -i t$(printf %.3f $t).png"; fl="$fl[$i:v]scale=960:540,drawtext=text='t=$t':x=10:y=10:fontsize=28:fontcolor=red[s$i];"; lay="$lay$((i%3*960))_$((i/3*540))|"; i=$((i+1)); done
st=""; for j in $(seq 0 $((n-1))); do st="$st[s$j]"; done
ffmpeg -hide_banner -loglevel error -y $ins -filter_complex "$fl${st}xstack=inputs=$n:layout=${lay%|}:fill=black" ../$name.png && echo "out/dialog-trainings/$name.png"
