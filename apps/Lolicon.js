import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import Cfg from '../model/Cfg.js'
import HttpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { segment } from 'oicq'
import lodash from 'lodash'
import moment from 'moment'
import sharp from 'sharp'

const config = Cfg.getConfig('config');

/** 当tag为空时使用预设，在下面添加即可（三维数组：tag最多三个 */
const random_pic = [
    [
        ['萝莉'], ['女孩子']
    ],
    [
        ['萝莉'], ['猫耳'], ['白丝']
    ]
]

const Plugin_name = 'iloli'
const NumReg = '[零一壹二贰两三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万亿\\d]+'
const Regular = new RegExp(`^来\\s?(${NumReg})?[张份点](.*)[涩色瑟][图圖]`)

export class LoliconAPI extends plugin {
    constructor() {
        super({
            name: 'Lolicon',
            dsc: 'https://api.lolicon.app',
            event: 'message',
            priority: 0,
            rule: [{
                reg: Regular,
                fnc: 'LoliconAPI',
                log: false
            }]
        })
    this.switch = config.pixiv_enable || false;
    }

    /** 清除CD */
    async clearCD() {
        return await redis.del(`${Plugin_name}_${this.e.group_id}_${this.e.user_id}_CD`)
    }

    /** 撤回消息 */
    async recallMessage(e, message) {
        return e.isGroup ? e.group.recallMsg(message.message_id) : e.friend.recallMsg(message.message_id)
    }

    /**
     * 来份涩图
     * @param {Object} e - 消息事件
     * @param {Number} num - 涩图点数
     * @param {String} tagValue - 图片tags
     * @param {Number} successCount - 成功计数
     * @param {Number} failureCount - 失败计数
     * @returns 
     */
    async LoliconAPI(
        e,
        num = 0,
        tagValue = '',
        successCount = 0,
        failureCount = 0
    ) {

        /**
         * 初始化代理（兼容7.0.x和5.0.x
         * @param {String} proxyAddress - 代理地址
         * @returns {Promise<HttpsProxyAgent>}
         */
        function proxyAgent(proxyAddress) {
            try {
                const HttpsProxyAgentLatest = HttpsProxyAgent.HttpsProxyAgent
                return new HttpsProxyAgentLatest(proxyAddress)
            } catch {
                return new HttpsProxyAgent(proxyAddress)
            }
        }

        // 检测是否处于CD中
        const CDTIME = await redis.get(`${Plugin_name}_${e.group_id}_${e.user_id}_CD`)

        if (CDTIME && !e.isMaster) return e.reply('「冷却中」先生，冲太快会炸膛！', true, { recallMsg: 15 })
        
        // 检测是否开启
        if (!this.switch) return e.reply('「未开启」请联系管理员开启！', true, { recallMsg: 15 })
            
        const startMessage = await e.reply(`[${Plugin_name}] 少女祈祷中…`)

        await redis.set(`${Plugin_name}_${e.group_id}_${e.user_id}_CD`, moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), { EX: config.pixiv_CD })

        const tags = e.msg.replace(new RegExp(`^来\\s?(${NumReg})?[张份点]\|[涩色瑟][图圖]`, 'g'), '').split(/[\s|,.\u3002\uff0c、]+/)

        if (tags.length > 3) {
            await e.reply(`标签数量过多！`, true, { recallMsg: 15 })
            return await this.clearCD()
        }

        tagValue = tags.map(tags => `&tag=${tags}`).join('')

        if (!tagValue || tagValue === '&tag=') tagValue = lodash.sample(random_pic).map(tags => `&tag=${tags.join('|')}`).join('')

        num = e.msg.match(new RegExp(NumReg))
        num = num ? convertChineseNumberToArabic(num[0]) : 1

        // 限制num最大值为20
        if (num > 20) {
            await e.reply('先生，冲太多会炸膛！', false, { at: true, recallMsg: 15 })
            return await this.clearCD()
        } else if (num === 0) {
            await e.reply('你TM故意找茬是不是？', false, { at: true, recallMsg: 15 })
            return await this.clearCD()
        } else if (num === '' || num === null) {
            num = 1
        }

        const r18Value = e.isMaster ? config.pixiv_r18_Master : config.pixiv_r18

        try {
            const proxy = config.pixiv_proxyAddress === '' ? null : await proxyAgent(config.pixiv_proxyAddress)
            const LoliconAPI = await fetch(`https://api.lolicon.app/setu/v2?proxy=${config.pixiv_proxy}&size=${config.pixiv_size}&r18=${r18Value}${tagValue}&excludeAI=${config.pixiv_excludeAI}&num=${num}`, { agent: proxy })
            const JSON = await LoliconAPI.json()

            if (Array.isArray(JSON.data) && JSON.data.length === 0) {
                this.recallMessage(e, startMessage)
                await e.reply(`[${Plugin_name}] 未获取到相关数据！`, false, { recallMsg: 15 })
                return await this.clearCD()
            }

            const msgs = []

            for (const item of JSON.data) {
                const response = await fetch(item.urls.original, { agent: proxy })
                if (response.ok) {
                    const imageArrayBuffer = await response.arrayBuffer()
                    const imageData = e.isGroup
                        ? await processImage(imageArrayBuffer)
                        : Buffer.from(imageArrayBuffer)

                    msgs.push([
                        '标题：' + item.title + '\n',
                        '画师：' + item.author + '\n',
                        'Pid：' + item.pid + '\n',
                        'R18：' + item.r18 + '\n',
                        'Tags：' + item.tags.join('，') + '\n',
                        segment.image(imageData)
                    ])
                    successCount++
                } else {
                    failureCount++
                }
            }

            // 图片仅有一张且失败的处理
            if (successCount === 0 && failureCount === 1) return e.reply(`[${Plugin_name}] 获取图片失败！`, false, { recallMsg: 15 })

            // 为获取图片不全的数组添加提示信息，但所有图片都获取成功时，不显示成功和失败数量（不想尾部添加提示信息注释掉本行代码即可
            if (failureCount > 0) msgs.push(`[${Plugin_name}] 获取图片成功 ${successCount} 张，失败 ${failureCount} 张~`)

            // 制作并发送转发消息
            const msg = await e.reply(await common.makeForwardMsg(e, msgs, `[-----${Plugin_name}-----]`))
            if (!msg) {
                this.recallMessage(e, startMessage)
                await e.reply('消息发送失败，可能被风控', false, { recallMsg: 15 })
                return await this.clearCD()
            } else {
                this.recallMessage(e, startMessage)
                return msg
            }
        } catch (err) {
            // 错误处理
            logger.warn(err)
            this.recallMessage(e, startMessage)
            await e.reply(`[${Plugin_name}] 请检查网络环境！`, false, { recallMsg: 15 })
            return await this.clearCD()
        }
    }
}

/**
 * 图片处理
 * @param {ArrayBuffer} imageData - 图片元数据
 * @returns {Promise<Buffer>} - 处理后的图片数据（转Buffer
 * @throws {Error} - 返回图片原数据（转Buffer
 */
async function processImage(imageData) {
    try {
        const metadata = await sharp(imageData).metadata()
        const options = ['brightness', 'contrast', 'saturation', 'hue', 'width', 'height']
        const option = options[Math.floor(Math.random() * options.length)]

        switch (option) {
            case 'brightness':
                imageData = await sharp(imageData).modulate({ brightness: 1 + Math.random() * 0.02 }).toBuffer()
                break

            case 'contrast':
                imageData = await sharp(imageData).modulate({ contrast: 1 + Math.random() * 0.02 }).toBuffer()
                break

            case 'saturation':
                imageData = await sharp(imageData).modulate({ saturation: 1 + Math.random() * 0.02 }).toBuffer()
                break

            case 'hue':
                imageData = await sharp(imageData).modulate({ hue: Math.floor(Math.random() * 3.6) }).toBuffer()
                break

            case 'width':
                imageData = await sharp(imageData).resize(metadata.width - 1 + Math.floor(Math.random() * 2), null, { withoutEnlargement: true }).toBuffer()
                break

            case 'height':
                imageData = await sharp(imageData).resize(null, metadata.height - 1 + Math.floor(Math.random() * 2), { withoutEnlargement: true }).toBuffer()
                break
        }

        return Buffer.from(imageData)
    } catch (err) {
        logger.warn(`处理图片发生错误！\n${err}\n请截图反馈开发者~`)
        return Buffer.from(imageData)
    }
}

/**
 * 将中文数字转换为阿拉伯数字
 * @param {string} input - 输入的中文数字字符串
 * @returns {number} - 转换后的阿拉伯数字
 */
function convertChineseNumberToArabic(
    input,
    ten = '',
    parts = [],
    result = '',
    temp = false,
    splitString = ''
) {
    if (!input && input != 0) return input

    if (/^\d+$/.test(input)) return Number(input)

    const dictionary = new Map([
        ['一', 1],
        ['二', 2],
        ['三', 3],
        ['四', 4],
        ['五', 5],
        ['六', 6],
        ['七', 7],
        ['八', 8],
        ['九', 9],
        ['壹', 1],
        ['贰', 2],
        ['叁', 3],
        ['肆', 4],
        ['伍', 5],
        ['陆', 6],
        ['柒', 7],
        ['捌', 8],
        ['玖', 9],
        ['两', 2]
    ])

    splitString = input.split('亿')
    const billionAndRest = splitString.length > 1 ? splitString : ['', input]
    const rest = billionAndRest[1]
    const billion = billionAndRest[0]
    splitString = rest.split('万')
    const tenThousandAndRemainder = splitString.length > 1 ? splitString : ['', rest]
    const tenThousand = tenThousandAndRemainder[0]
    const remainder = tenThousandAndRemainder[1]
    parts = [billion, tenThousand, remainder]

    parts = parts.map(item => {
        result = item.replace('零', '')
        const reg = new RegExp(`[${Array.from(dictionary.keys()).join('')}]`, 'g')
        result = result.replace(reg, substring => {
            return dictionary.get(substring)
        })
        temp = /\d(?=[千仟])/.exec(result)
        const thousand = temp ? temp[0] : '0'
        temp = /\d(?=[百佰])/.exec(result)
        const hundred = temp ? temp[0] : '0'
        temp = /\d?(?=[十拾])/.exec(result)
        if (temp === null) {
            ten = '0'
        } else if (temp[0] === '') {
            ten = '1'
        } else {
            ten = temp[0]
        }
        temp = /\d$/.exec(result)
        const num = temp ? temp[0] : '0'
        return thousand + hundred + ten + num
    })
    return parseInt(parts.join(''))
}
