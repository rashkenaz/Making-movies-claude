#!/bin/bash
# usage: sheet9.sh name t1 ... (up to 12) -> out/dialog-trainings/<name>.png (6 cols of 360x640, portrait)
source /home/claude/project/env.sh
name=$1; shift
cd /home/claude/project
node $S/scripts/render.mjs --film dialog-trainings --format 9x16 --at $(IFS=,; echo "$*") --workers 3 >/dev/null 2>&1
cd out/dialog-trainings/stills
n=$#; ins=""; fl=""; lay=""; i=0
for t in "$@"; do ins="$ins -i t$(printf %.3f $t)_9x16.png"; fl="$fl[$i:v]scale=360:640,drawtext=text='t=$t':x=8:y=8:fontsize=24:fontcolor=red[s$i];"; lay="$lay$((i%6*360))_$((i/6*640))|"; i=$((i+1)); done
st=""; for j in $(seq 0 $((n-1))); do st="$st[s$j]"; done
ffmpeg -hide_banner -loglevel error -y $ins -filter_complex "$fl${st}xstack=inputs=$n:layout=${lay%|}:fill=black" ../$name.png && echo "out/dialog-trainings/$name.png"
