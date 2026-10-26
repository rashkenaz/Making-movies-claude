#!/usr/bin/env bash
# Join the checklist film with the Merkaz Dialog end card, lay the music + SFX under it, -14 LUFS.
#   bash checklist-reel/compose.sh   (from the project folder)
set -euo pipefail
OUT=out/checklist-reel
V=$OUT/video_9x16.mp4
END=out/recipe-reel/end/video_9x16.mp4
A=checklist-reel/audio
TOTAL=$(python3 -c "print(31.86+9.0)")
ffmpeg -loglevel error -y -i "$V" -i "$END" -i $A/src.wav -i $A/sfx.wav -filter_complex "
 [0:v]fps=60,setsar=1[v0];[1:v]fps=60,setsar=1[v1];[v0][v1]concat=n=2:v=1:a=0[v];
 [2:a]atrim=0:$TOTAL,asetpts=N/SR/TB,volume=0.75,afade=t=out:st=$(python3 -c "print($TOTAL-2.2)"):d=2.2[m];
 [3:a]apad=whole_dur=$TOTAL,volume=1.1[s];
 [m][s]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -movflags +faststart \
 "$OUT/האם-זה-מוכר-לך.mp4"
echo "-> $OUT/האם-זה-מוכר-לך.mp4"
