import os, json
import numpy as np
from PIL import Image, ImageFilter

ROOT = r'I:/summer-growth-bank'
SRC_DIR = r'C:/Users/Administrator/.workbuddy/clipboard-images/'
OUT_DIR = os.path.join(ROOT, 'assets/tree-sprites')

# clipboard 文件 → (输出物种目录名, stage 索引 0..4)
# 顺序依据聊天发送顺序（@image#1..15 = 时间戳升序），用户确认文件名=stage 0→4 顺序
SRC = [
    ('2026-07-11T14-59-01-419Z-f3d5d18b', 'apple', 0),
    ('2026-07-11T14-59-01-426Z-e7db838b', 'sakura', 2),
    ('2026-07-11T14-59-01-432Z-c50f79db', 'sakura', 1),
    ('2026-07-11T14-59-01-436Z-6bad93a6', 'sakura', 4),
    ('2026-07-11T14-59-01-446Z-662b4922', 'sakura', 3),
    ('2026-07-11T14-59-01-450Z-5c9e309e', 'sakura', 0),
    ('2026-07-11T14-59-01-460Z-05e764f6', 'orange', 2),
    ('2026-07-11T14-59-01-466Z-190eca30', 'orange', 4),
    ('2026-07-11T14-59-01-479Z-3318e0b4', 'orange', 1),
    ('2026-07-11T14-59-01-486Z-c27a9b71', 'orange', 3),
    ('2026-07-11T14-59-01-494Z-19411ab7', 'orange', 0),
    ('2026-07-11T14-59-01-504Z-a121a6d5', 'apple', 2),
    ('2026-07-11T14-59-01-512Z-f2538f29', 'apple', 4),
    ('2026-07-11T14-59-01-520Z-49b4b618', 'apple', 1),
    ('2026-07-11T14-59-01-542Z-af6ae6f8', 'apple', 3),
]

# 蓝背景检测（不依赖采样，直接判蓝像素）：B 最高、且明显高于 R、G 中等以上。
# 树主体为绿/粉/红/橙/白，均不满足此条件，安全。
B_LOW = 150       # 蓝通道下限（原170→155→150，进一步放宽）
B_MINUS_R = 15    # B 比 R 高出多少算蓝（原30→20→15）
G_LOW = 100       # 绿通道下限（原140→120→100）

# 黄/暖土色背景检测（发芽图 stage1 的黄/米色/沙土底）
# 从实测数据：apple-1 的土堆色 BR 角 RGB(237,204,152)，sakura-1 的 BR 角 RGB(238,205,151)
# 特征：R 和 G 都偏高、B 明显低于 R 和 G（暖色调）
R_YELLOW_LO = 165   # R 下限（降低以捕获更浅的米色）
G_YELLOW_LO = 135   # G 下限
B_YELLOW_HI = 175   # B 上限（从140大幅提升到175！之前152的像素全逃了）
YELLOW_WARM_DIFF = 12 # B 至少比 R 低这么多（确保是暖色而非白色）

BLUR = 1.0  # 边缘羽化半径（px，调小以减少半透明蓝边残留）


def cutout(rgb_path):
    img = Image.open(rgb_path).convert('RGB')
    arr = np.array(img).astype(np.int32)
    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # 芽通常从图底向上生长，绝不出现在图顶 25%（顶部是天空）。加 y 条件：只在图底 75% 保护芽，
    # 顶部 25% 强制按背景删，避免浅青天空（G 也高）被保护区误留（如 apple-1 顶部蓝天 G≈174）。
    Yc = np.arange(arr.shape[0], dtype=np.int32).reshape(-1, 1)
    is_sprout = (G > 170) & (B > 170) & (R < 150) & (R * 100 < G * 56) & (Yc > int(arr.shape[0] * 0.25))
    # 主蓝检测：B 最高且明显超过 R，G 中等（排除青绿芽保护区）
    is_blue_bg = (B > B_LOW) & (B - R > B_MINUS_R) & (G > G_LOW) & (~is_sprout)
    # 辅助浅蓝天检测：B ≥ G 且明显超过 R（捕获 sakura-4 这类浅蓝灰天空，排除保护区）
    is_light_blue = (B > 135) & (B >= G - 5) & (B > R + 3) & (G > 90) & (~is_blue_bg) & (~is_sprout)
    # 暖土色/黄背景检测：R+G 偏高、B 偏低且显著低于 R（暖色调特征，排除保护区）
    is_yellow_bg = (R > R_YELLOW_LO) & (G > G_YELLOW_LO) & (B < B_YELLOW_HI) & (B < R - YELLOW_WARM_DIFF) & (~is_sprout)
    is_bg = is_blue_bg | is_light_blue | is_yellow_bg
    alpha = np.where(is_bg, 0, 255).astype(np.uint8)
    alpha = np.array(Image.fromarray(alpha, 'L').filter(ImageFilter.GaussianBlur(radius=BLUR)))
    out = np.dstack([arr.astype(np.uint8), alpha])
    return Image.fromarray(out, 'RGBA')


def measure(png_path):
    arr = np.array(Image.open(png_path).convert('RGBA'))
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return None
    # 稳健 base：y 的 97.5 分位（排除背景残留散点拉高 maxY）
    base_y = int(np.percentile(ys, 97.5))
    base_frac = (base_y + 1) / arr.shape[0]
    # fcx：可见像素的全图 x 质心占图宽比例
    fcx = float(np.mean(xs)) / arr.shape[1]
    # base_cx：树根底部可见像素的 x 中位数（取最底 20% 高度带）。
    # 用 20% 而非更窄：过窄只截到树干单侧边缘，质心会飘到图边（如 0.93）；用中位数抗离群。
    # 树根通常在图底 15%~20% 处，20% 带稳定截到且贴近「树干最底部的点」，横向居中更准。
    bottom_band = max(1, int(arr.shape[0] * 0.20))
    bottom_mask = ys >= (arr.shape[0] - bottom_band)
    if bottom_mask.sum() > 0:
        base_cx = float(np.median(xs[bottom_mask])) / arr.shape[1]
    else:
        base_cx = fcx
    return dict(iw=arr.shape[1], ih=arr.shape[0], minX=int(xs.min()), minY=int(ys.min()),
                maxX=int(xs.max()), maxY=int(ys.max()), visW=int(xs.max() - xs.min() + 1),
                visH=int(ys.max() - ys.min() + 1), base_frac=round(float(base_frac), 4),
                fcx=round(fcx, 4), base_cx=round(base_cx, 4))


def main():
    metrics = {}
    for (stamp, sp, idx) in SRC:
        src = os.path.join(SRC_DIR, f'clipboard-{stamp}.jpg')
        if not os.path.exists(src):
            print('MISSING', src); continue
        out = cutout(src)
        odir = os.path.join(OUT_DIR, sp)
        os.makedirs(odir, exist_ok=True)
        out_path = os.path.join(odir, f'{sp}-{idx}.png')
        out.save(out_path)
        m = measure(out_path)
        az = int((alpha_pct(out_path)) * 100)
        metrics[f'{sp}-{idx}'] = {**m, 'alpha0_pct': az}
        print(f'{sp}-{idx}: alpha0={az}% base_frac={m["base_frac"]} vis={m["visW"]}x{m["visH"]} of {m["iw"]}x{m["ih"]}')
    with open(os.path.join(ROOT, 'scripts/tree_cutout_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
    print('WROTE scripts/tree_cutout_metrics.json')


def alpha_pct(png_path):
    a = np.array(Image.open(png_path).convert('RGBA'))[:, :, 3]
    return float((a == 0).mean())


if __name__ == '__main__':
    main()
