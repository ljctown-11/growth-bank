"""
对 2026-07-12 新三树种精灵图做「去背景」处理（V4：四边 flood-fill 连通域）。

关键事实（实测）：
- 15 张新图是 1920x1440 不透明 JPEG。
- 背景分两类：
  * 近白底（画纸透出）           —— 11 张（apple/orange 全系 + 部分 sakura）
  * 蓝天底（用户说的"蓝天"）      —— 4 张：apple_5 / cherry_4 / cherry_3 / cherry_1
- 前版 V3（纯白底阈值）对蓝天图只去掉了 ~32% 的蓝，渐变天空被误留，
  导致输出满幅 1920x1440。

V4 修复：从四边做 flood-fill 连通域去背景。
  - 种子 = 四边上「与边参考色接近」的像素（白底图种子是白、蓝天图种子是蓝）。
  - 扩散规则 = 局部色差容忍（邻居与当前像素颜色距离 < T_local），
    因此能顺着天空/纸面的渐变走，不会被梯度截断。
  - 树元素（绿/粉/棕/橙/红）与背景色差大且通常不碰边，不会被 flood 吃掉。

松树(pine)零改动。
输出覆盖 assets/tree-sprites/{apple,sakura,orange}/*-{idx}.png，并写 scripts/tree_cutout_metrics.json。
"""
import os
import sys
import json
from collections import deque

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout_trees import measure  # 复用度量函数

CLIP = 'C:/Users/Administrator/.workbuddy/clipboard-images/'
OUT = 'I:/summer-growth-bank/assets/tree-sprites'

# 粘贴顺序（升序 mtime）→ 原文件名
PASTE_MAP = ['cherry_5', 'apple_4', 'apple_1', 'apple_2', 'apple_3',
             'orange_4', 'orange_5', 'orange_3', 'orange_2', 'orange_1',
             'apple_5', 'cherry_4', 'cherry_3', 'cherry_1', 'cherry_2']
NAME2SP = {'cherry': 'sakura', 'apple': 'apple', 'orange': 'orange'}
NAME2STAGE = {'_1': 0, '_2': 1, '_3': 2, '_4': 3, '_5': 4}

DS = 4          # 降采样因子（1920->480, 1440->360），加速 flood


def is_bg_like(rgb):
    """逐像素判断是否为「背景色」：蓝天 OR 近白纸。树色（绿/粉/棕/橙/红）一律 False。

    蓝天：B 为最大通道，且 B 明显领先 R、G，且足够亮。
    白纸：三通道接近（低饱和）且整体明亮。
    支持 (H,W,3) 或 (N,3) 输入，沿最后一轴取通道。
    """
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sky = (b > r + 12) & (b > g + 4) & (b > 90)
    white = ((rgb.max(-1) - rgb.min(-1)) <= 22) & (rgb.mean(-1) > 205)
    return sky | white


def flood_conn(bg_like):
    """在 bg_like 连通域上，从四边做 flood，返回「与边连通」的背景遮罩。"""
    H, W = bg_like.shape
    bg = np.zeros((H, W), dtype=bool)
    edge = np.zeros((H, W), dtype=bool)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    seed = edge & bg_like
    bg |= seed

    q = deque()
    for y, x in zip(*np.where(seed)):
        q.append((int(y), int(x)))

    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx] and bg_like[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return bg


def remove_bg(src_path, out_path):
    im = Image.open(src_path).convert('RGB')
    arr = np.array(im).astype(np.float64)
    H, W = arr.shape[:2]

    # 降采样上做背景分类 + 与边连通性判定（加速）
    small = arr[::DS, ::DS].copy()
    bg_like_small = is_bg_like(small)
    bg_conn_small = flood_conn(bg_like_small)

    # 上采样连通性遮罩回原分辨率
    ys, xs = np.mgrid[0:H, 0:W]
    Hs, Ws = bg_conn_small.shape
    bg_conn = bg_conn_small[(ys // DS).clip(0, Hs - 1), (xs // DS).clip(0, Ws - 1)]

    # 原分辨率精确分类，与连通性取交集：既「是背景色」又「与边连通」才算背景
    bg_like_full = is_bg_like(arr)
    bg_full = bg_conn & bg_like_full

    alpha = np.where(bg_full, 0, 255).astype(np.uint8)

    # 裁切到可见区域(+4px 内边距)
    ys_v, xs_v = np.where(alpha > 16)
    pad = 4
    x0, x1 = max(0, xs_v.min() - pad), min(W, xs_v.max() + 1 + pad)
    y0, y1 = max(0, ys_v.min() - pad), min(H, ys_v.max() + 1 + pad)
    out = np.dstack([arr[y0:y1, x0:x1].astype(np.uint8), alpha[y0:y1, x0:x1]])

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    Image.fromarray(out, 'RGBA').save(out_path)

    m = measure(out_path)
    vis = round(float((alpha[y0:y1, x0:x1] > 16).mean() * 100), 1)
    return out, vis, m


def main():
    files = []
    for f in os.listdir(CLIP):
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            p = os.path.join(CLIP, f)
            try:
                with Image.open(p) as im:
                    if im.size == (1920, 1440):
                        files.append((os.path.getmtime(p), f, p))
            except Exception:
                pass
    files.sort()
    # 取最新一批（mtime 最后的 15 张）= 用户最新粘贴的「新图」。
    # 上轮错用 files[:15]（取最旧批次），导致映射错位——本次修正为 [-15:]。
    files = files[-15:]
    assert len(files) == 15, f'expected 15 new sprites, found {len(files)}'
    print(f'# 选定批次时间范围：{files[0][0]:.0f} ~ {files[-1][0]:.0f} '
          f'(mtime 秒；应同属一个粘贴批次)')

    results = {}
    for i, (mt, fname, p) in enumerate(files):
        name = PASTE_MAP[i]
        sp = NAME2SP[name.split('_')[0]]
        st = NAME2STAGE['_' + name.split('_')[1]]
        opath = os.path.join(OUT, sp, f'{sp}-{st}.png')
        out, vis, m = remove_bg(p, opath)
        print(f'{name:9s} -> {sp}-{st}.png  size={out.shape[1]}x{out.shape[0]}  '
              f'visible={vis}%  base_frac={m["base_frac"]:.4f}  base_cx={m["base_cx"]:.4f}')
        results[f'{sp}-{st}'] = {**m, 'visible_pct': vis, 'src': fname}

    with open('scripts/tree_cutout_metrics.json', 'w') as fp:
        json.dump(results, fp, indent=2)
    print('WROTE metrics')


if __name__ == '__main__':
    main()
