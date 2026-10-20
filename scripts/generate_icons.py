#!/usr/bin/env python3
"""BTC Strategy Pro generic square app icons, stdlib-only PNG generator."""
from pathlib import Path
import math, struct, zlib

def png_chunk(tag, payload):
    return struct.pack('!I',len(payload))+tag+payload+struct.pack('!I',zlib.crc32(tag+payload)&0xffffffff)

def generate(size, output):
    n=size
    mid=n/2
    rows=[]
    glyph=['1111100','1100010','1100010','1111100','1100010','1100010','1111100']
    c=math.cos; pi=math.pi
    for y in range(n):
        row=bytearray([0])
        for x in range(n):
            nx=x/n;ny=y/n
            r=.15
            dx=max(abs(nx-.5)-(.445-r),0);dy=max(abs(ny-.5)-(.445-r),0)
            if dx*dx+dy*dy>r*r: rgb=(11,16,24)
            else: rgb=(18,36,51)
            rad=((nx-.5)**2+(ny-.47)**2)**.5
            if rad<.34: rgb=(19,53,68)
            if .322<rad<.345: rgb=(27,191,157)
            unit=.049
            ix=int((nx-.5+unit*3.5)/unit)
            iy=int((ny-.25)/unit)
            if 0<=ix<7 and 0<=iy<7 and glyph[iy][ix]=='1': rgb=(244,182,60)
            if .615<ny<.75 and abs(ny-(.72-.26*(nx-.26)))<.015 and .25<nx<.75:rgb=(29,194,153)
            row.extend(rgb)
        rows.append(row)
    raw=b''.join(rows)
    out=b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR',struct.pack('!2I5B',n,n,8,2,0,0,0))+png_chunk(b'IDAT',zlib.compress(raw,9))+png_chunk(b'IEND',b'')
    Path(output).parent.mkdir(parents=True,exist_ok=True)
    Path(output).write_bytes(out)

if __name__=='__main__':
    for s in (192,512):generate(s,Path(__file__).resolve().parents[1]/'icons'/f'icon-{s}.png')
