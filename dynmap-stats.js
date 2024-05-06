// @ts-check
import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { URL } from 'url';
import https from 'https'
import YAML from 'yaml'

const __dirname = new URL('.', import.meta.url).pathname;

export class DynmapStats extends plugin {
    constructor() {
        super({
            name: 'Dynmap-Stats',
            dsc: '通过Dynmap查询MC服务器信息',
            event: 'message',
            rule: [
                {
                    reg: '^#MC状态$',
                    fnc: 'queryStats'
                },
                {
                    reg: '^#Dynmap设置网址',
                    fnc: 'setURL',
                    permission: 'master'
                }
            ]
        })
    }

    #default_config_path = path.resolve(__dirname, "configs/default_configs/config.yaml")
    #config_path = path.resolve(__dirname, "configs/config.yaml")
    #config = {}

    init() {
        this.loadConfig()
    }

    loadConfig() {
        let config_path = this.#config_path
        if (!fs.existsSync(this.#config_path)) {
            logger.warn("[Dynmap-Stats] Config doesn't exist. Using default config instead.")
            config_path = this.#default_config_path
        }

        const file = fs.readFileSync(config_path, 'utf8')

        try {
            this.#config = YAML.parse(fs.readFileSync(config_path, 'utf8'))
        } catch (error) {
            logger.warn("[Dynmap-Stats] Error parsing config. Using default config instead.")
            this.#config = YAML.parse(fs.readFileSync(this.#default_config_path, 'utf8'))
        }
        logger.info("[configs]", this.#config)

        this.saveConfig()
    }

    saveConfig() {
        fs.writeFileSync(this.#config_path, YAML.stringify(this.#config))
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
                if (this.#config.showPlayerStats)
                    msg += `（${Math.round(player.health)}❤️，${Math.round(player.armor)}🦺）`

                if (i == data.players.length - 1)
                    msg += '。'
                else
                    msg += '、'
            }
        }

        if (this.#config.showServerTime)
            msg += `\n服务器时间：${new Intl.DateTimeFormat('zh-CN', { timeStyle: 'short', timeZone: `UTC` }).format(new Date(data.servertime / 1000 * 3600000 + 21600000))}。`

        if (this.#config.showWeather) {
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

    getParam(msg, cmd) {
        return msg.replace(cmd, '').trim()
    }

    async queryStats() {
        if (this.#config.url)
            await this.fetchServerData(this.#config.url)
        else
            await this.reply("请先使用“#Dynmap设置网址”命令来配置Dynmap网址。")
    }

    async setURL() {
        const param = this.getParam(this.e.msg, "#Dynmap设置网址")
        if (param) {
            this.#config.url = param
            this.saveConfig()
            await this.reply(`Dynmap网址已设置为${param}`)
        }
        else
            await this.reply("请将网址和命令一同发送，例如：#Dynmap设置网址 https://example.com")
    }
}