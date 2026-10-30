"""Remove the girl's painted mouth with a hand-placed tight mask + smooth skin fill
(the auto mask grabbed shadow areas, leaving blurry blotches)."""
import sys, cv2, numpy as np
sys.path.insert(0, sys.argv[1])
from toonlib import smooth_fill
LINE = {"i1": ([(857, 1170), (868, 1180), (881, 1184), (895, 1180), (907, 1168)], 15),
        "i3": ([(627, 1314), (640, 1321), (657, 1323), (675, 1319), (688, 1308)], 15)}
POLY = {"i2": [(899, 1137), (930, 1136), (972, 1140), (980, 1150), (976, 1166), (962, 1182), (944, 1192), (926, 1191), (913, 1184), (901, 1163)]}
CEN = {"i1": (881, 1176), "i2": (932, 1160), "i3": (657, 1316)}
for k in ("i1", "i2", "i3"):
    img = cv2.imread(f"src/{k}.jpg"); H, W = img.shape[:2]
    m = np.zeros((H, W), np.uint8)
    if k in LINE:
        pts, t = LINE[k]; cv2.polylines(m, [np.array(pts, np.int32)], False, 255, t)
    else:
        cv2.fillPoly(m, [np.array(POLY[k], np.int32)], 255)
    if k in POLY:   # open mouth beside the jaw edge: a plain inpaint keeps the hair out of the fill better than smooth_fill
        hole = cv2.dilate(m, np.ones((3, 3), np.uint8))
        out = cv2.inpaint(img, hole, 4, cv2.INPAINT_TELEA)
        bl = cv2.GaussianBlur(out, (0, 0), 3); mm = cv2.GaussianBlur(hole, (0, 0), 3)[..., None] / 255.0
        out = (out * (1 - mm) + bl * mm).astype(np.uint8)
    else:
        hole = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        out = smooth_fill(img, hole, excl=3)
    cv2.imwrite(f"clean/{k}.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 97])
    cx, cy = CEN[k]; a, b = img[cy-70:cy+70, cx-90:cx+90], out[cy-70:cy+70, cx-90:cx+90]
    cv2.imwrite(f"/tmp/g/c_{k}.png", cv2.resize(np.hstack([a, b]), None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC))
