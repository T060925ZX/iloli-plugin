import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import moment from 'moment'
const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const DataDir = path.join(pluginDir, 'data');

if (!fs.existsSync(DataDir)) {
    fs.mkdirSync(DataDir, { recursive: true });
}

export class GlobalMessagePlugin extends plugin {
  constructor() {
    super({
      name: '[iloli]留言',
      dsc: '留言提醒',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: '^#留言.*',
          fnc: 'leaveMessage'
        }
      ]
    })
    
    this.dataFilePath = path.resolve(DataDir, "leavemsg.json")
    this.loadData()
    
    // 监听所有消息事件
    Bot.on("message", e => {
      if (this.hasMessageForUser(e.user_id)) {
        this.notifyUser(e)
      }
    })
  }

  loadData() {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        fs.mkdirSync(path.dirname(this.dataFilePath), { recursive: true })
        fs.writeFileSync(this.dataFilePath, '{}')
      }
      this.messageData = JSON.parse(fs.readFileSync(this.dataFilePath, 'utf-8')) || {}
    } catch (err) {
      logger.error('留言数据加载失败:', err)
      this.messageData = {}
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.messageData, null, 2))
    } catch (err) {
      logger.error('留言数据保存失败:', err)
    }
  }

  hasMessageForUser(userId) {
    return !!this.messageData[String(userId)]?.length
  }

  async notifyUser(e) {
    const qq = String(e.user_id)
    if (!this.messageData[qq] || this.messageData[qq].length === 0) return
    
    // 随机问候语和表情
    const greetings = [
      "📨 你有新留言啦！",
      "💌 叮咚！有人给你留言了~",
      "📝 快来看看谁给你留言了！",
      "🔔 留言提醒来啦！",
      "✉️ 有人给你留了小纸条~"
    ]
    
    for (const msg of this.messageData[qq]) {
      try {
        const replyContent = [
          segment.at(qq),
          `\n`,
          _.sample(greetings),
          `\n来自 QQ：${msg.sender} 的留言：`, 
          `\n=======================`,
          `\n${msg.message}`,
          `\n=======================`,
          `\n⏰ 留言时间：${moment(msg.time).format('YYYY-MM-DD HH:mm:ss')}`,
          `\n📌 来源：${msg.originGroup ? '群聊' : '私聊'}`
        ]
        
        if (e.isGroup) {
          await Bot.pickGroup(e.group_id).sendMsg(replyContent)
        } else {
          await Bot.pickFriend(e.user_id).sendMsg(replyContent)
        }
      } catch (err) {
        logger.error(`留言发送失败[用户${qq}]:`, err)
      }
    }
    
    // 删除已发送的留言
    delete this.messageData[qq]
    this.saveData()
  }

  async leaveMessage(e) {
    // 提取QQ号（优先使用@的QQ号）
    let qqNumber = e.at
    if (!qqNumber) {
      const match = e.msg.match(/#留言\s*@?(\d+)/)
      qqNumber = match?.[1]
    }
    
    // 清理QQ号格式
    if (qqNumber && typeof qqNumber === 'string') {
      qqNumber = qqNumber.replace(/\D/g, '')
    }
    
    // 检查QQ号有效性
    if (!qqNumber || qqNumber.length < 5 || qqNumber.length > 11) {
      await e.reply([
        '请指定有效的QQ号！',
        '\n格式：#留言内容 @某人',
        '\n或：#留言内容 123456'
      ], { quote: true })
      return
    }

    // 提取留言内容
    const content = e.msg
      .replace(/^#留言/, '')
      .replace(new RegExp(`@?${qqNumber}`), '')
      .trim()
    
    if (!content) {
      await e.reply('留言内容不能为空！', { quote: true })
      return
    }

    // 存储留言
    const qq = String(qqNumber)
    const sender = e.user_id  // 使用 e.user_id 获取发送者QQ
    
    if (!this.messageData[qq]) {
      this.messageData[qq] = []
    }

    this.messageData[qq].push({
      sender,  // 存储发送者QQ号
      message: content,
      time: new Date().toISOString(),
      originGroup: e.isGroup ? e.group_id : null
    })

    this.saveData()
    
    // 发送成功回复
    await e.reply([
      `📩 留言成功！`,
      `\n收件人：${qqNumber}`,
      `\n内容：${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      `\n当TA下次发言时会收到提醒~`
    ], { quote: true })
  }
}