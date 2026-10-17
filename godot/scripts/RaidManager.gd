extends Node
class_name HybridRaidManager
signal raid_changed(hp: int, remaining_seconds: float)
signal card_received(total: int)
var network: HybridNetworkClient
var cards := 0

func apply_snapshot(data: Dictionary) -> void:
	var raid = data.get("raid")
	if raid is Dictionary:
		raid_changed.emit(int(raid.hp), maxf(0, (float(raid.ends) - float(data.server_time)) / 1000.0))
	var total := int(data.get("inventory", {}).get("cards", 0))
	if total > cards:
		card_received.emit(total)
	cards = total

func start_raid() -> void:
	if network:
		network.intent({"type": "raid"})

func attack_boss() -> void:
	if network:
		network.intent({"type": "attack", "target": "boss"})
