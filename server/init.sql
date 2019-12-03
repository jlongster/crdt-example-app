
CREATE TABLE messages
  (timestamp TEXT,
   group_id TEXT,
   dataset TEXT,
   row TEXT,
   column TEXT,
   value TEXT,
   PRIMARY KEY(timestamp, group_id));

CREATE TABLE messages_merkles
  (group_id TEXT PRIMARY KEY,
   merkle TEXT);
