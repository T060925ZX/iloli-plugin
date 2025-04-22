import axios from 'axios'

export class HumanLanguage extends plugin {
  constructor() {
    super({
      name: "能不能说人话？",
      dsc: "翻译抽象文字（如 yyds、xswl 等）",
      event: "message.group",
      priority: 5000,
      rule: [
        {
          reg: "([a-zA-Z]{2,})", 
          fnc: "translateAbbreviation"
        }
      ]
    })

    this.config = Cfg.getConfig('config');
    this.switch = this.config?.nbnsrh || "true";
  }

  async translateAbbreviation() {
    if (!this.switch) return false

    const text = this.e.msg
    const abbreviations = text.match(/([a-zA-Z]{2,})/g) // 提取所有匹配的字母组合

    if (!abbreviations || abbreviations.length === 0) {
      return false // 如果没有匹配到，直接结束
    }

    const uniqueAbbreviations = [...new Set(abbreviations)]

    // 逐个查询翻译
    for (const abbr of uniqueAbbreviations) {
      try {
        const { data } = await axios.post(
          "https://lab.magiconch.com/api/nbnhhsh/guess",
          { text: abbr },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 5000
          }
        )

        if (!data || data.length === 0 || !data[0].trans) {
          logger.warn(`"${abbr}" 没有找到对应的翻译`)
          continue
        }

        const translations = data[0].trans.slice(0, 5).join("、")
        this.reply([
          `🔍 "${abbr}" 的可能含义：`,
          translations,
          data[0].trans.length > 5 ? `\n（还有 ${data[0].trans.length - 5} 个其他解释）` : ''
        ].join('\n'))

      } catch (error) {
        logger.warn('[抽象话翻译] API错误:', error)
        logger.error(`"${abbr}" 翻译失败，可能是网络问题`)
      }
    }

    return false
  }
}