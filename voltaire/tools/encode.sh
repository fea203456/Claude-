#!/usr/bin/env bash
# frames + mix -> MP4 (1080x1920, 60 fps, H.264 yuv420p, AAC). usage: tools/encode.sh out/name.mp4
set -e; cd "$(dirname "$0")/.."; OUT=${1:-out/voltaire-lottery.mp4}
N=$(ls build/frames | wc -l)
ffmpeg -v error -y -framerate 60 -i build/frames/f%05d.jpg -i out/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high -level 4.2 -r 60 -g 120 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 62.6 "$OUT"
echo "frames: $N -> $OUT"
ffprobe -v error -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate,avg_frame_rate,nb_frames,sample_rate,channels,duration -show_entries format=duration,size -of compact "$OUT"
