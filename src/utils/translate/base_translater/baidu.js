import axios from 'axios';

class BaiduTranslator {
    constructor() {
        this.host_url = "https://fanyi.baidu.com";
        this.api_url = "https://fanyi.baidu.com/transapi";
        this.host_headers = this.getHeaders(this.host_url, false);
        this.api_headers = this.getHeaders(this.host_url, true);
        this.session = null;
        this.query_count = 0;
        this.begin_time = Date.now();
        this.default_session_freq = 1000;
        this.default_session_seconds = 1500;
    }

    getHeaders(hostUrl, isApi = false) {
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36";
        const urlPath = new URL(hostUrl).pathname;

        if (!isApi) {
            return {
                "Referer": hostUrl,
                "User-Agent": userAgent
            };
        } else {
            return {
                "Origin": hostUrl.split(urlPath)[0],
                "Referer": hostUrl,
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": userAgent
            };
        }
    }

    async baiduApi(queryText, fromLanguage = "auto", toLanguage = "en", options = {}) {
        const {
            timeout,
            proxies,
            sleepSeconds = 0,
            isDetailResult = true,
            updateSessionAfterFreq = this.default_session_freq,
            updateSessionAfterSeconds = this.default_session_seconds
        } = options;

        const notUpdateCondFreq = this.query_count < updateSessionAfterFreq ? 1 : 0;
        const notUpdateCondTime = (Date.now() - this.begin_time) < updateSessionAfterSeconds ? 1 : 0;

        if (!this.session) {
            this.session = axios.create();
            await this.session.get(this.host_url, { headers: this.host_headers, timeout, proxy: proxies });
            await this.session.get(this.host_url, { headers: this.host_headers, timeout, proxy: proxies });
        }

        const formData = new URLSearchParams({
            from: fromLanguage,
            to: toLanguage,
            query: queryText,
            source: "txt"
        });

        try {
            const response = await this.session.post(this.api_url, formData, {
                headers: this.api_headers,
                timeout,
                proxy: proxies
            });

            await new Promise(resolve => setTimeout(resolve, sleepSeconds * 1000));
            this.query_count++;

            const data = response.data;
            console.log(data)
            if (isDetailResult) {
                return data;
            } else {
                return data.data.map(item => item.dst).join('\n');
            }
        } catch (error) {
            console.error("翻译请求失败:", error);
            throw error;
        }
    }
}

export async function baidu_translate(text, sourceLang, targetLang, options = {}) {
    console.log(text, sourceLang, targetLang, options)
    const translator = new BaiduTranslator();
    try {
        return await translator.baiduApi(text, sourceLang, targetLang, options);
    } catch (error) {
        console.error("baidu_translate_failed:", error);
        throw error;
    }
}