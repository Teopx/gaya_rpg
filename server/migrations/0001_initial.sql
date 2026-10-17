PRAGMA foreign_keys=ON;
CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),expires_at INTEGER NOT NULL);
CREATE TABLE nations(id TEXT PRIMARY KEY,name TEXT NOT NULL,continent TEXT NOT NULL,tax INTEGER NOT NULL DEFAULT 0 CHECK(tax BETWEEN 0 AND 30),owner_id TEXT REFERENCES accounts(id));
CREATE TABLE characters(id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 24),continent TEXT NOT NULL,animal TEXT NOT NULL,nation_id TEXT NOT NULL REFERENCES nations(id),hp INTEGER NOT NULL DEFAULT 100,x REAL NOT NULL DEFAULT 0,z REAL NOT NULL DEFAULT -3,fruit INTEGER NOT NULL DEFAULT 0 CHECK(fruit>=0),plant INTEGER NOT NULL DEFAULT 0 CHECK(plant>=0),liquid INTEGER NOT NULL DEFAULT 0 CHECK(liquid>=0),coin INTEGER NOT NULL DEFAULT 0 CHECK(coin>=0),potion INTEGER NOT NULL DEFAULT 0 CHECK(potion>=0),cloth INTEGER NOT NULL DEFAULT 0 CHECK(cloth>=0),cards INTEGER NOT NULL DEFAULT 0,pet TEXT NOT NULL DEFAULT 'magia',morph_until INTEGER NOT NULL DEFAULT 0,last_move INTEGER NOT NULL DEFAULT 0,last_attack INTEGER NOT NULL DEFAULT 0);
CREATE INDEX character_accounts ON characters(account_id);
CREATE TABLE lost_territories(character_id TEXT NOT NULL REFERENCES characters(id),nation_id TEXT NOT NULL REFERENCES nations(id),PRIMARY KEY(character_id,nation_id));
CREATE TABLE ws_tickets(hash TEXT PRIMARY KEY,character_id TEXT NOT NULL REFERENCES characters(id),expires_at INTEGER NOT NULL);
CREATE TRIGGER ten_slots BEFORE INSERT ON characters WHEN (SELECT COUNT(*) FROM characters WHERE account_id=NEW.account_id)>=10 BEGIN SELECT RAISE(ABORT,'slot_limit'); END;
CREATE TRIGGER fixed_dna BEFORE UPDATE OF continent,animal ON characters WHEN NEW.continent!=OLD.continent OR NEW.animal!=OLD.animal BEGIN SELECT RAISE(ABORT,'immutable_origin'); END;
CREATE TRIGGER character_death AFTER UPDATE OF hp ON characters WHEN NEW.hp<=0 BEGIN
 INSERT OR IGNORE INTO lost_territories(character_id,nation_id) VALUES(NEW.id,NEW.nation_id);
 UPDATE characters SET nation_id=(SELECT id FROM nations WHERE continent=NEW.continent AND id!=NEW.nation_id ORDER BY random() LIMIT 1),hp=100,x=0,z=-3,morph_until=0 WHERE id=NEW.id;
 DELETE FROM lost_territories WHERE character_id=NEW.id AND nation_id=(SELECT nation_id FROM characters WHERE id=NEW.id);
END;
CREATE TABLE resource_nodes(id TEXT PRIMARY KEY,continent TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN('fruit','plant','liquid','coin')),x REAL NOT NULL,z REAL NOT NULL,available_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE raid_rewards(raid_id TEXT NOT NULL,character_id TEXT NOT NULL REFERENCES characters(id),PRIMARY KEY(raid_id,character_id));
