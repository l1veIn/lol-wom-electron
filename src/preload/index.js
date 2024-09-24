import { contextBridge,ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
	verson: process.version,
	test(data){
		return ipcRenderer.invoke('test',data)
	},
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
	removeListener: (channel, func) => ipcRenderer.removeListener(channel, (event, ...args) => func(...args)),
	removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
	send: (channel, data) => ipcRenderer.send(channel, data),
	once: (channel, func) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
	init_lcu() {
		return ipcRenderer.invoke('init_lcu')
	},
	getClientUrl() {
		return ipcRenderer.invoke('get-client-url')
	},
	onClientDisconnected: (callback) => ipcRenderer.on('client-status', (_event, value) => callback(value)),
	getCurrentUser() {
		return ipcRenderer.invoke('current-summoner')
	},
	get(url, body) {
		return ipcRenderer.invoke('get-url', url, body)
	},
	post(url, body) {
		return ipcRenderer.invoke('post-url', url, body)
	},
	transcribeAudio: (buffer) => ipcRenderer.invoke('transcribe-audio', buffer),
	tierTextMap: {
		IRON: '黑铁',
		BRONZE: '黄铜',
		SILVER: '白银',
		GOLD: '黄金',
		PLATINUM: '铂金',
		EMERALD: '翡翠',
		DIAMOND: '钻石',
		MASTER: '超凡大师',
		GRANDMASTER: '傲世宗师',
		CHALLENGER: '最强王者'
	},
	rsoPlatformText: {
		HN10: '黑色玫瑰',
		HN1: '艾欧尼亚',
		HN0: '体验',
		HN2: '祖安',
		HN3: '诺克萨斯',
		HN4: '班德尔城',
		HN5: '皮尔特洛夫',
		HN6: '战争学院',
		HN7: '巨神峰',
		HN8: '雷瑟守备',
		HN9: '裁决之地',
		HN11: '暗影岛',
		HN12: '钢铁烈阳',
		HN13: '水晶之痕',
		HN14: '均衡教派',
		HN15: '影流',
		HN16: '守望之海',
		HN17: '征服之海',
		HN18: '卡拉曼达',
		HN19: '皮城警备',
		WT1: '比尔吉沃特',
		WT2: '德玛西亚',
		WT3: '弗雷尔卓德',
		WT4: '无畏先锋',
		WT5: '恕瑞玛',
		WT6: '扭曲丛林',
		WT7: '巨龙之巢',
		EDU1: '教育网',
		BGP2: '峡谷之巅',
		HN14_NEW: '均衡教派',
		HN16_NEW: '守望之海',
		BGP1: '男爵领域',
		HN18_NEW: '卡拉曼达',
		HN4_NEW: '班德尔城',
		WT1_NEW: '比尔吉沃特',
		WT3_NEW: '弗雷尔卓德',
		WT2_NEW: '德玛西亚',
		WT4_NEW: '无畏先锋',
		NJ100: '联盟一区',
		GZ100: '联盟二区',
		CQ100: '联盟三区',
		TJ100: '联盟四区',
		TJ101: '联盟五区'
	}
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('LCU', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.LCU = api
}
