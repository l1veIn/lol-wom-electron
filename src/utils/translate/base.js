
import { baidu_translate } from './base_translater/baidu'

const translators = {
    baidu: baidu_translate,
};

export async function base_translate(text, sourceLang, targetLang, service = 'baidu', options) {
    try {
        const translator = translators[service];
        if (!translator) {
            throw new Error(`不支持的翻译服务: ${service}`);
        }
        return await translator(text, sourceLang, targetLang, options);
    } catch (error) {
        console.error(`翻译失败: ${error.message}`);
        throw error;
    }
}


// async function translate() {
//     try {
//         const result = await baidu_translate("你好，世界", "zh", "en", { timeout: 5000 });
//         console.log(result);
//     } catch (error) {
//         console.error("翻译失败:", error);
//     }
// }

// translate();