extends GutTest

func test_continent_and_fauna_validation() -> void:
	var manager := HybridCharacterManager.new()
	assert_true(manager.validate_origin("África", "Leão"))
	assert_false(manager.validate_origin("África", "Pinguim"))
	manager.free()

func test_ten_slot_limit() -> void:
	var manager := HybridCharacterManager.new()
	var rows: Array = []
	for i in 10:
		rows.append({"continent": "África", "animal": "Leão"})
	assert_true(manager.replace_from_server(rows))
	rows.append({"continent": "África", "animal": "Leão"})
	assert_false(manager.replace_from_server(rows))
	assert_eq(manager.characters.size(), 10)
	manager.free()

func test_nation_snapshot_tracks_revoked_affiliation() -> void:
	var nations := HybridNationSystem.new()
	nations.apply_server_affiliation("aurora")
	nations.apply_server_affiliation("mare")
	assert_eq(nations.affiliation, "mare")
	assert_has(nations.lost_territories, "aurora")
	nations.free()
