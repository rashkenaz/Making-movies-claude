# Composes the recipe reel: generated video (Gemini mark removed) + timed Hebrew overlays + contact strip,
# then the Merkaz Dialog end card, music under the original foley.
import subprocess
T = [  # id, start, end (seconds), matched to the pours in the generated clip
    ('title', 0.6, 9.6), ('ing1', 12.3, 16.9), ('ing2', 17.8, 21.2), ('ing3', 21.4, 24.9),
    ('ing4', 25.15, 27.4), ('ing5', 27.5, 29.4), ('ing6', 29.5, 32.0),
    ('mix1', 32.4, 34.0), ('mix2', 34.1, 35.7), ('mix3', 35.8, 37.4), ('mix4', 37.5, 39.0),
    ('cook1', 39.3, 42.5), ('cook2', 42.7, 46.05), ('cta', 0.8, 46.1),
]
D = 46.066
inp = ['-i', 'assets/gen.mp4']
for i, (k, s, e) in enumerate(T):
    inp += ['-loop', '1', '-framerate', '30', '-t', str(D), '-i', f'build/ov/{k}.png']
f = ['[0:v]delogo=x=852:y=1690:w=98:h=100,fps=30,format=yuv420p[v0]']
last = 'v0'
for i, (k, s, e) in enumerate(T, start=1):
    fo = f'fade=t=out:st={e - 0.25:.2f}:d=0.25:alpha=1,' if k != 'cta' else ''
    f.append(f'[{i}:v]format=rgba,fade=t=in:st={s:.2f}:d=0.25:alpha=1,{fo}setpts=PTS-STARTPTS[o{i}]')
    y = f"'30*max(0\\,1-(t-{s})/0.3)'"
    f.append(f"[{last}][o{i}]overlay=x=0:y={y}:enable='between(t,{s},{e})'[v{i}]")
    last = f'v{i}'
cmd = ['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(f), '-map', f'[{last}]', '-t', str(D),
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', 'build/main.mp4']
subprocess.run(cmd, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '../out/recipe-reel/end/video_9x16.mp4', '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'medium',
                '-crf', '18', '-pix_fmt', 'yuv420p', 'build/end.mp4'], check=True)
open('build/cat.txt', 'w').write("file 'main.mp4'\nfile 'end.mp4'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'build/cat.txt', '-c', 'copy', 'build/v.mp4'], check=True)
# audio: music bed + the generated clip's own pouring/whisking sounds, quietly underneath
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'build/v.mp4', '-i', 'audio/music.wav', '-i', 'assets/gen.mp4', '-filter_complex',
                '[1:a]atrim=0:55,afade=t=out:st=54:d=1[m];[2:a]volume=0.55,apad[f];[m][f]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5[a]',
                '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '../out/recipe-reel/מתכון-לחברות.mp4'], check=True)
print('done')
