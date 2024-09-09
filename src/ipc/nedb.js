const Datastore = require('nedb');

const { ipcMain } = require('electron');
export function setupNedb() {
    const db = new Datastore({ filename: 'game-shell-data.db', autoload: true });

    ipcMain.handle('get-game-data', (event, gameIds) => {
        return new Promise((resolve, reject) => {
            const query = gameIds && gameIds.length > 0 ? { game_id: { $in: gameIds } } : {};
            db.find(query, (err, docs) => {
                if (err) reject(err);
                else resolve(docs);
            });
        });
    });

    ipcMain.handle('set-game-data', (event, gameData) => {
        console.log('set-game-data', gameData)
        return new Promise((resolve, reject) => {
            const { game_id, ...otherData } = gameData;
            db.update(
                { game_id },
                { $set: { game_id, ...otherData } },
                { upsert: true },
                (err, numReplaced, upsert) => {
                    if (err) reject(err);
                    else resolve({ numReplaced, upsert });
                }
            );
        });
    });

    ipcMain.handle('remove-game-data', (event, gameIds) => {
        return new Promise((resolve, reject) => {
            if (gameIds && gameIds.length > 0) {
                db.remove({ game_id: { $in: gameIds } }, { multi: true }, (err, numRemoved) => {
                    if (err) reject(err);
                    else resolve({ numRemoved, cleared: false });
                });
            } else {
                db.remove({}, { multi: true }, (err, numRemoved) => {
                    if (err) reject(err);
                    else resolve({ numRemoved, cleared: true });
                });
            }
        });
    });
}