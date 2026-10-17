extends Node
class_name GayaSoundtrack

const CONTINENTS := {"América do Sul": "south-america", "América do Norte": "north-america", "África": "africa", "Europa": "europe", "Ásia": "asia", "Oceania": "oceania", "Antártida": "antarctica"}
var enabled := false
var loudness := 0.35
var desired := "opening"
var current := ""
var players: Array[AudioStreamPlayer] = []
var active := 0
var fade: Tween

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in 2:
		var voice := AudioStreamPlayer.new()
		add_child(voice)
		players.append(voice)
	var config := ConfigFile.new()
	if config.load("user://soundtrack.cfg") == OK:
		loudness = clampf(float(config.get_value("music", "volume", 0.35)), 0.0, 1.0)
	# Always wait for an explicit gesture; browsers can block autoplay.

func set_enabled(value: bool) -> void:
	enabled = value
	if not enabled:
		if fade: fade.kill()
		for voice in players: voice.stop()
		current = ""
	else:
		play_scene(desired)

func set_loudness(value: float) -> void:
	loudness = clampf(value, 0.0, 1.0)
	if fade: fade.kill()
	for i in players.size():
		players[i].volume_db = linear_to_db(maxf(loudness, 0.0001)) if i == active else -80.0
		if i != active: players[i].stop()
	var config := ConfigFile.new()
	config.set_value("music", "volume", loudness)
	config.save("user://soundtrack.cfg")

func update_scene(character: Dictionary, raid_active: bool, morph_active: bool, shadow_near: bool = false) -> void:
	var next := "opening"
	if not character.is_empty():
		next = str(CONTINENTS.get(str(character.get("continent", "")), "opening"))
		if float(character.get("z", 0)) > 4: next = "frontier"
		if raid_active: next = "raid"
		if shadow_near: next = "madregona"
		if morph_active: next = "ascension"
	play_scene(next)

func play_scene(id: String) -> void:
	desired = id
	if not enabled or id == current or players.is_empty(): return
	var path := "res://audio/%s.wav" % id
	if not ResourceLoader.exists(path): return
	var stream := load(path) as AudioStreamWAV
	if stream == null: return
	stream = stream.duplicate() as AudioStreamWAV
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_begin = 0
	stream.loop_end = int(stream.get_length() * stream.mix_rate)
	if fade: fade.kill()
	var old := players[active]
	active = 1 - active
	var next := players[active]
	next.stop()
	next.stream = stream
	next.volume_db = -80.0
	next.play()
	current = id
	fade = create_tween().set_parallel(true)
	fade.tween_property(old, "volume_db", -80.0, 1.4)
	fade.tween_property(next, "volume_db", linear_to_db(maxf(loudness, 0.0001)), 1.4)
	fade.chain().tween_callback(old.stop)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		for voice in players: voice.stream_paused = true
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		for voice in players: voice.stream_paused = false
