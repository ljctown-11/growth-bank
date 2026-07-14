import os, numpy as np
from PIL import Image
from cutout_trees import SRC, ROOT, SRC_DIR

for stamp, sp, idx in SRC:
    src = os.path.join(SRC_DIR, f'clipboard-{stamp}.jpg')
    arr = np.array(Image.open(src).convert('RGB')).astype(np.int32)
    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # 蓝背景特征：B 最高且明显高于 R，G 中等以上
    blue = (B > 170) & (B - R > 30) & (G > 140)
    png = os.path.join(ROOT, 'assets/tree-sprites', sp, f'{sp}-{idx}.png')
    az = int((np.array(Image.open(png).convert('RGBA'))[:, :, 3] == 0).mean() * 100) if os.path.exists(png) else -1
    print(f'{sp}-{idx}: png_alpha0={az:3d}%  blue_frac={blue.mean()*100:3.0f}%')
