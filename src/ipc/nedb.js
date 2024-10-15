const Datastore = require('nedb');
const { ipcMain, app } = require('electron');
import logger from '../utils/logger';
import path from 'path';

export function setupNedb() {
    logger.info('开始设置 NeDB');
    
    // 获取应用数据路径
    const dbPath = path.join(app.getPath('userData'), 'game-shell-data.db');
    const db = new Datastore({ filename: dbPath, autoload: true });

    logger.debug('NeDB 数据库已创建', { filename: dbPath });

    ipcMain.handle('get-game-data', (event, gameIds) => {
        logger.debug('收到 get-game-data 请求', { gameIds });
        return new Promise((resolve, reject) => {
            const query = gameIds && gameIds.length > 0 ? { game_id: { $in: gameIds } } : {};
            db.find(query, (err, docs) => {
                if (err) {
                    logger.error('获取游戏数据失败', { error: err });
                    reject(err);
                } else {
                    logger.info('成功获取游戏数据', { count: docs.length });
                    resolve(docs);
                }
            });
        });
    });

    ipcMain.handle('set-game-data', (event, gameData) => {
        logger.debug('收到 set-game-data 请求', { gameId: gameData.game_id });
        return new Promise((resolve, reject) => {
            const { game_id, ...otherData } = gameData;
            db.update(
                { game_id },
                { $set: { game_id, ...otherData } },
                { upsert: true },
                (err, numReplaced, upsert) => {
                    if (err) {
                        logger.error('设置游戏数据失败', { error: err, gameId: game_id });
                        reject(err);
                    } else {
                        logger.info('成功设置游戏数据', { gameId: game_id, numReplaced, upsert });
                        resolve({ numReplaced, upsert });
                    }
                }
            );
        });
    });

    ipcMain.handle('remove-game-data', (event, gameIds) => {
        logger.debug('收到 remove-game-data 请求', { gameIds });
        return new Promise((resolve, reject) => {
            if (gameIds && gameIds.length > 0) {
                db.remove({ game_id: { $in: gameIds } }, { multi: true }, (err, numRemoved) => {
                    if (err) {
                        logger.error('删除指定游戏数据失败', { error: err, gameIds });
                        reject(err);
                    } else {
                        logger.info('成功删除指定游戏数据', { numRemoved, gameIds });
                        resolve({ numRemoved, cleared: false });
                    }
                });
            } else {
                db.remove({}, { multi: true }, (err, numRemoved) => {
                    if (err) {
                        logger.error('清空所有游戏数据失败', { error: err });
                        reject(err);
                    } else {
                        logger.info('成功清空所有游戏数据', { numRemoved });
                        resolve({ numRemoved, cleared: true });
                    }
                });
            }
        });
    });

    logger.info('NeDB 设置完成');
}