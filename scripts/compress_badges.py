#!/usr/bin/env python
# 压缩学习力徽章原图：仅降分辨率/质量，转 WebP，不裁剪（保持原始构图与比例）
from PIL import Image
import os

BASE = "I:/summer-growth-bank/assets/badges"
DST = os.path.join(BASE, "学习力")
os.makedirs(DST, exist_ok=True)

def process(src_name, src_ext, level, max_w=1024, quality=85):
    src = os.path.join(BASE, f"学习力{src_name}.{src_ext}")
    dst = os.path.join(DST, f"L{level}.webp")
    with Image.open(src) as im:
        w, h = im.size
        if w > max_w:
            nh = round(h * max_w / w)
            im = im.resize((max_w, nh), Image.LANCZOS)
            w, h = im.size
        has_alpha = im.mode in ("RGBA", "P") and "transparency" in im.info
        if has_alpha:
            im.save(dst, "WEBP", quality=quality, method=6)
        else:
            im = im.convert("RGB")
            im.save(dst, "WEBP", quality=quality, method=6)
        sz = os.path.getsize(dst)
        print(f"L{level}: {w}x{h}  {sz//1024} KB  <- 学习力{src_name}.{src_ext}")

# L1-L4 原图已为 1024 宽，仅转 WebP 压缩；L5 从 2464 宽降到 1024 宽（比例不变）
process("L1", "png", 1, max_w=1024, quality=85)
process("L2", "jpeg", 2, max_w=1024, quality=85)
process("L3", "jpeg", 3, max_w=1024, quality=85)
process("L4", "jpeg", 4, max_w=1024, quality=85)
process("L5", "png", 5, max_w=1024, quality=80)
print("done")
