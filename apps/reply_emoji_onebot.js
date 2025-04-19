import lodash from 'lodash'
import Cfg from '../model/Cfg.js'

const config = Cfg.getConfig('config')

const enabled = config.onebot_emoji_enable !== false 

// 黑白名单配置
const whiteUserList = config.onebot_emoji_whiteUserList || [] // 白名单用户
const whiteGroupList = config.onebot_emoji_whiteGroupList || [] // 白名单群
const blackUserList = config.onebot_emoji_blackUserList || [] // 黑名单用户
const blackGroupList = config.onebot_emoji_blackGroupList || [] // 黑名单群

// 其他配置
const globalRandom = config.onebot_emoji_globalRandom || 100 // 响应概率
const sleepTime = config.onebot_emoji_sleepTime || 100 // 延迟时间(毫秒)
const all = config.onebot_emoji_all !== false // 是否响应所有表情
const fixedEmojiId = config.onebot_emoji_fixedEmojiId || 66 // 默认表情ID

Bot.on('message.group', async (e) => {
  if (!enabled) return // 主开关检查
  e.isGroup = true
  const emoji = new botResponseEmoji(e)
  await emoji.botEmoji(e)
})

export class botResponseEmoji extends plugin {
  constructor (e) {
    super({
      name: '回应表情',
      dsc: '回应表情',
      event: 'message.group',
      priority: 0,
      handler: [{ key: 'bot.tool.emoji', fn: 'botToolEmoji' }]
    })
  }

  async botToolEmoji (e) {
    if (!e?.message_id) return false
    if (e?.message?.length === 0) return false
    e.isResEmoji = true
    if (!this.isWhite(e)) {
      return await this.botEmoji(e)
    }
    return true
  }

  // 判断是否是白名单群或者白名单用户
  isWhite (e) {
    // 黑名单检查（优先于白名单）
    if (blackGroupList.includes(e.group_id)) return false
    if (blackUserList.includes(e.user_id)) return false
    
    // 白名单检查
    if (whiteGroupList.length > 0 && !whiteGroupList.includes(e.group_id)) return false
    if (whiteUserList.length > 0 && !whiteUserList.includes(e.user_id)) return false
    
    return true
  }

  async botEmoji (e) {
    if (e.bot?.adapter?.name !== 'OneBotv11') {
      return
    }
    if (this.isConfig(e) || e.isResEmoji) {
      if (all) {
        const face = []
        e.message.forEach((i) => {
          if (i.type === 'face') {
            face.push({ id: i.id })
          } else if (i.type === 'text') {
            const emojiList = this.extractEmojis(i.text)
            if (emojiList.length) {
              for (const emoji of emojiList) {
                const id = emoji.codePointAt(0)
                face.push({ id })
              }
            }
          }
        })
        if (face.length) {
          const seq = e?.message_id
          for (const i of face) {
            if (sleepTime > 0) await sleep(sleepTime)
            logger.info(`表情复读faceId：${i.id}`)
            await e.bot.sendApi('set_msg_emoji_like', { message_id: seq, emoji_id: String(i.id) })
          }
        }
      }

      // 指定表情回应
      const random = lodash.random(1, 100)
      if (random < globalRandom || e.isResEmoji) {
        logger.info(`指定表情faceId：${fixedEmojiId}`)
        if (sleepTime > 0) await sleep(sleepTime)
        await e.bot.sendApi('set_msg_emoji_like', { 
          message_id: e.message_id, 
          emoji_id: String(fixedEmojiId) 
        })
      }

      return false
    }
  }

  // 判断配置
  isConfig (e) {
    if (!e.isGroup) return false
    
    // 黑名单检查（优先于白名单）
    if (blackGroupList.includes(e.group_id)) return false
    if (blackUserList.includes(e.user_id)) return false
    
    // 白名单检查
    if (whiteGroupList.length > 0 && !whiteGroupList.includes(e.group_id)) return false
    if (whiteUserList.length > 0 && !whiteUserList.includes(e.user_id)) return false
    
    return true
  }

  extractEmojis (text) {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu
    const emojis = text.match(emojiRegex)
    return emojis || []
  }
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
