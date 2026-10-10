"""
Generates the stylised Arizona plants and the hiker for the desert-growth page.

Run headless:
    blender --background --python gen_models.py -- <output_dir>

Every plant is split into parts whose origin sits at the point where the part attaches
to its parent, so the web page can grow a part by scaling it from that origin.
Each growing node carries custom properties (exported as glTF extras):
    grow_start : 0..1   when this part starts growing on the plant's growth timeline
    grow_dur   : 0..1   how long it takes
"""
import bpy, math, random, sys, os
from mathutils import Vector, Euler

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.getcwd()
os.makedirs(OUT, exist_ok=True)
random.seed(48)


# ---------- helpers -------------------------------------------------------------
def srgb(h):
    """'#rrggbb' -> linear rgba (glTF vertex colours are linear)."""
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


def reset_scene():
    global _mat
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mat = None  # materials do not survive a scene reset


_mat = None
def material():
    global _mat
    if _mat:
        return _mat
    m = bpy.data.materials.new('VertexColor')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    bsdf.inputs['Roughness'].default_value = 0.92
    nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    _mat = m
    return m


def make_obj(name, verts, faces, fcols, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), props=None, smooth=False):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    mesh.update()
    for p in mesh.polygons:
        p.use_smooth = smooth
    attr = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    for pi, poly in enumerate(mesh.polygons):
        c = fcols[pi]
        for li in poly.loop_indices:
            attr.data[li].color = c
    mesh.materials.append(material())
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = Euler(rot, 'XYZ')
    if parent:
        obj.parent = parent
    for k, v in (props or {}).items():
        obj[k] = v
    return obj


def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), props=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    e.rotation_euler = Euler(rot, 'XYZ')
    if parent:
        e.parent = parent
    for k, v in (props or {}).items():
        e[k] = v
    return e


class Mesh:
    """Tiny accumulator so one object can hold several primitives with their own colours."""
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color):
        base = len(self.v)
        self.v += [Vector(v) for v in verts]
        for j, f in enumerate(faces):
            self.f.append([base + i for i in f])
            if callable(color):
                self.c.append(color(j))
            elif isinstance(color, list):
                self.c.append(color[j])
            else:
                self.c.append(color)

    def build(self, name, **kw):
        return make_obj(name, self.v, self.f, self.c, **kw)


def frames_along(points):
    n = len(points)
    out = []
    for i in range(n):
        if i == 0:
            t = points[1] - points[0]
        elif i == n - 1:
            t = points[-1] - points[-2]
        else:
            t = points[i + 1] - points[i - 1]
        t = t.normalized()
        ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
        nrm = t.cross(ref).normalized()
        bn = t.cross(nrm).normalized()
        out.append((t, nrm, bn))
    return out


def tuft(verts, faces, cols, base, d, axis, count, length, width, color, spread=0.45, droop=0.0):
    """A small cluster of thin double-sided spines fanning out from `base` along direction `d`."""
    d = d.normalized()
    tang = d.cross(axis)
    if tang.length < 1e-4:
        tang = d.cross(Vector((1, 0, 0)))
    tang.normalize()
    for _ in range(count):
        jit = (tang * random.uniform(-1, 1) + axis * random.uniform(-1, 1)) * spread
        tip = base + (d + jit + Vector((0, 0, -droop))).normalized() * length * random.uniform(0.7, 1.25)
        side = tang * width
        for flip in (False, True):
            vi = len(verts)
            verts += [base - side, base + side, tip]
            faces.append([vi + 1, vi, vi + 2] if flip else [vi, vi + 1, vi + 2])
            cols.append(color)


def tube(points, radii, segs=12, rib_depth=0.0, col_a=None, col_b=None, cap_end=True, cap_start=True, grad=None, spines=None):
    """Ribbed tube along a path. segs should be even when rib_depth > 0 (alternating ridge/valley).
    spines={'len','n','sub','col','w'}: add a spine tuft along every ridge (areoles)."""
    verts, faces, cols = [], [], []
    fr = frames_along(points)
    n = len(points)
    for i in range(n):
        t, nrm, bn = fr[i]
        for k in range(segs):
            th = 2 * math.pi * k / segs
            rad = radii[i] * (1 + rib_depth * (1 if k % 2 == 0 else -1))
            verts.append(points[i] + (nrm * math.cos(th) + bn * math.sin(th)) * rad)
    for i in range(n - 1):
        for k in range(segs):
            a = i * segs + k
            b = i * segs + (k + 1) % segs
            c = (i + 1) * segs + (k + 1) % segs
            d = (i + 1) * segs + k
            faces.append([a, b, c, d])
            base = mix(col_a, col_b, 0.5) if col_b else col_a
            if col_b and k % 2 == 0:
                base = col_a
            elif col_b:
                base = col_b
            if grad:
                base = mix(base, grad, i / max(1, n - 2))
            cols.append(base)
    if spines:
        sub = spines.get('sub', 3)
        step = 2 if rib_depth > 0 else spines.get('skip', 3)
        for i in range(n - 1):
            t0, n0, b0 = fr[i]
            t1, n1, b1 = fr[i + 1]
            for k in range(0, segs, step):
                th = 2 * math.pi * k / segs
                d0 = n0 * math.cos(th) + b0 * math.sin(th)
                d1 = n1 * math.cos(th) + b1 * math.sin(th)
                for s in range(sub):
                    f = s / sub
                    p = points[i].lerp(points[i + 1], f)
                    r = (radii[i] + (radii[i + 1] - radii[i]) * f) * (1 + rib_depth)
                    d = d0.lerp(d1, f)
                    tuft(verts, faces, cols, p + d.normalized() * r, d, t0, spines['n'], spines['len'], spines.get('w', 0.012), spines['col'])
    if cap_end:
        ci = len(verts)
        verts.append(points[-1])
        for k in range(segs):
            faces.append([(n - 1) * segs + k, (n - 1) * segs + (k + 1) % segs, ci])
            cols.append(col_a)
    if cap_start:
        ci = len(verts)
        verts.append(points[0])
        for k in range(segs):
            faces.append([(k + 1) % segs, k, ci])
            cols.append(col_a)
    return verts, faces, cols


def dome_profile(h, r, steps=4):
    """Rounded cap: list of (height_offset, radius) climbing from the shoulder to the tip."""
    pr = []
    for s in range(1, steps + 1):
        a = (math.pi / 2) * s / steps
        pr.append((r * math.sin(a), max(0.02, r * math.cos(a))))
    return pr


def straight(p0, p1, n):
    return [p0.lerp(p1, i / (n - 1)) for i in range(n)]


def arm_path(length, rise, bend_r, n=14):
    """Starts at the origin going +X, curves up and ends going +Z (saguaro arm)."""
    pts = []
    straight_len = max(0.01, length - bend_r)
    for i in range(5):
        pts.append(Vector((straight_len * i / 4, 0, 0)))
    for i in range(1, 6):
        a = (math.pi / 2) * i / 5
        pts.append(Vector((straight_len + bend_r * math.sin(a), 0, bend_r * (1 - math.cos(a)))))
    top = pts[-1]
    for i in range(1, 6):
        pts.append(top + Vector((0, 0, (rise - bend_r) * i / 5)))
    return pts


def sphere(center, radii, rings=5, segs=8, color=None):
    verts, faces, cols = [], [], []
    cx, cy, cz = center
    rx, ry, rz = radii
    verts.append(Vector((cx, cy, cz + rz)))
    for r in range(1, rings):
        phi = math.pi * r / rings
        for k in range(segs):
            th = 2 * math.pi * k / segs
            verts.append(Vector((cx + rx * math.sin(phi) * math.cos(th), cy + ry * math.sin(phi) * math.sin(th), cz + rz * math.cos(phi))))
    verts.append(Vector((cx, cy, cz - rz)))
    last = len(verts) - 1
    for k in range(segs):
        faces.append([0, 1 + (k + 1) % segs, 1 + k]); cols.append(color)
    for r in range(rings - 2):
        for k in range(segs):
            a = 1 + r * segs + k
            b = 1 + r * segs + (k + 1) % segs
            c = 1 + (r + 1) * segs + (k + 1) % segs
            d = 1 + (r + 1) * segs + k
            faces.append([a, b, c, d]); cols.append(color)
    base = 1 + (rings - 2) * segs
    for k in range(segs):
        faces.append([last, base + k, base + (k + 1) % segs]); cols.append(color)
    return verts, faces, cols


def box(center, size, color):
    cx, cy, cz = center
    sx, sy, sz = (s / 2 for s in size)
    v = [(cx + x * sx, cy + y * sy, cz + z * sz) for z in (-1, 1) for y in (-1, 1) for x in (-1, 1)]
    f = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
    return v, f, [color] * 6


def export(root_names, filename):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        o.select_set(True)
    path = os.path.join(OUT, filename)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_extras=True,
        export_yup=True, export_apply=True,
    )
    print('EXPORTED', path, os.path.getsize(path), 'bytes')


# ---------- palette -------------------------------------------------------------
SAG_A, SAG_B = srgb('#5f8a4a'), srgb('#4f7a40')
SAG_TOP = srgb('#8fb066')
PEAR_A, PEAR_B = srgb('#4d8a6a'), srgb('#6aa383')
FRUIT = srgb('#b3345e')
FLOWER_Y = srgb('#f0c43a')
BARREL_A, BARREL_B = srgb('#6f9a58'), srgb('#5a8447')
CHOLLA_A, CHOLLA_B = srgb('#d7b86a'), srgb('#bf9c52')
CANE = srgb('#6b5a46')
LEAF = srgb('#6fae3b')
BLOOM = srgb('#d6361f')
ORGAN_A, ORGAN_B = srgb('#4c7d5a'), srgb('#3f6b4d')
WHITE_FL = srgb('#f6efe0')
SPINE = srgb('#eadfbf')
SPINE_RED = srgb('#c98a62')
SPINE_GOLD = srgb('#f3e3a0')


# ---------- plants --------------------------------------------------------------
def saguaro():
    reset_scene()
    H, R = 9.0, 0.5
    root = empty('Plant', props={'plant': 'saguaro', 'height': H})
    # trunk
    pts = [Vector((0, 0, H * i / 18)) for i in range(19)]
    rad = [R * (0.92 + 0.08 * math.sin(i / 18 * math.pi)) for i in range(19)]
    for off, rr in dome_profile(0, R, 4):
        pts.append(Vector((0, 0, H + off * 0.9)))
        rad.append(rr)
    v, f, c = tube(pts, rad, segs=16, rib_depth=0.08, col_a=SAG_A, col_b=SAG_B, grad=SAG_TOP, spines={'len': 0.17, 'n': 3, 'sub': 4, 'col': SPINE, 'w': 0.014})
    trunk = Mesh(); trunk.add(v, f, lambda i: c[i])
    t = trunk.build('Trunk', parent=root, props={'grow_start': 0.0, 'grow_dur': 0.55, 'kind': 'trunk'})
    # white flowers crowning the top
    fm = Mesh()
    for k in range(5):
        a = 2 * math.pi * k / 5
        v, f, c = sphere((math.cos(a) * 0.28, math.sin(a) * 0.28, H + 0.35), (0.14, 0.14, 0.1), 3, 6, WHITE_FL)
        fm.add(v, f, c)
    fm.build('Flowers', parent=root, props={'grow_start': 0.9, 'grow_dur': 0.1, 'kind': 'bloom'})
    # arms: (side, attach height, reach, rise, order)
    arms = [(1, 3.2, 1.7, 3.2, 0.50), (-1, 4.1, 1.5, 2.8, 0.62), (1, 5.2, 1.2, 2.0, 0.74)]
    for idx, (side, az, reach, rise, st) in enumerate(arms):
        ap = arm_path(reach, rise, 0.7)
        ar = [0.32 * (1 - 0.15 * (i / len(ap))) for i in range(len(ap))]
        ar[-1] = 0.2
        v, f, c = tube(ap, ar, segs=12, rib_depth=0.08, col_a=SAG_A, col_b=SAG_B, grad=SAG_TOP, spines={'len': 0.15, 'n': 3, 'sub': 3, 'col': SPINE, 'w': 0.013})
        # mirror in X for the left-hand arms
        if side < 0:
            v = [Vector((-p.x, p.y, p.z)) for p in v]
            f = [list(reversed(face)) for face in f]
        m = Mesh(); m.add(v, f, lambda i, c=c: c[i])
        m.build(f'Arm_{idx + 1}', parent=t, loc=(side * R * 0.85, 0, az),
                props={'grow_start': st, 'grow_dur': 0.26, 'kind': 'arm'})
    export([root.name], 'saguaro.glb')


def prickly_pear():
    reset_scene()
    root = empty('Plant', props={'plant': 'prickly_pear', 'height': 2.3})

    def pad(name, parent, loc, rot, size, st, dur, fruit=0):
        w, l = size
        m = Mesh()
        v, f, c = sphere((0, 0, l * 0.5), (w * 0.5, 0.09, l * 0.5), 5, 10, PEAR_A)
        for i in range(len(c)):
            c[i] = PEAR_A if i % 2 == 0 else PEAR_B
        m.add(v, f, c)
        rx, ry, rz, cz = w * 0.5, 0.09, l * 0.5, l * 0.5
        for idx, p in enumerate(v):
            if idx % 2 or abs(p.y) < 0.045:
                continue
            nrm = Vector((p.x / (rx * rx), p.y / (ry * ry), (p.z - cz) / (rz * rz))).normalized()
            tv, tf, tc = [], [], []
            tuft(tv, tf, tc, p, nrm, Vector((0, 0, 1)), 2, 0.13, 0.011, SPINE)
            m.add(tv, tf, tc)
        for k in range(fruit):
            a = math.pi * (0.25 + 0.5 * k / max(1, fruit - 1))
            fx, fz = math.cos(a) * w * 0.38, l * 0.98 + math.sin(a) * 0.05
            v, f, c = sphere((fx, 0.05, fz), (0.07, 0.07, 0.09), 3, 6, FRUIT)
            m.add(v, f, c)
        return m.build(name, parent=parent, loc=loc, rot=rot, props={'grow_start': st, 'grow_dur': dur, 'kind': 'pad'})

    base = pad('Pad_0', root, (0, 0, 0), (0, 0, 0), (0.9, 1.0), 0.0, 0.3)
    p1 = pad('Pad_1', base, (-0.12, 0, 0.9), (0, math.radians(-28), 0), (0.85, 0.95), 0.25, 0.25, 3)
    p2 = pad('Pad_2', base, (0.14, 0, 0.9), (0, math.radians(30), 0), (0.85, 0.95), 0.3, 0.25, 4)
    p3 = pad('Pad_3', p1, (-0.1, 0, 0.88), (0, math.radians(-24), 0), (0.8, 0.9), 0.5, 0.25, 4)
    p4 = pad('Pad_4', p2, (0.12, 0, 0.88), (0, math.radians(26), 0), (0.8, 0.9), 0.55, 0.25, 3)
    p5 = pad('Pad_5', p1, (0.12, 0, 0.8), (0, math.radians(32), 0), (0.7, 0.8), 0.62, 0.22, 3)
    p6 = pad('Pad_6', p2, (-0.1, 0, 0.8), (0, math.radians(-34), 0), (0.7, 0.8), 0.68, 0.22, 3)
    p7 = pad('Pad_7', p3, (0, 0, 0.8), (0, math.radians(8), 0), (0.65, 0.75), 0.8, 0.2, 5)
    export([root.name], 'prickly_pear.glb')


def barrel():
    reset_scene()
    H, R = 1.25, 0.62
    root = empty('Plant', props={'plant': 'barrel', 'height': H})
    n = 14
    pts, rad = [], []
    for i in range(n + 1):
        z = H * i / n
        u = (z - H / 2) / (H / 2)
        pts.append(Vector((0, 0, z)))
        rad.append(max(0.03, R * math.sqrt(max(0.0, 1 - u * u * 0.92))))
    v, f, c = tube(pts, rad, segs=24, rib_depth=0.1, col_a=BARREL_A, col_b=BARREL_B, grad=srgb('#9fbf6b'), cap_start=True, cap_end=True, spines={'len': 0.24, 'n': 4, 'sub': 2, 'col': SPINE_RED, 'w': 0.016})
    body = Mesh(); body.add(v, f, lambda i: c[i])
    b = body.build('Body', parent=root, props={'grow_start': 0.0, 'grow_dur': 0.8, 'kind': 'trunk'})
    fl = Mesh()
    for k in range(9):
        a = 2 * math.pi * k / 9
        r = 0.2 + 0.1 * (k % 2)
        v, f, c = sphere((math.cos(a) * r, math.sin(a) * r, H + 0.03), (0.09, 0.09, 0.07), 3, 6, FLOWER_Y)
        fl.add(v, f, c)
    fl.build('Flowers', parent=root, props={'grow_start': 0.85, 'grow_dur': 0.15, 'kind': 'bloom'})
    export([root.name], 'barrel.glb')


def cholla():
    reset_scene()
    root = empty('Plant', props={'plant': 'cholla', 'height': 1.9})

    def seg_chain(name, parent, loc, rot, length, thick, st, dur, count=3):
        m = Mesh()
        z = 0.0
        for i in range(count):
            l = length / count * (1.0 if i < count - 1 else 1.1)
            jx, jy = random.uniform(-0.03, 0.03), random.uniform(-0.03, 0.03)
            rxy, rz_ = thick * (1 - 0.1 * i), l * 0.62
            v, f, c = sphere((jx, jy, z + l / 2), (rxy, rxy, rz_), 4, 8, CHOLLA_A)
            for j in range(len(c)):
                c[j] = CHOLLA_A if j % 3 else CHOLLA_B
            m.add(v, f, c)
            for p in v:
                nrm = Vector(((p.x - jx) / (rxy * rxy), (p.y - jy) / (rxy * rxy), (p.z - (z + l / 2)) / (rz_ * rz_))).normalized()
                tv, tf, tc = [], [], []
                tuft(tv, tf, tc, p, nrm, Vector((0, 0, 1)), 3, 0.17, 0.012, SPINE_GOLD, spread=0.6)
                m.add(tv, tf, tc)
            z += l * 0.82
        return m.build(name, parent=parent, loc=loc, rot=rot, props={'grow_start': st, 'grow_dur': dur, 'kind': 'branch'})

    trunk = seg_chain('Trunk', root, (0, 0, 0), (0, 0, 0), 0.9, 0.22, 0.0, 0.35, 3)
    top = (0, 0, 0.78)
    specs = [(-0.1, 38, 0, 0.9), (0.1, -40, 40, 0.85), (0.0, 12, 120, 0.8), (0.05, -20, 220, 0.75), (-0.05, 30, 300, 0.7)]
    for i, (zoff, tilt, yaw, ln) in enumerate(specs):
        br = seg_chain(f'Branch_{i + 1}', trunk, (0, 0, 0.55 + 0.1 * i), (math.radians(tilt), 0, math.radians(yaw)), ln, 0.17, 0.3 + 0.1 * i, 0.3, 3)
        for j in range(2):
            seg_chain(f'Twig_{i + 1}_{j + 1}', br, (0, 0, ln * 0.7), (math.radians(random.uniform(-45, 45)), 0, math.radians(90 + 180 * j)), 0.5, 0.12, 0.6 + 0.07 * i, 0.25, 2)
    export([root.name], 'cholla.glb')


def ocotillo():
    reset_scene()
    root = empty('Plant', props={'plant': 'ocotillo', 'height': 5.6})
    n_canes = 11
    for i in range(n_canes):
        a = 2 * math.pi * i / n_canes + random.uniform(-0.2, 0.2)
        H = random.uniform(4.4, 5.8)
        lean = random.uniform(0.7, 1.7)
        pts, rad = [], []
        for s in range(13):
            u = s / 12
            pts.append(Vector((math.cos(a) * lean * u * u * 1.2, math.sin(a) * lean * u * u * 1.2, H * u)))
            rad.append(0.075 * (1 - 0.65 * u) + 0.012)
        v, f, c = tube(pts, rad, segs=6, rib_depth=0.0, col_a=CANE, col_b=None, cap_start=True, cap_end=True)
        cane = Mesh(); cane.add(v, f, lambda k, c=c: c[k])
        # leaves: little green blades spiralling up the cane
        fr = frames_along(pts)
        for s in range(3, 12):
            for side in (0, 1):
                t, nrm, bn = fr[s]
                th = s * 2.4 + side * math.pi
                d = nrm * math.cos(th) + bn * math.sin(th)
                p0 = pts[s] + d * rad[s]
                p1 = p0 + d * 0.28 + t * 0.12
                w = bn * 0.035
                quad = [p0 - w, p0 + w, p1 + w * 0.2, p1 - w * 0.2]
                cane.add(quad, [[0, 1, 2, 3]], LEAF)
                cane.add(quad, [[3, 2, 1, 0]], LEAF)  # back face gets its own vertices
        for s in range(1, 12):
            for side in range(3):
                t, nrm, bn = fr[s]
                th = s * 1.7 + side * 2.1
                d = nrm * math.cos(th) + bn * math.sin(th)
                tv, tf, tc = [], [], []
                tuft(tv, tf, tc, pts[s] + d * rad[s], d, t, 1, 0.08, 0.009, srgb('#9b8466'))
                cane.add(tv, tf, tc)
        # red bloom at the tip
        tip = pts[-1]
        for k in range(4):
            tt = tip - fr[-1][0] * 0.09 * k
            v, f, c2 = sphere((tt.x, tt.y, tt.z), (0.07 - 0.008 * k, 0.07 - 0.008 * k, 0.1), 3, 6, BLOOM)
            cane.add(v, f, c2)
        cane.build(f'Cane_{i + 1}', parent=root, props={'grow_start': 0.5 * (i / n_canes), 'grow_dur': 0.45, 'kind': 'cane'})
    export([root.name], 'ocotillo.glb')


def organ_pipe():
    reset_scene()
    root = empty('Plant', props={'plant': 'organ_pipe', 'height': 5.0})
    n = 8
    for i in range(n):
        a = 2 * math.pi * i / n + random.uniform(-0.15, 0.15)
        H = random.uniform(3.4, 5.0) if i else 5.0
        spread = random.uniform(0.9, 1.5) if i else 0.2
        pts, rad = [], []
        for s in range(15):
            u = s / 14
            bend = u ** 1.6
            pts.append(Vector((math.cos(a) * spread * bend, math.sin(a) * spread * bend, H * u)))
            rad.append(0.2 * (0.95 + 0.05 * math.sin(u * math.pi)))
        for off, rr in dome_profile(0, 0.2, 3):
            tip = pts[-1]
            pts.append(Vector((tip.x, tip.y, tip.z + off * 0.8)))
            rad.append(rr)
        v, f, c = tube(pts, rad, segs=12, rib_depth=0.11, col_a=ORGAN_A, col_b=ORGAN_B, grad=srgb('#79a97c'), spines={'len': 0.13, 'n': 3, 'sub': 3, 'col': SPINE, 'w': 0.012})
        m = Mesh(); m.add(v, f, lambda k, c=c: c[k])
        m.build(f'Stem_{i + 1}', parent=root, props={'grow_start': 0.45 * (i / n), 'grow_dur': 0.5, 'kind': 'trunk'})
    export([root.name], 'organ_pipe.glb')


# ---------- the hiker (smooth, animated-film proportions) ------------------------
def loft(sections, segs=16, col=None, cap_top=True, cap_bot=True):
    """Elliptical loft through sections [(z, rx, ry, cx, cy), ...]. col(i, k) -> colour per quad."""
    verts, faces, cols = [], [], []
    for (z, rx, ry, cx, cy) in sections:
        for k in range(segs):
            th = 2 * math.pi * k / segs
            verts.append(Vector((cx + rx * math.cos(th), cy + ry * math.sin(th), z)))
    n = len(sections)
    for i in range(n - 1):
        for k in range(segs):
            a, b = i * segs + k, i * segs + (k + 1) % segs
            c, d = (i + 1) * segs + (k + 1) % segs, (i + 1) * segs + k
            faces.append([a, b, c, d])
            cols.append(col(i, k) if col else (0.5, 0.5, 0.5, 1))
    if cap_top:
        z, rx, ry, cx, cy = sections[-1]
        ci = len(verts); verts.append(Vector((cx, cy, z)))
        for k in range(segs):
            faces.append([(n - 1) * segs + k, (n - 1) * segs + (k + 1) % segs, ci])
            cols.append(col(n - 2, k) if col else (0.5, 0.5, 0.5, 1))
    if cap_bot:
        z, rx, ry, cx, cy = sections[0]
        ci = len(verts); verts.append(Vector((cx, cy, z)))
        for k in range(segs):
            faces.append([(k + 1) % segs, k, ci])
            cols.append(col(0, k) if col else (0.5, 0.5, 0.5, 1))
    return verts, faces, cols


def revolve(profile, segs=22, colors=None):
    """Spin a (radius, z) profile around Z: used for the hat."""
    verts, faces, cols = [], [], []
    for (r, z) in profile:
        for k in range(segs):
            th = 2 * math.pi * k / segs
            verts.append(Vector((r * math.cos(th), r * math.sin(th), z)))
    for i in range(len(profile) - 1):
        for k in range(segs):
            a, b = i * segs + k, i * segs + (k + 1) % segs
            c, d = (i + 1) * segs + (k + 1) % segs, (i + 1) * segs + k
            faces.append([a, b, c, d])
            cols.append(colors[i] if colors else (0.6, 0.5, 0.3, 1))
    ci = len(verts); verts.append(Vector((0, 0, profile[-1][1])))
    for k in range(segs):
        faces.append([(len(profile) - 1) * segs + k, (len(profile) - 1) * segs + (k + 1) % segs, ci])
        cols.append(colors[-1] if colors else (0.6, 0.5, 0.3, 1))
    # underside of the brim so it is not see-through
    ci2 = len(verts); verts.append(Vector((0, 0, profile[0][1])))
    for k in range(segs):
        faces.append([(k + 1) % segs, k, ci2])
        cols.append(colors[0] if colors else (0.6, 0.5, 0.3, 1))
    return verts, faces, cols


def hiker():
    reset_scene()
    root = empty('Hiker', props={'plant': 'hiker', 'height': 1.8})
    SKIN, SHIRT, JEANS = srgb('#d3a07a'), srgb('#b8552a'), srgb('#3f5575')
    BOOT, PACK, HAT, HATBAND = srgb('#40291c'), srgb('#6d5a3a'), srgb('#c8a468'), srgb('#5a3b22')
    HAIR, BELT, ROLL, STRAP = srgb('#3a2a1e'), srgb('#2e2218'), srgb('#c9b38a'), srgb('#4a3a22')
    SKIN_SH = mix(SKIN, srgb('#a9795a'), 0.5)

    def part(name, pieces, loc):
        m = Mesh()
        for v, f, c in pieces:
            m.add(v, f, c)
        return m.build(name, parent=root, loc=loc, smooth=True)

    # ---- torso: waist -> chest -> shoulders, belt and collar as colour bands
    torso_secs = [(0.0, 0.165, 0.105, 0, 0), (0.07, 0.155, 0.10, 0, 0), (0.2, 0.165, 0.105, 0, 0.005),
                  (0.38, 0.19, 0.12, 0, 0.012), (0.52, 0.205, 0.12, 0, 0.0), (0.6, 0.15, 0.09, 0, 0.0), (0.66, 0.07, 0.07, 0, 0.0)]
    def torso_col(i, k):
        if i == 0: return BELT
        if i >= 5: return SKIN_SH
        return SHIRT if k % 2 else mix(SHIRT, (0.55, 0.15, 0.05, 1), 0.12)
    part('Torso', [loft(torso_secs, 18, torso_col)], (0, 0, 1.0))

    # ---- pack: rounded body, flap, bedroll across the top, canteen, straps
    pack_secs = [(0.0, 0.15, 0.085, 0, -0.17), (0.12, 0.175, 0.095, 0, -0.19), (0.34, 0.18, 0.10, 0, -0.20), (0.5, 0.15, 0.085, 0, -0.19)]
    pk = [loft(pack_secs, 16, lambda i, k: PACK)]
    roll = [Vector((-0.24, -0.21, 0.56)), Vector((0.0, -0.21, 0.56)), Vector((0.24, -0.21, 0.56))]
    pk.append(tube(roll, [0.065, 0.07, 0.065], segs=12, col_a=ROLL, cap_start=True, cap_end=True)[:3])
    can = [Vector((0.19, -0.19, 0.12)), Vector((0.19, -0.19, 0.3))]
    pk.append(tube(can, [0.05, 0.05], segs=10, col_a=srgb('#8a6a3a'))[:3])
    strap_l = [Vector((-0.1, -0.1, 0.52)), Vector((-0.12, -0.04, 0.36)), Vector((-0.11, -0.1, 0.05))]
    strap_r = [Vector((0.1, -0.1, 0.52)), Vector((0.12, -0.04, 0.36)), Vector((0.11, -0.1, 0.05))]
    pk.append(tube(strap_l, [0.025, 0.025, 0.025], segs=6, col_a=STRAP)[:3])
    pk.append(tube(strap_r, [0.025, 0.025, 0.025], segs=6, col_a=STRAP)[:3])
    part('Pack', pk, (0, 0, 1.0))

    # ---- head: skull, neck, ears, nose, hair, wide-brim hat
    head = [sphere((0, 0, 0.12), (0.095, 0.105, 0.115), 8, 14, SKIN),
            sphere((0, -0.025, 0.145), (0.1, 0.105, 0.105), 7, 14, HAIR),
            sphere((0, 0.098, 0.105), (0.018, 0.026, 0.026), 4, 8, SKIN),
            sphere((-0.098, 0.0, 0.11), (0.02, 0.03, 0.04), 4, 8, SKIN),
            sphere((0.098, 0.0, 0.11), (0.02, 0.03, 0.04), 4, 8, SKIN)]
    neck = tube([Vector((0, 0, -0.07)), Vector((0, 0, 0.03))], [0.05, 0.048], segs=10, col_a=SKIN_SH)
    head.append(neck[:3])
    hat_profile = [(0.255, 0.215), (0.2, 0.222), (0.135, 0.226), (0.108, 0.235), (0.108, 0.285), (0.098, 0.318), (0.075, 0.332), (0.0, 0.336)]
    hat_cols = [HAT, HAT, HAT, HATBAND, HAT, HAT, HAT]
    head.append(revolve(hat_profile, 24, hat_cols))
    part('Head', head, (0, 0, 1.62))

    # ---- arms: rolled sleeve to the elbow, forearm and hand in skin, slight natural bend
    def arm(side):
        up = tube([Vector((0, 0, 0)), Vector((0, 0.01, -0.15)), Vector((0, 0.02, -0.29))], [0.058, 0.052, 0.046], segs=10, col_a=SHIRT, cap_start=True, cap_end=False)
        cuff = tube([Vector((0, 0.02, -0.29)), Vector((0, 0.022, -0.32))], [0.056, 0.056], segs=10, col_a=mix(SHIRT, (0.4, 0.1, 0.03, 1), 0.25), cap_start=False, cap_end=False)
        fore = tube([Vector((0, 0.022, -0.32)), Vector((0, 0.04, -0.46)), Vector((0, 0.05, -0.58))], [0.04, 0.036, 0.03], segs=10, col_a=SKIN, cap_start=False, cap_end=False)
        hand = sphere((0, 0.055, -0.63), (0.034, 0.04, 0.055), 5, 10, SKIN)
        return [up[:3], cuff[:3], fore[:3], hand]
    part('Arm_L', arm(-1), (-0.255, 0, 1.54))
    part('Arm_R', arm(1), (0.255, 0, 1.54))

    # ---- legs: jeans with a little taper, boots with shaft and sole
    def leg():
        jeans = tube([Vector((0, 0, 0.0)), Vector((0, 0.01, -0.22)), Vector((0, 0.02, -0.46)), Vector((0, 0.0, -0.78))], [0.095, 0.082, 0.07, 0.06], segs=12, col_a=JEANS, cap_start=True, cap_end=False)
        shaft = tube([Vector((0, 0.0, -0.74)), Vector((0, 0.0, -0.88))], [0.066, 0.062], segs=12, col_a=BOOT, cap_start=False, cap_end=False)
        foot = sphere((0, 0.05, -0.92), (0.07, 0.15, 0.065), 6, 12, BOOT)
        sole = sphere((0, 0.05, -0.968), (0.074, 0.158, 0.03), 4, 12, srgb('#241710'))
        return [jeans[:3], shaft[:3], foot, sole]
    part('Leg_L', leg(), (-0.098, 0, 0.98))
    part('Leg_R', leg(), (0.098, 0, 0.98))
    export([root.name], 'hiker.glb')



if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv else []
    for fn in (saguaro, prickly_pear, barrel, cholla, ocotillo, organ_pipe, hiker):
        if not only or fn.__name__ in only:
            fn()
    print('ALL DONE')
