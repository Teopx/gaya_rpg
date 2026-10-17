extends Node3D
var network := HybridNetworkClient.new()
var nations := HybridNationSystem.new()
var raids := HybridRaidManager.new()
var actors: Dictionary = {}
var nodes: Dictionary = {}
var current := ""
var target := Vector2.ZERO
var moving := false
var status := Label.new()
var self_state: Dictionary = {}
var last_snapshot: Dictionary = {}

func cube(position_value: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size
	mesh.mesh = shape
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	mesh.material_override = material
	mesh.position = position_value
	add_child(mesh)
	return mesh

func _ready() -> void:
	add_child(network)
	add_child(nations)
	add_child(raids)
	raids.network = network
	network.snapshot_received.connect(apply_snapshot)
	network.request_failed.connect(func(message: String): status.text = message)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-55, -30, 0)
	add_child(light)
	var camera := Camera3D.new()
	camera.position = Vector3(22, 26, 22)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 37
	add_child(camera)
	camera.look_at(Vector3.ZERO)
	cube(Vector3(0, -0.2, 0), Vector3(32, 0.3, 32), Color("4c7167"))
	cube(Vector3(0, 0, 4), Vector3(32, 0.04, 0.15), Color("be9087"))
	for i in 30:
		var x := float((i * 17) % 29 - 14)
		var z := float((i * 7) % 29 - 14)
		cube(Vector3(x, 0.8, z), Vector3(0.2, 1.6, 0.2), Color("758c80"))
		cube(Vector3(x, 2, z), Vector3(1, 1.4, 1), Color("b2a1d1"))
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := VBoxContainer.new()
	panel.position = Vector2(16, 16)
	layer.add_child(panel)
	status.text = "Entre na conta pela página principal e selecione um personagem."
	panel.add_child(status)
	var buttons := HBoxContainer.new()
	panel.add_child(buttons)
	for action in ["Coletar", "Atacar", "Raide", "Transformar", "Poção"]:
		var button := Button.new()
		button.text = action
		button.custom_minimum_size = Vector2(90, 48)
		button.pressed.connect(func(): perform_action(action))
		buttons.add_child(button)
	if OS.has_feature("web"):
		current = str(JavaScriptBridge.eval("new URLSearchParams(location.search).get('character') || ''", true))
		if not current.is_empty():
			network.join(current)

func apply_snapshot(data: Dictionary) -> void:
	last_snapshot = data
	raids.apply_snapshot(data)
	var present: Array = []
	for p in data.get("players", []):
		var id := str(p.id)
		present.append(id)
		if not actors.has(id):
			actors[id] = cube(Vector3.ZERO, Vector3(0.5, 1.4, 0.5), Color("d9ddb9") if id == current else Color("c497ab"))
		actors[id].position = Vector3(float(p.x), 0.7, float(p.z))
		if id == current:
			self_state = p
			nations.apply_server_affiliation(str(p.nation_id))
			status.text = "%s · Vida %s · Nação %s · Carta %s" % [p.name, p.hp, p.nation_id, data.get("inventory", {}).get("cards", 0)]
	for id in actors.keys():
		if id not in present:
			actors[id].queue_free()
			actors.erase(id)
	for instance in nodes.values():
		instance.queue_free()
	nodes.clear()
	for resource in data.get("nodes", []):
		nodes[resource.id] = cube(Vector3(float(resource.x), 0.3, float(resource.z)), Vector3(0.3, 0.6, 0.3), Color("a5e9d0"))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		set_target(event.position)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		set_target(event.position)

func set_target(screen: Vector2) -> void:
	var camera := get_viewport().get_camera_3d()
	var plane := Plane(Vector3.UP, 0)
	var hit = plane.intersects_ray(camera.project_ray_origin(screen), camera.project_ray_normal(screen))
	if hit is Vector3:
		target = Vector2(hit.x, hit.z)
		moving = true

func _process(_delta: float) -> void:
	if self_state.is_empty():
		return
	var axis := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if axis.length() > 0:
		moving = false
	elif moving:
		var offset := target - Vector2(float(self_state.x), float(self_state.z))
		axis = offset.normalized() if offset.length() > 0.2 else Vector2.ZERO
		moving = offset.length() > 0.2
	if axis.length() > 0:
		network.move(axis)

func perform_action(action: String) -> void:
	if self_state.is_empty():
		return
	match action:
		"Raide": raids.start_raid()
		"Transformar": network.intent({"type": "morph"})
		"Poção": network.intent({"type": "potion"})
		"Atacar":
			if last_snapshot.get("raid") is Dictionary:
				raids.attack_boss()
			else:
				for p in last_snapshot.get("players", []):
					if str(p.id) != current and str(p.nation_id) != nations.affiliation:
						network.intent({"type": "attack", "target": p.id})
						break
		"Coletar":
			for r in last_snapshot.get("nodes", []):
				if Vector2(float(r.x) - float(self_state.x), float(r.z) - float(self_state.z)).length() < 2.5:
					network.intent({"type": "collect", "target": r.id})
					break
