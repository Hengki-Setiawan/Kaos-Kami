import bpy
import bmesh
import os
import sys
import math
import mathutils

# Add current dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from apparel_builder_common import smoothstep, transfer_weights_kd, export_model, render_preview

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
models_dir = os.path.join(base_dir, 'kaos-kami-web', 'public', 'models')
mannequin_src = os.path.join(models_dir, 'mannequin.glb')

def init_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=mannequin_src)
    body = bpy.data.objects.get('Mannequin')
    arm = bpy.data.objects.get('Rig')
    arm.data.pose_position = 'REST'
    if arm.animation_data:
        arm.animation_data.action = None
    return body, arm

def cull_body_faces(body, z_min=0.96, z_max=1.46, x_max=0.30, cull_shoulders=True, cull_arms=False):
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(body.data)
    to_del = []
    for f in bm.faces:
        cw = body.matrix_world @ f.calc_center_median()
        # Torso
        if z_min < cw.z < z_max and abs(cw.x) < x_max:
            to_del.append(f)
        # Shoulders crests
        elif cull_shoulders and 1.46 <= cw.z < 1.53 and 0.10 < abs(cw.x) < 0.28 and abs(cw.y) < 0.15:
            to_del.append(f)
        # Arms under long sleeves
        elif cull_arms and 1.25 < cw.z < 1.55 and 0.18 < abs(cw.x) < 0.64:
            to_del.append(f)

    bmesh.ops.delete(bm, geom=to_del, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.update_edit_mesh(body.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    print(f"[CULL] Culled {len(to_del)} body faces")

def add_procedural_sleeves(bm, rad_start=0.072, rad_end=0.050, x_len=0.43):
    num_seg = 20
    num_rings = 12
    arm_y = -0.065
    arm_z = 1.427
    for sign, x_start in [(-1, -0.20), (1, 0.20)]:
        rings = []
        for r in range(num_rings):
            t = r / (num_rings - 1)
            x = x_start + sign * t * x_len
            rad = rad_start - t * (rad_start - rad_end)
            ring = [bm.verts.new((x, arm_y + math.sin(s*2*math.pi/num_seg)*rad, arm_z + math.cos(s*2*math.pi/num_seg)*rad)) for s in range(num_seg)]
            rings.append(ring)
        for r in range(num_rings - 1):
            for s in range(num_seg):
                sn = (s + 1) % num_seg
                if sign == -1:
                    bm.faces.new((rings[r][s], rings[r+1][s], rings[r+1][sn], rings[r][sn]))
                else:
                    bm.faces.new((rings[r][s], rings[r][sn], rings[r+1][sn], rings[r+1][s]))

# ==============================================================================
# 1. T-SHIRT (mannequin-tee.glb)
# ==============================================================================
def build_tee():
    print("\n>>> BUILDING MANNEQUIN-TEE.GLB <<<")
    body, arm = init_scene()

    shirt_src = os.path.join(models_dir, 'tshirt-heavyweight.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=shirt_src)
    shirt = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    shirt.name = 'Apparel_Tee'

    # Align & scale
    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    shirt.modifiers.clear()
    shirt.location = (0.0, -0.005, 1.20)
    shirt.scale = (1.12, 1.26, 1.12)
    bpy.ops.object.transform_apply(location=True, scale=True)

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    # Smooth sleeve lift
    pivot_l = mathutils.Vector((-0.19, -0.065, 1.427))
    pivot_r = mathutils.Vector((0.19, -0.065, 1.427))
    lift_angle = 32.0

    for v in shirt.data.vertices:
        x = v.co.x
        if x < -0.17:
            factor = smoothstep(-0.17, -0.23, -x)
            ang = math.radians(lift_angle * factor)
            rot = mathutils.Matrix.Rotation(ang, 4, 'Y')
            v.co = pivot_l + rot @ (v.co - pivot_l)
        elif x > 0.17:
            factor = smoothstep(0.17, 0.23, x)
            ang = math.radians(-lift_angle * factor)
            rot = mathutils.Matrix.Rotation(ang, 4, 'Y')
            v.co = pivot_r + rot @ (v.co - pivot_r)
    shirt.data.update()

    # Transfer weights before culling
    transfer_weights_kd(body, shirt)

    # Anti-clipping: cull abdomen, chest, and shoulder tips
    cull_body_faces(body, z_min=0.96, z_max=1.46, x_max=0.30, cull_shoulders=True, cull_arms=False)

    # Parent to armature
    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-tee.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_tee.png'))

# ==============================================================================
# 2. LONGSLEEVE (mannequin-longsleeve.glb)
# ==============================================================================
def build_longsleeve():
    print("\n>>> BUILDING MANNEQUIN-LONGSLEEVE.GLB <<<")
    body, arm = init_scene()

    shirt_src = os.path.join(models_dir, 'tshirt-heavyweight.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=shirt_src)
    shirt = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    shirt.name = 'Apparel_Longsleeve'

    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    shirt.modifiers.clear()
    shirt.location = (0.0, -0.005, 1.20)
    shirt.scale = (1.12, 1.26, 1.12)
    bpy.ops.object.transform_apply(location=True, scale=True)

    # Build procedural sleeves
    bm = bmesh.new()
    add_procedural_sleeves(bm, rad_start=0.072, rad_end=0.050, x_len=0.43)
    slv_mesh = bpy.data.meshes.new('SlvMesh')
    bm.to_mesh(slv_mesh)
    bm.free()
    slv_obj = bpy.data.objects.new('SlvObj', slv_mesh)
    bpy.context.scene.collection.objects.link(slv_obj)

    # Join sleeves with shirt
    bpy.ops.object.select_all(action='DESELECT')
    slv_obj.select_set(True)
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.join()

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    transfer_weights_kd(body, shirt)

    # Anti-clipping: cull body torso, shoulders, and arms under long sleeves
    cull_body_faces(body, z_min=0.96, z_max=1.46, x_max=0.30, cull_shoulders=True, cull_arms=True)

    # Parent to armature
    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-longsleeve.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_longsleeve.png'))

# ==============================================================================
# 3. SWEATER / CREWNECK (mannequin-sweater.glb)
# ==============================================================================
def build_sweater():
    print("\n>>> BUILDING MANNEQUIN-SWEATER.GLB <<<")
    body, arm = init_scene()

    shirt_src = os.path.join(models_dir, 'tshirt-heavyweight.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=shirt_src)
    shirt = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    shirt.name = 'Apparel_Sweater'

    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    shirt.modifiers.clear()
    # Cozy fleece sweater relaxed fit
    shirt.location = (0.0, -0.005, 1.20)
    shirt.scale = (1.15, 1.28, 1.15)
    bpy.ops.object.transform_apply(location=True, scale=True)

    # Heavier relaxed knit sleeves
    bm = bmesh.new()
    add_procedural_sleeves(bm, rad_start=0.076, rad_end=0.052, x_len=0.43)
    slv_mesh = bpy.data.meshes.new('SlvMesh')
    bm.to_mesh(slv_mesh)
    bm.free()
    slv_obj = bpy.data.objects.new('SlvObj', slv_mesh)
    bpy.context.scene.collection.objects.link(slv_obj)

    bpy.ops.object.select_all(action='DESELECT')
    slv_obj.select_set(True)
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.join()

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    transfer_weights_kd(body, shirt)
    cull_body_faces(body, z_min=0.96, z_max=1.46, x_max=0.30, cull_shoulders=True, cull_arms=True)

    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-sweater.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_sweater.png'))

# ==============================================================================
# 4. HOODIE (mannequin-hoodie.glb)
# ==============================================================================
def build_hoodie():
    print("\n>>> BUILDING MANNEQUIN-HOODIE.GLB <<<")
    body, arm = init_scene()

    shirt_src = os.path.join(models_dir, 'tshirt-heavyweight.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=shirt_src)
    shirt = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    shirt.name = 'Apparel_Hoodie'

    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    shirt.modifiers.clear()
    shirt.location = (0.0, -0.005, 1.20)
    shirt.scale = (1.14, 1.28, 1.14)
    bpy.ops.object.transform_apply(location=True, scale=True)

    bm = bmesh.new()
    # 1. Sleeves
    add_procedural_sleeves(bm, rad_start=0.075, rad_end=0.052, x_len=0.43)

    # 2. Folded Hood Resting on Upper Back
    hood_rings = 10
    hood_segs = 16
    h_grid = []
    for hr in range(hood_rings):
        u = hr / (hood_rings - 1)
        ring = []
        for hs in range(hood_segs):
            v = (hs / (hood_segs - 1) - 0.5) * 2.0
            ang = v * math.pi * 0.45
            width = 0.12 * (1.0 - 0.2 * u)
            x = math.sin(ang) * width
            y = -0.08 - math.cos(ang) * 0.06 - u * 0.09
            z = 1.48 - u * 0.14 + math.sin(u * math.pi) * 0.03
            ring.append(bm.verts.new((x, y, z)))
        h_grid.append(ring)

    for hr in range(hood_rings - 1):
        for hs in range(hood_segs - 1):
            bm.faces.new((h_grid[hr][hs], h_grid[hr+1][hs], h_grid[hr+1][hs+1], h_grid[hr][hs+1]))

    extra_mesh = bpy.data.meshes.new('ExtraMesh')
    bm.to_mesh(extra_mesh)
    bm.free()
    extra_obj = bpy.data.objects.new('ExtraObj', extra_mesh)
    bpy.context.scene.collection.objects.link(extra_obj)

    bpy.ops.object.select_all(action='DESELECT')
    extra_obj.select_set(True)
    shirt.select_set(True)
    bpy.context.view_layer.objects.active = shirt
    bpy.ops.object.join()

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    transfer_weights_kd(body, shirt)
    cull_body_faces(body, z_min=0.96, z_max=1.46, x_max=0.30, cull_shoulders=True, cull_arms=True)

    bpy.ops.object.select_all(action='DESELECT')
    shirt.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-hoodie.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_hoodie.png'))

# ==============================================================================
# 5. PANTS (mannequin-pants.glb)
# ==============================================================================
def build_pants():
    print("\n>>> BUILDING MANNEQUIN-PANTS.GLB <<<")
    body, arm = init_scene()

    pants_src = os.path.join(models_dir, 'pants.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=pants_src)
    pants = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    pants.name = 'Apparel_Pants'

    bpy.ops.object.select_all(action='DESELECT')
    pants.select_set(True)
    bpy.context.view_layer.objects.active = pants
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    pants.rotation_euler.x = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)

    zs = [v.co.z for v in pants.data.vertices]
    shift_z = 1.02 - max(zs)
    pants.location = (0.0, 0.0, shift_z)
    pants.scale = (1.08, 1.12, 1.0)
    bpy.ops.object.transform_apply(location=True, scale=True)

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    transfer_weights_kd(body, pants)
    cull_body_faces(body, z_min=0.10, z_max=0.98, x_max=0.30, cull_shoulders=False, cull_arms=False)

    bpy.ops.object.select_all(action='DESELECT')
    pants.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-pants.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_pants.png'))

# ==============================================================================
# 6. SHORTS (mannequin-shorts.glb)
# ==============================================================================
def build_shorts():
    print("\n>>> BUILDING MANNEQUIN-SHORTS.GLB <<<")
    body, arm = init_scene()

    shorts_src = os.path.join(models_dir, 'shorts.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=shorts_src)
    shorts = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    shorts.name = 'Apparel_Shorts'

    bpy.ops.object.select_all(action='DESELECT')
    shorts.select_set(True)
    bpy.context.view_layer.objects.active = shorts
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    shorts.scale = (0.01, 0.01, 0.01)
    shorts.rotation_euler.x = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True, scale=True)

    zs = [v.co.z for v in shorts.data.vertices]
    shift_z = 1.02 - max(zs)
    shorts.location = (0.0, 0.0, shift_z)
    shorts.scale = (1.10, 1.15, 1.0)
    bpy.ops.object.transform_apply(location=True, scale=True)

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    transfer_weights_kd(body, shorts)
    cull_body_faces(body, z_min=0.68, z_max=0.98, x_max=0.25, cull_shoulders=False, cull_arms=False)

    bpy.ops.object.select_all(action='DESELECT')
    shorts.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-shorts.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_shorts.png'))

# ==============================================================================
# 7. CAP (mannequin-cap.glb)
# ==============================================================================
def build_cap():
    print("\n>>> BUILDING MANNEQUIN-CAP.GLB <<<")
    body, arm = init_scene()

    cap_src = os.path.join(models_dir, 'cap.glb')
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=cap_src)
    cap = [o for o in bpy.data.objects if o not in existing and o.type == 'MESH'][0]
    cap.name = 'Apparel_Cap'

    bpy.ops.object.select_all(action='DESELECT')
    cap.select_set(True)
    bpy.context.view_layer.objects.active = cap
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')

    dec_mod = cap.modifiers.new(name="DecimateCap", type='DECIMATE')
    dec_mod.ratio = 0.08
    bpy.context.view_layer.objects.active = cap
    bpy.ops.object.modifier_apply(modifier="DecimateCap")

    xs = [v.co.x for v in cap.data.vertices]
    w = max(xs) - min(xs)
    if w > 0.40:
        scale_fac = 0.22 / w
        cap.scale = (scale_fac, scale_fac, scale_fac)
        bpy.ops.object.transform_apply(scale=True)

    # Visor pointing forward: rotation_euler.z = 180 deg (math.pi)
    cap.rotation_euler.z = math.pi
    bpy.ops.object.transform_apply(rotation=True)

    # Position cap on forehead brow
    cap.location = (0.0, 0.015, 1.62)
    bpy.ops.object.transform_apply(location=True)

    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o.name != 'RootNode':
            bpy.data.objects.remove(o, do_unlink=True)

    cap.vertex_groups.clear()
    vg_head = cap.vertex_groups.new(name='DEF-head')
    all_idx = [v.index for v in cap.data.vertices]
    vg_head.add(all_idx, 1.0, 'REPLACE')

    bpy.ops.object.select_all(action='DESELECT')
    cap.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE')

    out_glb = os.path.join(models_dir, 'mannequin-cap.glb')
    export_model(out_glb)
    render_preview(os.path.abspath('scripts/preview_suite_cap.png'))

if __name__ == '__main__':
    target = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'all'
    print(f"[MASTER SUITE] Running target: {target}")
    
    if target in ['tee', 'all']:
        build_tee()
    if target in ['longsleeve', 'all']:
        build_longsleeve()
    if target in ['sweater', 'all']:
        build_sweater()
    if target in ['hoodie', 'all']:
        build_hoodie()
    if target in ['cap', 'all']:
        build_cap()
    if target in ['pants']:
        build_pants()
    if target in ['shorts']:
        build_shorts()
    print("\n[MASTER SUITE] ALL COMPLETED SUCCESSFULLY!")
