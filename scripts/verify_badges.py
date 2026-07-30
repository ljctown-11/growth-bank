import numpy as np
import os
from PIL import Image, ImageDraw
from scripts.gen_badges import load, specs, CANVAS

OUT="I:/summer-growth-bank/assets/badges"
W,H=CANVAS

# union bbox of all elements per level
def union_bbox(lvl):
    sp=specs[lvl]
    bbs=[load('shield')[1]]
    if sp['laurel'] is not None:
        bbs.append(load('laurel_l')[1]); bbs.append(load('laurel_r')[1])
    if sp['crown']: bbs.append(load('crown')[1])
    if sp['base']:  bbs.append(load('base')[1])
    xs=[b[0] for b in bbs]+[b[2] for b in bbs]
    ys=[b[1] for b in bbs]+[b[3] for b in bbs]
    return min(xs),min(ys),max(xs),max(ys)

def lum(a):
    return 0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2]

print("=== QA ===")
for lvl in ['L1','L2','L3','L4']:
    sp=specs[lvl]
    im=np.array(Image.open(os.path.join(OUT,f'学习力{lvl}.png')).convert('RGB'))
    h_,w_=im.shape[:2]
    assert (w_,h_)==(W,H+220), f"size wrong {w_}x{h_}"
    # corners black
    corners=[im[5,5],im[5,w_-5],im[H-5,5],im[H-5,w_-5]]
    corner_ok=all(np.array(c).sum()<30 for c in corners)
    # watermark band: bottom 220px, look for gray text (not pure black, not white)
    band=im[H:, :, :]
    gray_px=((band.sum(2)>30)&(band.sum(2)<600)).sum()
    wm_ok=gray_px>200
    # shield interior hue (sample center of shield bbox on full canvas)
    sarr,sbb=load('shield')
    x0,y0,x1,y1=sbb
    # shrink interior to avoid gold border
    cx0,cx1=int(x0+(x1-x0)*0.25),int(x0+(x1-x0)*0.75)
    cy0,cy1=int(y0+(y1-y0)*0.25),int(y0+(y1-y0)*0.75)
    reg=im[cy0:cy1, cx0:cx1]
    # only count colored (non-black) pixels as shield
    mask=(reg.sum(2)>40).reshape(-1)
    rgb=reg.reshape(-1,3).astype(float)/255.0
    r,g,b=rgb[:,0],rgb[:,1],rgb[:,2]
    mx=np.maximum.reduce([r,g,b]); mn=np.minimum.reduce([r,g,b]); df=mx-mn
    h=np.zeros_like(mx)
    m1=(mx==r)&(df>1e-9); m2=(mx==g)&(df>1e-9); m3=(mx==b)&(df>1e-9)
    h[m1]=(60*((g[m1]-b[m1])/df[m1]))%360
    h[m2]=(60*((b[m2]-r[m2])/df[m2])+120)%360
    h[m3]=(60*((r[m3]-g[m3])/df[m3])+240)%360
    hv=h[mask]
    hue=np.degrees(np.arctan2(np.mean(np.sin(np.radians(hv))),np.mean(np.cos(np.radians(hv)))))% (2*np.pi)
    # halo luminance: ring 30-90px outside union bbox
    ux0,uy0,ux1,uy1=union_bbox(lvl)
    halo=im[max(0,uy0-90):max(0,uy0-30), ux0:ux1]
    haloL=lum(halo).mean()
    print(f"{lvl}: size OK, corner_black={corner_ok}, watermark={wm_ok}({gray_px}px), shieldHUE={hue:.0f}(want {sp['H']}), haloLum={haloL:.1f}")
print("done")
