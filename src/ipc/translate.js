import { ipcMain } from 'electron'
import { base_translate } from '../utils/translate/base'


export function setupTranslateIpc() {
    ipcMain.handle('base_translate', async (event, { text, sourceLang, targetLang, service, options = {} }) => {
        try {
            const result = await base_translate(text, sourceLang, targetLang, service, options);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}