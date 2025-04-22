import axios from 'axios'

export class HumanLanguage extends plugin {
  constructor() {
    super({
      name: "能不能说人话？",
      dsc: "翻译抽象文字",
      event: "message.group",
      priority: 5000,
      rule: [
        {
          reg: "^[a-zA-Z]{2,}$", // 匹配 2 个及以上纯字母
          fnc: "translateAbbreviation"
        }
      ]
    })

    // 默认开启
    this.switch = true
  }

  async translateAbbreviation() {
    if (!this.switch) return false

    const text = this.e.msg.trim()
    try {
      const { data } = await axios.post(
        "https://lab.magiconch.com/api/nbnhhsh/guess",
        { text },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 5000 // 5秒超时
        }
      )

      if (!data || data.length === 0 || !data[0].trans) {
        return this.reply(`"${text}" 没有找到对应的翻译`)
      }

      const translations = data[0].trans.slice(0, 5).join("、") // 只显示前5个结果
      return this.reply([
        `🔍 "${text}" 的可能含义：`,
        translations,
        data[0].trans.length > 5 ? `\n（还有 ${data[0].trans.length - 5} 个其他解释）` : ''
      ].join('\n'))

    } catch (error) {
      console.error('[抽象话翻译] API错误:', error)
      if (error.code === 'ECONNABORTED') {
        return this.reply('翻译超时，请稍后再试')
      }
      return this.reply('翻译服务暂时不可用')
    }
  }
}
