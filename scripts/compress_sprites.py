# scripts/compress_sprites.py
#
# 把 20 张手绘位图精灵图（assets/tree-sprites/{pine,apple,sakura,orange}/{sp}-{0..4}.png）
# 与浇水壶（assets/watering-can-new.png）转成 WebP（有损 quality=85 + 透明 alpha + method=6 最佳压缩）。
#
# 背景：原 PNG 合计约 33.7MB（精灵图 32MB + 浇水壶 1.7MB），首屏即拉约 5MB，
# 且每张树卡片都嵌一张浇水壶、精灵图代码里是懒加载无预加载，成长树页面图标加载很慢。
# 转 WebP 后体积大幅下降（预期 6–10MB），配合预加载 + SW 缓存可根治。
#
# 运行（在仓库根目录 I:\summer-growth-bank 下）：
#   python scripts/compress_sprites.py
#
# 注意：本脚本只「生成」.webp，不删除原 PNG；删除原 PNG 由调用方确认压缩成功后再执行，
# 以免 SW 清单与实际文件不一致。

import os
import glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 20 张精灵图：四物种各 5 档（stage 0..4）
SPRITES = []
for sp in ['pine', 'apple', 'sakura', 'orange']:
    SPRITES += sorted(glob.glob(os.path.join(ROOT, 'assets', 'tree-sprites', sp, f'{sp}-*.png')))

# 浇水壶
WATERING = os.path.join(ROOT, 'assets', 'watering-can-new.png')

FILES = SPRITES + ([WATERING] if os.path.exists(WATERING) else [])

print(f'待压缩文件数：{len(FILES)}（精灵图 {len(SPRITES)} 张 + 浇水壶 {"1" if os.path.exists(WATERING) else "0"} 张）')
print('-' * 72)

total_before = 0
total_after = 0
ok = 0
for f in FILES:
    if not os.path.exists(f):
        print(f'SKIP (不存在): {os.path.relpath(f, ROOT)}')
        continue
    im = Image.open(f).convert('RGBA')
    out = os.path.splitext(f)[0] + '.webp'
    # 有损 quality=85 + 透明 alpha + method=6（最佳压缩，最慢但最小）
    im.save(out, 'WEBP', quality=85, method=6, lossless=False)
    before = os.path.getsize(f)
    after = os.path.getsize(out)
    total_before += before
    total_after += after
    ok += 1
    print(f'{os.path.relpath(f, ROOT)} -> {os.path.relpath(out, ROOT)}'
          f'  {before // 1024}KB -> {after // 1024}KB'
          f'  (减小 {(1 - after / before) * 100:.1f}%)')

print('-' * 72)
if total_before > 0:
    print(f'成功 {ok} 张；合计 {total_before // 1024}KB -> {total_after // 1024}KB'
          f'  (减小 {(1 - total_after / total_before) * 100:.1f}%)')
else:
    print('没有可压缩的文件（请确认在仓库根目录运行，且 assets/ 存在）')
