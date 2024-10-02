
import { baidu_translate } from './base_translater/baidu'

const translators = {
    baidu: baidu_translate,
};

export async function base_translate(text, sourceLang, targetLang, service = 'baidu') {
    try {
        const translator = translators[service];
        if (!translator) {
            throw new Error(`不支持的翻译服务: ${service}`);
        }
        return await translator(text, sourceLang, targetLang);
    } catch (error) {
        console.error(`翻译失败: ${error.message}`);
        throw error;
    }
}
