extends Node
class_name HybridCharacterManager

const MAX_SLOTS := 10
const FAUNA := {
	"Ásia": ["Tigre", "Panda", "Pavão"],
	"África": ["Leão", "Elefante", "Zebra"],
	"Europa": ["Lobo", "Raposa", "Corvo"],
	"América do Norte": ["Urso", "Águia", "Bisão"],
	"América do Sul": ["Onça", "Arara", "Capivara"],
	"Oceania": ["Canguru", "Coala", "Emu"],
	"Antártida": ["Pinguim", "Foca", "Albatroz"]
}
var characters: Array = []
var morph_generation := 0
var morph_originals: Dictionary = {}
var active_morphs: Dictionary = {}

func validate_origin(continent: String, animal: String) -> bool:
	return FAUNA.has(continent) and animal in FAUNA[continent]

func replace_from_server(rows: Array) -> bool:
	if rows.size() > MAX_SLOTS:
		return false
	for row in rows:
		if not row is Dictionary or not validate_origin(str(row.get("continent", "")), str(row.get("animal", ""))):
			return false
	characters = rows.duplicate(true)
	return true

# Attach imported meshes to matching human bones; never merge incompatible rigs blindly.
func attach_module(skeleton: Skeleton3D, bone_name: String, mesh: Mesh) -> BoneAttachment3D:
	if skeleton == null or mesh == null or skeleton.find_bone(bone_name) < 0:
		return null
	var attachment := BoneAttachment3D.new()
	attachment.bone_name = bone_name
	skeleton.add_child(attachment)
	var part := MeshInstance3D.new()
	part.mesh = mesh
	attachment.add_child(part)
	return attachment

# Visual-only duration. Damage and status remain authoritative on the server.
func apply_card_morph(avatar: MeshInstance3D, card_mesh: Mesh, seconds: float) -> void:
	if not is_instance_valid(avatar) or card_mesh == null or seconds <= 0:
		return
	morph_generation += 1
	var generation := morph_generation
	var id := avatar.get_instance_id()
	var original: Mesh = morph_originals.get(id, avatar.mesh)
	morph_originals[id] = original
	active_morphs[id] = generation
	avatar.mesh = card_mesh
	await get_tree().create_timer(minf(seconds, 15.0)).timeout
	if active_morphs.get(id) == generation:
		if is_instance_valid(avatar):
			avatar.mesh = original
		active_morphs.erase(id)
		morph_originals.erase(id)
