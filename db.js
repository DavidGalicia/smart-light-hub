let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./db.sqlite3');

const NODE_TABLE = "node";
const SONG_TABLE = "song";

db.serialize(function() {
    let sql = "CREATE TABLE " + NODE_TABLE + " (macAddress TEXT PRIMARY KEY, ip TEXT, role TEXT, connectedAt INT)";
    db.run(sql, function(error) {
        if (error) {
            if (!error.code.includes('already exists'))
                console.log("[db] " + error);
        }
    });

    sql = "CREATE TABLE " + SONG_TABLE + " (id TEXT PRIMARY KEY, album TEXT, title TEXT, artist TEXT)";
    db.run(sql, function(error) {
        if (error) {
            if (!error.code.includes('already exists'))
                console.log("[db] " + error);
        }
    });
});

module.exports = {
    getNode(node) {
        return new Promise(function(resolve, reject) {
            let sql = "SELECT * from " + NODE_TABLE + " where macAddress = ?";
            let params = [node.macAddress];

            db.get(sql, params, function(err, row) {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },
    getNodes() {
        return new Promise(function(resolve, reject) {
            let sql = "SELECT * FROM " + NODE_TABLE;
            let params = [];

            db.all(sql, params,function(err, row) {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },
    addNode(node) {
        return new Promise(function(resolve, reject) {
            let sql = "INSERT INTO " + NODE_TABLE + " VALUES (?, ?, ?, ?)";
            let params = [node.macAddress, node.ip, node.role, node.connectedAt];

            db.run(sql, params, function(error) {
                    if (error)
                        reject(error);
                    else
                        resolve(node);
                });

            resolve(true);
        });
    },
    updateNode(node) {
        return new Promise(function(resolve, reject) {
            let sql = "UPDATE " + NODE_TABLE + " SET "
                + "ip = ?, "
                + "role = ?, "
                + "connectedAt = ? "
                + "WHERE macAddress = ?";
            let params = [node.ip, node.role, node.connectedAt, node.macAddress];

            db.run(sql, params, function(error) {
                    if (error)
                        reject(error);
                    else
                        resolve(node);
                });
        });
    },
    removeNode(node) {
        return new Promise(function(resolve, reject) {
            let sql = "DELETE FROM " + NODE_TABLE + " WHERE macAddress = ?";
            let params = [];

            db.run(sql, params, function(error) {
                if (error)
                    reject(error);
                else
                    resolve(node);
            });
        });
    },
    getSong(song) {
        return new Promise(function(resolve, reject) {
            let sql = "SELECT * from " + SONG_TABLE + " where id = ?";
            let params = [song.id];

            db.get(sql, params, function(err, row) {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },
    getSongs() {
        return new Promise(function(resolve, reject) {
            let sql = "SELECT * FROM " + SONG_TABLE;
            let params = [];

            db.all(sql, params,function(err, row) {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },
    addSong(song) {
        return new Promise(function(resolve, reject) {
            let sql = "INSERT INTO " + SONG_TABLE + " VALUES (?, ?, ?, ?)";
            let params = [song.id, song.album, song.title, song.artist];

            db.run(sql, params, function(error) {
                if (error)
                    reject(error);
                else
                    resolve(song);
            });

            resolve(true);
        });
    },
    updateSong(song) {
        return new Promise(function(resolve, reject) {
            let sql = "UPDATE " + SONG_TABLE + " SET "
                + "album = ?, "
                + "title = ?, "
                + "artist = ? "
                + "WHERE id = ?";
            let params = [song.album, song.title, song.artist, song.id];

            db.run(sql, params, function(error) {
                if (error)
                    reject(error);
                else
                    resolve(song);
            });
        });
    },
    removeSong(song) {
        return new Promise(function(resolve, reject) {
            let sql = "DELETE FROM " + SONG_TABLE + " WHERE id = ?";
            let params = [song.id];

            db.run(sql, params, function(error) {
                if (error)
                    reject(error);
                else
                    resolve(song);
            });
        });
    },
};

//db.close();