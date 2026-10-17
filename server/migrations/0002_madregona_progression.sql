ALTER TABLE characters ADD COLUMN xp INTEGER NOT NULL DEFAULT 0 CHECK(xp>=0);
ALTER TABLE characters ADD COLUMN vitality INTEGER NOT NULL DEFAULT 0 CHECK(vitality BETWEEN 0 AND 60);
ALTER TABLE characters ADD COLUMN power INTEGER NOT NULL DEFAULT 0 CHECK(power BETWEEN 0 AND 60);
ALTER TABLE characters ADD COLUMN spirit INTEGER NOT NULL DEFAULT 0 CHECK(spirit BETWEEN 0 AND 60);
ALTER TABLE characters ADD COLUMN energy REAL NOT NULL DEFAULT 60 CHECK(energy>=0);
ALTER TABLE characters ADD COLUMN energy_updated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN madregona_unlocked INTEGER NOT NULL DEFAULT 0 CHECK(madregona_unlocked IN(0,1));
ALTER TABLE characters ADD COLUMN active_form TEXT NOT NULL DEFAULT 'origin' CHECK(active_form IN('origin','madregona'));
ALTER TABLE characters ADD COLUMN disguise_animal TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN veil_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN skill_a TEXT NOT NULL DEFAULT 'mend' CHECK(skill_a IN('mend','pulse','veil','shadow'));
ALTER TABLE characters ADD COLUMN skill_b TEXT NOT NULL DEFAULT 'pulse' CHECK(skill_b IN('mend','pulse','veil','shadow'));
ALTER TABLE characters ADD COLUMN skill_mend_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN skill_pulse_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN skill_veil_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN skill_shadow_at INTEGER NOT NULL DEFAULT 0;

CREATE TABLE madregona_encounters(
  character_id TEXT PRIMARY KEY REFERENCES characters(id),
  continent TEXT NOT NULL, disguise_animal TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 6, z REAL NOT NULL DEFAULT 7,
  hp INTEGER NOT NULL DEFAULT 180 CHECK(hp BETWEEN 0 AND 180),
  revealed INTEGER NOT NULL DEFAULT 0 CHECK(revealed IN(0,1)),
  last_pulse INTEGER NOT NULL DEFAULT 0, defeated_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX madregona_continent ON madregona_encounters(continent);

CREATE TRIGGER attribute_budget BEFORE UPDATE OF vitality,power,spirit ON characters
WHEN NEW.vitality+NEW.power+NEW.spirit > 60 OR NEW.xp < 50 * ((NEW.vitality+NEW.power+NEW.spirit+2)/3) * (((NEW.vitality+NEW.power+NEW.spirit+2)/3)-1)
BEGIN SELECT RAISE(ABORT,'attribute_budget'); END;
CREATE TRIGGER locked_madregona BEFORE UPDATE OF active_form,disguise_animal ON characters
WHEN (NEW.active_form='madregona' AND NEW.madregona_unlocked=0) OR (NEW.disguise_animal!='' AND NEW.active_form!='madregona')
BEGIN SELECT RAISE(ABORT,'locked_form'); END;

DROP TRIGGER character_death;
CREATE TRIGGER character_death AFTER UPDATE OF hp ON characters WHEN NEW.hp<=0 BEGIN
 INSERT OR IGNORE INTO lost_territories(character_id,nation_id) VALUES(NEW.id,NEW.nation_id);
 UPDATE characters SET nation_id=(SELECT id FROM nations WHERE continent=NEW.continent AND id!=NEW.nation_id ORDER BY random() LIMIT 1),hp=100+vitality*10,energy=60+spirit*5,energy_updated=0,x=0,z=-3,morph_until=0,veil_until=0,active_form='origin',disguise_animal='' WHERE id=NEW.id;
 DELETE FROM lost_territories WHERE character_id=NEW.id AND nation_id=(SELECT nation_id FROM characters WHERE id=NEW.id);
 UPDATE madregona_encounters SET hp=180,revealed=0,last_pulse=0 WHERE character_id=NEW.id AND hp>0;
END;
