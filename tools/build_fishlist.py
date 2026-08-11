"""转换素材：P模式PNG转RGBA、统一命名 fish_001.png~fish_128.png、生成 fishlist.js"""
import glob, os, shutil
from PIL import Image

SRC = r"D:\ai\fish_images"
DST = r"D:\diaoyu\fishing-game\assets\fish"

files = sorted(glob.glob(os.path.join(SRC, "*.png")))
print(f"found {len(files)} files")

names = []
for i, f in enumerate(files, 1):
    name = f"fish_{i:03d}.png"
    im = Image.open(f)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im.save(os.path.join(DST, name), "PNG")
    names.append(name)

with open(os.path.join(DST, "fishlist.js"), "w", encoding="utf-8") as fh:
    fh.write("// 自动生成的鱼素材清单（assets/fish 目录）。替换素材后重新运行 tools/build_fishlist.py 更新。\n")
    fh.write("window.FISH_IMAGES = " + repr(names).replace("'", '"') + ";\n")

print("done, saved", len(names), "images")
