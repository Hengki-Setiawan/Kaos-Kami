import bpy
import bmesh
import os
import math
import mathutils

def smoothstep(e0, e1, v):
    t = max(0.0, min(1.0, (v - e0)/(e1 - e0)))
    return t * t * (3.0 - 2.0 * t)

def transfer_weights_kd(body, garment):
    kd = mathutils.kdtree.KDTree(len(body.data.vertices))
    for v in body.data.vertices:
        kd.insert(body.matrix_world @ v.co, v.index)
    kd.balance()

    body_vg_names = {vg.index: vg.name for vg in body.vertex_groups}
    garment.vertex_groups.clear()
    garment_vg_map = {name: garment.vertex_groups.new(name=name) for name in body_vg_names.values()}

    for gv in garment.data.vertices:
        world_pos = garment.matrix_world @ gv.co
        co, index, dist = kd.find(world_pos)
        bv = body.data.vertices[index]
        for g in bv.groups:
            vg_name = body_vg_names[g.group]
            garment_vg_map[vg_name].add([gv.index], g.weight, 'REPLACE')

    bpy.context.view_layer.objects.active = garment
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

def export_model(out_path):
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_skins=True,
        export_def_bones=True,
        export_animations=True,
        export_materials='EXPORT',
        export_yup=True
    )
    print(f"[EXPORT] Successfully saved to {out_path} ({os.path.getsize(out_path):,} bytes)")

def render_preview(out_png, frame=15):
    arm = bpy.data.objects.get('Rig')
    if arm:
        arm.data.pose_position = 'POSE'
        walk_act = [a for a in bpy.data.actions if 'Walk_Loop' in a.name]
        if walk_act:
            arm.animation_data_create()
            arm.animation_data.action = walk_act[0]
            bpy.context.scene.frame_set(frame)

    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = (0.0, 2.5, 1.1)
    cam.rotation_euler = (math.radians(92), 0, math.radians(180))

    light_data = bpy.data.lights.new('KeyLight', 'SUN')
    light_data.energy = 4.0
    light = bpy.data.objects.new('KeyLight', light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = (1.0, 2.5, 2.5)
    light.rotation_euler = (math.radians(45), math.radians(-15), math.radians(180))

    fill_data = bpy.data.lights.new('FillLight', 'SUN')
    fill_data.energy = 1.5
    fill = bpy.data.objects.new('FillLight', fill_data)
    bpy.context.scene.collection.objects.link(fill)
    fill.location = (-1.0, 2.0, 1.5)
    fill.rotation_euler = (math.radians(30), math.radians(30), math.radians(180))

    bpy.context.scene.render.resolution_x = 400
    bpy.context.scene.render.resolution_y = 400
    bpy.context.scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print(f"[RENDER] Preview rendered to {out_png}")
