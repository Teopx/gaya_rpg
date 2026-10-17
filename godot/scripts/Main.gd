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
var soundtrack := GayaSoundtrack.new()
var progression: Dictionary = {}
var madregona: Dictionary = {}
var madregona_actor: MeshInstance3D
var character_status := Label.new()

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
	add_child(soundtrack)
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
	var music_controls := HBoxContainer.new()
	panel.add_child(music_controls)
	var music_toggle := CheckButton.new()
	music_toggle.text = "Trilha de GAYA"
	music_toggle.toggled.connect(soundtrack.set_enabled)
	music_controls.add_child(music_toggle)
	var music_volume := HSlider.new()
	music_volume.min_value = 0
	music_volume.max_value = 1
	music_volume.step = 0.01
	music_volume.value = soundtrack.loudness
	music_volume.custom_minimum_size = Vector2(120, 44)
	music_volume.tooltip_text = "Volume da trilha sonora"
	music_volume.value_changed.connect(soundtrack.set_loudness)
	music_controls.add_child(music_volume)
	panel.add_child(character_status)
	var management := VBoxContainer.new()
	var management_scroll := ScrollContainer.new()
	management_scroll.custom_minimum_size = Vector2(340, 260)
	management_scroll.add_child(management)
	management_scroll.visible = false
	var manage_button := Button.new()
	manage_button.text = "Desenvolver personagem"
	manage_button.pressed.connect(func(): management_scroll.visible = not management_scroll.visible)
	panel.add_child(manage_button)
	panel.add_child(management_scroll)
	for stat in ["vitality", "power", "spirit"]:
		var stat_button := Button.new()
		stat_button.text = {"vitality": "+1 Vitalidade (+10 HP máximo)", "power": "+1 Poder (+2 ataque)", "spirit": "+1 Espírito (+5 energia)"}[stat]
		stat_button.pressed.connect(func(): network.intent({"type": "attribute", "stat": stat}))
		management.add_child(stat_button)
	for slot in [1, 2]:
		var skill_select := OptionButton.new()
		for skill in ["Sopro restaurador", "Pulso da centelha", "Véu de sombras", "Garra umbral"]:
			skill_select.add_item(skill)
		var equip_button := Button.new()
		equip_button.text = "Equipar habilidade %s no santuário" % slot
		equip_button.pressed.connect(func(): network.intent({"type": "equip", "slot": slot, "skill": ["mend", "pulse", "veil", "shadow"][skill_select.selected]}))
		management.add_child(skill_select)
		management.add_child(equip_button)
	var rest_button := Button.new()
	rest_button.text = "Descansar no santuário"
	rest_button.pressed.connect(func(): network.intent({"type": "rest"}))
	management.add_child(rest_button)
	for form in ["origin", "madregona"]:
		var form_button := Button.new()
		form_button.text = "Forma original" if form == "origin" else "Forma Madregona (requer vitória)"
		form_button.pressed.connect(func(): network.intent({"type": "form", "form": form}))
		management.add_child(form_button)
	var disguise := OptionButton.new()
	disguise.add_item("Sombra revelada")
	var animals: Array[String] = [""]
	for fauna in HybridCharacterManager.FAUNA.values():
		for animal in fauna:
			animals.append(str(animal))
			disguise.add_item(str(animal))
	disguise.item_selected.connect(func(index: int): network.intent({"type": "disguise", "animal": animals[index]}))
	management.add_child(disguise)
	var buttons := HBoxContainer.new()
	panel.add_child(buttons)
	for action in ["Coletar", "Atacar", "Raide", "Transformar", "Poção", "Rastrear", "Habilidade Q", "Habilidade R"]:
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
	progression = data.get("progression", {})
	madregona = data.get("madregona", {}) if data.get("madregona") is Dictionary else {}
	raids.apply_snapshot(data)
	var present: Array = []
	for p in data.get("players", []):
		var id := str(p.id)
		present.append(id)
		if not actors.has(id):
			actors[id] = cube(Vector3.ZERO, Vector3(0.5, 1.4, 0.5), Color("d9ddb9") if id == current else Color("c497ab"))
		actors[id].position = Vector3(float(p.x), 0.7, float(p.z))
		var material := actors[id].material_override as StandardMaterial3D
		material.albedo_color = Color("73558c") if p.get("active_form") == "madregona" and str(p.get("disguise_animal", "")).is_empty() else Color("d9ddb9") if id == current else Color("c497ab")
		if id == current:
			self_state = p
			nations.apply_server_affiliation(str(p.nation_id))
			status.text = "%s · HP %s/%s · Nação %s" % [p.name, p.hp, p.get("max_hp", 100), p.nation_id]
	var level := mini(20, int((1.0 + sqrt(1.0 + 4.0 * float(progression.get("xp", 0)) / 50.0)) / 2.0))
	var points := level * 3 - int(progression.get("vitality", 0)) - int(progression.get("power", 0)) - int(progression.get("spirit", 0))
	character_status.text = "Nível %s · %s XP · %s pontos · Energia %s · %s" % [level, progression.get("xp", 0), points, int(progression.get("energy", 60)), "Madregona conquistada" if progression.get("madregona_unlocked", 0) else "Forma Madregona bloqueada"]
	if not madregona.is_empty() and int(madregona.get("hp", 0)) > 0:
		if not is_instance_valid(madregona_actor):
			madregona_actor = cube(Vector3.ZERO, Vector3(0.6, 1.6, 0.6), Color("73558c"))
		madregona_actor.position = Vector3(float(madregona.x), 0.8, float(madregona.z))
		(madregona_actor.material_override as StandardMaterial3D).albedo_color = Color("73558c") if madregona.get("revealed", 0) else Color("d9ddb9")
	elif is_instance_valid(madregona_actor):
		madregona_actor.queue_free()
	var shadow_near := not madregona.is_empty() and int(madregona.get("hp", 0)) > 0 and bool(madregona.get("revealed", 0)) and Vector2(float(madregona.x)-float(self_state.get("x", 0)), float(madregona.z)-float(self_state.get("z", 0))).length() < 6
	soundtrack.update_scene(self_state, data.get("raid") is Dictionary, float(self_state.get("morph_until", 0)) > float(data.get("server_time", 0)), shadow_near)
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
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_Q: perform_action("Habilidade Q")
		if event.physical_keycode == KEY_R: perform_action("Habilidade R")
	elif event is InputEventScreenTouch and event.pressed:
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
		"Rastrear": network.intent({"type": "hunt"})
		"Habilidade Q", "Habilidade R":
			var target_id := ""
			if not madregona.is_empty() and int(madregona.get("hp", 0)) > 0 and Vector2(float(madregona.x)-float(self_state.x), float(madregona.z)-float(self_state.z)).length() <= 3:
				target_id = "madregona"
			elif last_snapshot.get("raid") is Dictionary and Vector2(float(self_state.x), float(self_state.z)-7).length() <= 3:
				target_id = "boss"
			else:
				for p in last_snapshot.get("players", []):
					if str(p.id) != current and str(p.nation_id) != nations.affiliation:
						target_id = str(p.id)
						break
			network.intent({"type": "skill", "slot": 1 if action == "Habilidade Q" else 2, "target": target_id})
		"Raide": raids.start_raid()
		"Transformar": network.intent({"type": "morph"})
		"Poção": network.intent({"type": "potion"})
		"Atacar":
			if not madregona.is_empty() and int(madregona.get("hp", 0)) > 0 and Vector2(float(madregona.x)-float(self_state.x), float(madregona.z)-float(self_state.z)).length() <= 3:
				network.intent({"type": "attack", "target": "madregona"})
			elif last_snapshot.get("raid") is Dictionary:
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
