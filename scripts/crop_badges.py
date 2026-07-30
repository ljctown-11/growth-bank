#!/usr/bin/env python
# 居中裁切徽章为正方形并压缩为 WebP（保持竖向，横向=竖向）。
# 源：assets/badges/最终用图/{维度}L{1-5}.png
# 目标：assets/badges/{维度}/L{1-5}.webp
# 本次仅处理另外 4 个维度；如需重导学习力，把 "学习力" 加回 DIMS 即可。
from PIL import Image
import os

BASE = "I:/summer-growth-bank/assets/badges"
SRC_DIR = os.path.join(BASE, "最终用图")
TARGET = 800       # 正方形边长
QUALITY = 70
MAX_BYTES = 100 * 1024

# 本次要处理的维度（仅重导学习力到 800² 以与其余 4 维统一；其余维度已裁切且完成 L3/L4 对调，勿重跑以免冲掉对调）
DIMS = ["学习力"]

def process(dim, level):
    src = os.path.join(SRC_DIR, f"{dim}L{level}.png")
    dst_dir = os.path.join(BASE, dim)
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, f"L{level}.webp")
    with Image.open(src) as im:
        w, h = im.size
        if w >= h:                       # 横版：保持竖向，横向居中裁
            left = (w - h) // 2
            box = (left, 0, left + h, h)
        else:                           # 竖版：保持横向，竖向居中裁
            top = (h - w) // 2
            box = (0, top, w, top + w)
        im = im.crop(box)
        crop = im.size
        if im.size[0] != TARGET:
            im = im.resize((TARGET, TARGET), Image.LANCZOS)
        im = im.convert("RGB")          # 与学习力导出一致，背景不透明
        im.save(dst, "WEBP", quality=QUALITY, method=6)
        sz = os.path.getsize(dst)
        warn = "  ⚠ 超过100K!" if sz > MAX_BYTES else ""
        print(f"{dim} L{level}: 源 {w}x{h} → 裁切 {crop[0]}x{crop[1]} → {TARGET}x{TARGET}  {sz//1024} KB{warn}")

for dim in DIMS:
    for lv in (1, 2, 3, 4, 5):
        process(dim, lv)
print("done")
