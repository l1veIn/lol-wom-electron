import { authenticate, createWebSocketConnection, createHttp1Request ,LeagueClient } from 'league-connect';
import logger from '../utils/logger';

export let credentials = null;

import _ from 'lodash'

export async function init_lcu(win) {
	logger.info('init_lcu start');
	if (credentials) {
		throw "don't init again"
	}
	credentials = await authenticate()
	// console.log({credentials})
	const ws = await createWebSocketConnection({
		authenticationOptions: {
			awaitConnection: true
		},
		pollInterval: 1000,
		maxRetries: 10
	})
	ws.subscribe('/lol-gameflow/v1/gameflow-phase', (data, event) => {
		console.log(data)
		win.webContents.send('game-phase-change', data);
	})
	let handleConnect = _.debounce(() => {
		win.webContents.send('client-status', 2)
	}, 8000)
	const client = new LeagueClient(credentials)
	client.on('connect', (newCredentials) => {
		console.log('connect')
		credentials = newCredentials
		win.webContents.send('client-status', 2)
		// handleConnect()
	})
	client.on('disconnect', () => {
		console.log('disconnect')
		win.webContents.send('client-status', 0)
	})
	client.start()
}
export async function getClientUrl() {
	return credentials
}

export async function get(_, url, body) {
	console.log({
		url
	}, {
		body
	})
	const response = await createHttp1Request({
		method: 'GET',
		url,
		body
	}, credentials)
	return response.json()
}
export async function post(_, url, body) {
	console.log({
		url
	}, {
		body
	})
	const response = await createHttp1Request({
		method: 'POST',
		url,
		body
	}, credentials)
	return response.json()
}
export async function getCurrentSummoner() {
	let res = await get(null, '/lol-summoner/v1/current-summoner')
	res.rsoPlatformId = credentials.rsoPlatformId
	res.region = credentials.region
	return res
}
