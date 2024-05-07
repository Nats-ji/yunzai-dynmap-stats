// @ts-check
import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { URL } from 'url';
import https from 'https'
import YAML from 'yaml'

const __dirname = new URL('.', import.meta.url).pathname;
let config = {}

export class DynmapStats extends plugin {
    constructor() {
        super({
            name: 'Dynmap-Stats',
            dsc: '通过Dynmap查询MC服务器信息',
            event: 'message',
            rule: [
                {
                    reg: '^(＃|#)\s?(mc|MC|我的世界|minecraft)状态$',
                    fnc: 'queryStats'
                }
            ]
        })
    }

    #default_config_path = path.resolve(__dirname, "configs/default_configs/config.yaml")
    #config_path = path.resolve(__dirname, "configs/config.yaml")

    init() {
        this.loadConfig()
    }

    createConfig() {
        fs.cpSync(this.#default_config_path, this.#config_path)
    }

    loadConfig() {
        if (!fs.existsSync(this.#config_path)) {
            logger.warn("[Dynmap-Stats] Config doesn't exist. Using default config instead.")
            this.createConfig()
        }

        try {
            config = YAML.parse(fs.readFileSync(this.#config_path, 'utf8'))
        } catch (error) {
            logger.warn("[Dynmap-Stats] Error parsing config. Using default config instead.")
            this.createConfig()
            config = YAML.parse(fs.readFileSync(this.#config_path, 'utf8'))
        }
    }

    async connectionError() {
        await this.reply("无法连接到MC服务器，可能是服务器未开机。")
    }

    /**
     * Respond with server stats
     * @param {object} data 
     */
    async connectionSuccess(data) {
        let msg = `MC服务器当前有${data.players.length}人在线。`

        if (data.players.length > 0) {
            msg += `\n在线玩家：`
            for (let i = 0; i < data.players.length; i++) {
                const player = data.players[i];
                msg += `${player.name}`
                if (config.showPlayerStats)
                    msg += `（${Math.round(player.health)}❤️，${Math.round(player.armor)}🦺）`

                if (i == data.players.length - 1)
                    msg += '。'
                else
                    msg += '、'
            }
        }

        if (config.showServerTime)
            msg += `\n服务器时间：${new Intl.DateTimeFormat('zh-CN', { timeStyle: 'short', timeZone: `UTC` }).format(new Date(data.servertime / 1000 * 3600000 + 21600000))}。`

        if (config.showWeather) {
            msg += `\n服务器天气：`
            if (data.hasStorm) {
                if (data.isThundering)
                    msg += "打雷。"
                else
                    msg += "下雨。"
            }
            else
                msg += "晴天。"
        }

        await this.reply(msg)
    }

    /**
     * Fetch data from a dynmap webserver
     * @param {string} url Base url for dynmap webserver
     */
    async fetchServerData(url) {
        const api_url = new URL("/up/world/world/", url)
        https.get(api_url, (response) => {
            let data = ''

            // A chunk of data has been received.
            response.on('data', (chunk) => {
                data += chunk
            })

            // The whole response has been received.
            response.on('end', async () => {
                try {
                    const jsonData = JSON.parse(data)
                    await this.connectionSuccess(jsonData)
                } catch (error) {
                    console.error('Error parsing JSON:', error.message)
                    await this.connectionError()
                }
            })
        }).on('error', async (error) => {
            console.error('Error fetching JSON from URL:', error.message);
            await this.connectionError()
        })
    }

    async queryStats() {
        if (config.url)
            await this.fetchServerData(config.url)
        else
            await this.reply("请先配置文件里设置Dynmap网址。")
    }
}