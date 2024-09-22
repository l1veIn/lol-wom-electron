import { authenticate, createWebSocketConnection, createHttp1Request, LeagueClient } from 'league-connect';
import logger from '../utils/logger';

import _ from 'lodash'
let credentials = null;


export async function init_lcu(win) {
	logger.info('init_lcu 开始初始化');
	if (credentials) {
		logger.warn('init_lcu 被重复调用');
		throw "don't init again"
	}
	try {
		credentials = await authenticate()
		logger.info('LCU 认证成功', { credentials });

		const ws = await createWebSocketConnection({
			authenticationOptions: {
				awaitConnection: true
			},
			pollInterval: 1000,
			maxRetries: 10
		})
		logger.info('WebSocket 连接已创建');

		ws.subscribe('/lol-gameflow/v1/gameflow-phase', (data, event) => {
			logger.info('游戏阶段变化', { data });
			win.webContents.send('game-phase-change', data);
		})

		let handleConnect = _.debounce(() => {
			win.webContents.send('client-status', 2)
		}, 8000)
		const client = new LeagueClient(credentials)
		client.on('connect', (newCredentials) => {
			logger.info('LCU 客户端已连接');
			credentials = newCredentials
			win.webContents.send('client-status', 2)
			// handleConnect()
		})
		client.on('disconnect', () => {
			logger.warn('LCU 客户端已断开连接');
			win.webContents.send('client-status', 0)
		})
		client.start()
		logger.info('init_lcu 初始化完成');
	} catch (error) {
		logger.error('init_lcu 初始化失败', { error });
		throw error;
	}
}

export async function getClientUrl() {
	return credentials
}

export async function get(_, url, body) {
	logger.info('发送 GET 请求', { url, body });
	try {
		const response = await createHttp1Request({
			method: 'GET',
			url,
			body
		}, credentials)
		logger.info('GET 请求成功', { url });
		return response.json()
	} catch (error) {
		logger.error('GET 请求失败', { url, error });
		throw error;
	}
}

export async function post(_, url, body) {
	logger.info('发送 POST 请求', { url, body });
	try {
		const response = await createHttp1Request({
			method: 'POST',
			url,
			body
		}, credentials)
		logger.info('POST 请求成功', { url });
		return response.json()
	} catch (error) {
		logger.error('POST 请求失败', { url, error });
		throw error;
	}
}

export async function getCurrentSummoner() {
	logger.info('获取当前召唤师信息');
	try {
		let res = await get(null, '/lol-summoner/v1/current-summoner')
		res.rsoPlatformId = credentials.rsoPlatformId
		res.region = credentials.region
		logger.info('成功获取召唤师信息', { summoner: res });
		return res
	} catch (error) {
		logger.error('获取召唤师信息失败', { error });
		throw error;
	}
}

