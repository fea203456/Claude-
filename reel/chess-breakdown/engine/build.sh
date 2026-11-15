#!/usr/bin/env bash
# usage: engine/build.sh <projectDir>   (expects raw/src.mp4, script.json; writes out/final.mp4)
set -euo pipefail
D=$(realpath "$1"); E=$(dirname "$(realpath "$0")")
read TF TT END SUMT CROP < <(python3 -c "
import json;d=json.load(open('$D/script.json'));t=d.get('teaser');T0=(t['src_to']-t['src_from']) if t else 0
s=[e['t'] for e in d['events'] if e['type']=='summary'];print(t['src_from'] if t else 0, t['src_to'] if t else 0, d['end'], (s[0]+T0) if s else 1e6, d.get('crop','iw:ih:0:0'))")
node "$E/render.js" "$D"
mkdir -p "$D/out"
if (( $(echo "$TT > 0" | bc) )); then
  PRE="[0:v]trim=$TF:$TT,setpts=PTS-STARTPTS,fps=30[tv];[0:a]atrim=$TF:$TT,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=$(echo "$TT-$TF-0.12"|bc):d=0.12[ta];
  [0:v]trim=0:$END,setpts=PTS-STARTPTS,fps=30[mv];[0:a]atrim=0:$END,asetpts=PTS-STARTPTS,afade=t=out:st=$(echo "$END-1"|bc):d=1[ma];
  [tv][ta][mv][ma]concat=n=2:v=1:a=1[base][aout];"
else
  PRE="[0:v]trim=0:$END,setpts=PTS-STARTPTS,fps=30[base];[0:a]atrim=0:$END,asetpts=PTS-STARTPTS,afade=t=out:st=$(echo "$END-1"|bc):d=1[aout];"
fi
ffmpeg -v error -stats -y -i "$D/raw/src.mp4" -f concat -safe 0 -i "$D/build/ui/list.txt" -filter_complex "$PRE
  [base]crop=$CROP,split[b1][b2];
  [b1]scale=-2:480,crop=270:480,gblur=sigma=10,lutyuv=y=val*0.42:u=128+(val-128)*0.8:v=128+(val-128)*0.8,scale=1080:1920,setsar=1[bg];
  [b2]scale=-2:640,crop=1080:640,format=yuva420p,fade=t=out:st=$SUMT:d=0.5:alpha=1[fg];
  [bg][fg]overlay=0:790[v1];[1:v]fps=30,format=rgba[ui];[v1][ui]overlay=0:0:eof_action=repeat,format=yuv420p,fade=t=out:st=$(echo "$END+$TT-$TF-0.6"|bc):d=0.6[vout]" \
  -map "[vout]" -map "[aout]" -r 30 -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$D/out/final.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of compact "$D/out/final.mp4"
