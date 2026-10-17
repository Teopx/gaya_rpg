extends Node
class_name HybridNationSystem
signal affiliation_changed(previous: String, current: String)
var affiliation := ""
var lost_territories: Array[String] = []

# The client never chooses a respawn nation or writes a death outcome.
func apply_server_affiliation(next: String) -> void:
	if next.is_empty() or next == affiliation:
		return
	var previous := affiliation
	if not previous.is_empty() and previous not in lost_territories:
		lost_territories.append(previous)
	lost_territories.erase(next)
	affiliation = next
	affiliation_changed.emit(previous, next)
