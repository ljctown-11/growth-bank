import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from psd_tools import PSDImage
import os, glob

DL = "C:/Users/admin/Downloads"
OUT = "I:/summer-growth-bank/assets/badges"
CANVAS = (2560, 1760)

src = {
    'shield':   '去除图片文字和金星 (6)-',
    'crown':    '去除图片文字和金星 (7)-',
    'book':     '去除图片文字和金星 (8)-',
    'laurel_l': '去除图片文字和金星 (4)-',
    'laurel_r': '去除图片文字和金星 (4)--',
    'base':     '去除图片文字和金星 (5)-',
}

_cache = {}
def load(name):
    if name in _cache: return _cache[name]
    psd = PSDImage.open(os.path.join(DL, src[name]))
    layer = list(psd)[0]
    arr = np.array(layer.topil().convert('RGBA'))
    bb = layer.bbox
    _cache[name] = (arr, bb)
    return arr, bb

def rgb2hsv(rgb):
    r,g,b = rgb[:,0],rgb[:,1],rgb[:,2]
    mx=np.maximum.reduce([r,g,b]); mn=np.minimum.reduce([r,g,b]); df=mx-mn
    h=np.zeros_like(mx)
    m1=(mx==r)&(df>1e-9); m2=(mx==g)&(df>1e-9); m3=(mx==b)&(df>1e-9)
    h[m1]=(60*((g[m1]-b[m1])/df[m1]))%360
    h[m2]=(60*((b[m2]-r[m2])/df[m2])+120)%360
    h[m3]=(60*((r[m3]-g[m3])/df[m3])+240)%360
    s=np.where(mx>1e-9, df/np.maximum(mx,1e-9),0.0)
    return h,s,mx

def hsv2rgb(h,s,v):
    hh=(h%360)/60.0
    c=v*s; x=c*(1-np.abs((hh%2)-1)); m=v-c
    r=np.zeros_like(v);g=np.zeros_like(v);b=np.zeros_like(v)
    mask=(hh<1); r[mask]=c[mask]; g[mask]=x[mask]
    mask=(hh>=1)&(hh<2); r[mask]=x[mask]; g[mask]=c[mask]
    mask=(hh>=2)&(hh<3); g[mask]=c[mask]; b[mask]=x[mask]
    mask=(hh>=3)&(hh<4); g[mask]=x[mask]; b[mask]=c[mask]
    mask=(hh>=4)&(hh<5); r[mask]=x[mask]; b[mask]=c[mask]
    mask=(hh>=5); r[mask]=c[mask]; b[mask]=c[mask]
    return (np.stack([r+m,g+m,b+m],axis=1)*255).clip(0,255).astype(np.uint8)

def _recolor(arr, H, S, keep_mask=None):
    """Recolor opaque pixels to target metal hue/sat, preserving original value (3D shading).
    keep_mask (flat bool): pixels whose ORIGINAL color is kept (e.g. gold frame).
    Alpha is preserved as original uint8 (NOT divided by 255)."""
    rgba=arr.reshape(-1,4).astype(float)/255.0
    rgb=rgba[:,:3]
    alpha=arr.reshape(-1,4)[:,3].astype(np.uint8)  # original 0..255
    _,_,v=rgb2hsv(rgb)
    out=hsv2rgb(np.full_like(v,H), np.full_like(v,S), v)
    if keep_mask is not None:
        out=np.where(keep_mask.reshape(-1,1), (rgb*255).clip(0,255).astype(np.uint8), out)
    o=np.concatenate([out, alpha.reshape(-1,1)],axis=1)
    return o.reshape(arr.shape)

def recolor_all(arr, H, S):
    """Recolor whole layer to target metal (used for shield body + silver laurel)."""
    return _recolor(arr, H, S)

def paste(canvas, arr, bb):
    el=Image.fromarray(arr,'RGBA')
    full=Image.new('RGBA',CANVAS,(0,0,0,0))
    full.paste(el,(bb[0],bb[1]))
    return Image.alpha_composite(canvas, full)

def make_glow(rgb, alpha, radius=70):
    if alpha<=0: return rgb
    blur=np.array(rgb.filter(ImageFilter.GaussianBlur(radius))).astype(float)
    base=np.array(rgb).astype(float)
    out=base+blur*alpha
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8),'RGB')

def find_font(size):
    for p in ['C:/Windows/Fonts/msyh.ttc','C:/Windows/Fonts/simhei.ttf',
             'C:/Windows/Fonts/simsum.ttc','C:/Windows/Fonts/msyhbd.ttc']:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

specs = {
    'L1': dict(H=22, S=0.50, laurel=None,      crown=False, base=False, glow=0.0),
    'L2': dict(H=210,S=0.05, laurel='silver',  crown=False, base=False, glow=0.20),
    'L3': dict(H=45, S=0.62, laurel='gold',    crown=True,  base=False, glow=0.40),
    'L4': dict(H=278,S=0.55, laurel='gold',    crown=True,  base=True,  glow=0.60),
}

def build():
    PAD_BOTTOM=220
    font=find_font(48)
    for lvl, sp in specs.items():
        canvas=Image.new('RGBA',CANVAS,(0,0,0,255))
        if sp['laurel'] is not None:
            for ln in ('laurel_l','laurel_r'):
                arr,bb=load(ln)
                if sp['laurel']=='silver':
                    arr=recolor_all(arr,210,0.05)
                canvas=paste(canvas,arr,bb)
        sarr,sbb=load('shield')
        sarr=recolor_all(sarr, sp['H'], sp['S'])
        canvas=paste(canvas,sarr,sbb)
        barr,bbb=load('book')
        canvas=paste(canvas,barr,bbb)
        if sp['crown']:
            carr,cbb=load('crown')
            canvas=paste(canvas,carr,cbb)
        if sp['base']:
            barra,bba=load('base')
            canvas=paste(canvas,barra,bba)
        comp=np.array(canvas.convert('RGB'))
        rgb=make_glow(Image.fromarray(comp,'RGB'), sp['glow'])
        w,h=CANVAS
        final=Image.new('RGB',(w,h+PAD_BOTTOM),(0,0,0))
        final.paste(rgb,(0,0))
        d=ImageDraw.Draw(final)
        text='图片由AI生成'
        tb=d.textbbox((0,0),text,font=font)
        tw=tb[2]-tb[0]; th=tb[3]-tb[1]
        tx=w//2-tw//2; ty=h+PAD_BOTTOM//2-th//2
        d.text((tx,ty),text,fill=(120,120,120),font=font)
        out_path=os.path.join(OUT,f'学习力{lvl}.png')
        final.save(out_path)
        print(f'{lvl}: saved {out_path} size={final.size} glow={sp["glow"]}')
    print('done')

if __name__=='__main__':
    build()
