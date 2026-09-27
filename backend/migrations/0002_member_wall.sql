-- Contains synchronization counters only, never membership details.
CREATE TABLE Member_wall_sync (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  revision INTEGER NOT NULL DEFAULT 1,
  dispatched_revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO Member_wall_sync (singleton) VALUES (1);

CREATE TRIGGER member_wall_insert AFTER INSERT ON People BEGIN
  UPDATE Member_wall_sync SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER member_wall_delete AFTER DELETE ON People BEGIN
  UPDATE Member_wall_sync SET revision = revision + 1 WHERE singleton = 1;
END;
CREATE TRIGGER member_wall_update AFTER UPDATE OF first_name, preferred_name, last_name ON People BEGIN
  UPDATE Member_wall_sync SET revision = revision + 1 WHERE singleton = 1;
END;
