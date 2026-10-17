extends Node
class_name HybridNetworkClient
signal snapshot_received(data: Dictionary)
signal connection_changed(connected: bool)
signal request_failed(message: String)

var peer := WebSocketPeer.new()
var origin := ""
var character_id := ""
var connected := false
var stopped := false
var requesting := false
var reconnect_at := 0.0
var attempts := 0
var last_send := 0

func _ready() -> void:
	peer.inbound_buffer_size = 1048576
	peer.outbound_buffer_size = 65536
	if OS.has_feature("web"):
		origin = str(JavaScriptBridge.eval("location.origin", true))

func join(id: String) -> void:
	character_id = id
	stopped = false
	await _request_ticket()

func _request_ticket() -> void:
	if requesting or stopped or origin.is_empty() or character_id.is_empty():
		return
	requesting = true
	var http := HTTPRequest.new()
	add_child(http)
	http.timeout = 10.0
	var error := http.request(origin + "/api/ticket", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify({"character_id": character_id}))
	if error != OK:
		http.queue_free()
		requesting = false
		_schedule_retry()
		return
	var response: Array = await http.request_completed
	http.queue_free()
	requesting = false
	if response[1] != 200:
		request_failed.emit("Sessão inválida. Entre pela página principal.")
		stopped = true
		return
	var data = JSON.parse_string(response[3].get_string_from_utf8())
	if not data is Dictionary or not data.has("ticket"):
		_schedule_retry()
		return
	peer = WebSocketPeer.new()
	peer.inbound_buffer_size = 1048576
	var ws_origin := origin.replace("https://", "wss://").replace("http://", "ws://")
	if peer.connect_to_url(ws_origin + "/api/ws?ticket=" + str(data.ticket).uri_encode()) != OK:
		_schedule_retry()

func _schedule_retry() -> void:
	attempts += 1
	reconnect_at = Time.get_ticks_msec() + minf(30000.0, pow(2.0, mini(attempts, 5)) * 1000.0) + randf_range(0, 500)

func _process(_delta: float) -> void:
	peer.poll()
	var state := peer.get_ready_state()
	if state == WebSocketPeer.STATE_OPEN:
		if not connected:
			connected = true
			attempts = 0
			connection_changed.emit(true)
		while peer.get_available_packet_count() > 0:
			var packet := peer.get_packet()
			if packet.size() > 1048576:
				peer.close(1009, "packet_too_large")
				break
			var data = JSON.parse_string(packet.get_string_from_utf8())
			if data is Dictionary and data.get("type") == "snapshot":
				snapshot_received.emit(data)
			elif data is Dictionary and data.get("type") == "error":
				request_failed.emit("Ação não aceita: %s. Confira forma, energia, recarga e alcance." % data.get("error", "action_rejected"))
	elif state == WebSocketPeer.STATE_CLOSED:
		if connected:
			connected = false
			connection_changed.emit(false)
			if peer.get_close_reason() == "replaced":
				stopped = true
			_schedule_retry()
		if not stopped and not requesting and Time.get_ticks_msec() >= reconnect_at and not character_id.is_empty():
			_request_ticket()

func intent(data: Dictionary) -> void:
	if peer.get_ready_state() == WebSocketPeer.STATE_OPEN:
		peer.send_text(JSON.stringify(data))

func move(direction: Vector2) -> void:
	if Time.get_ticks_msec() - last_send < 70:
		return
	last_send = Time.get_ticks_msec()
	var axis := direction.limit_length()
	intent({"type": "move", "dx": axis.x, "dz": axis.y})

func _exit_tree() -> void:
	stopped = true
	peer.close()
