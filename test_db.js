const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./bloodconnect.db');
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS test (id INTEGER, name TEXT, opt TEXT)");
  db.run("INSERT INTO test (id, name) VALUES (1, 'om')");
  db.get("SELECT * FROM test", (err, row) => {
    console.log(Object.keys(row));
  });
});
