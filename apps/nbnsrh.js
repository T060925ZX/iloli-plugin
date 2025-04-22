import axios from 'axios'
import Cfg from '../model/Cfg.js'

export class HumanLanguage extends plugin {
  constructor() {
    super({
      name: "能不能说人话？",
      dsc: "翻译抽象文字（如 yyds、xswl 等）",
      event: "message.group",
      priority: 5000,
      rule: [
        {
          // 匹配规则：必须包含至少2个连续字母，且不包含任何特殊符号
          reg: "(?:^|\\s)([a-zA-Z]{2,}[a-zA-Z0-9\u4e00-\u9fa5]*)(?=$|\\s|[,.!?])",
          fnc: "translateAbbreviation"
        }
      ]
    })

    this.config = Cfg.getConfig('config');
    this.switch = this.config?.nbnsrh || true;
  }

  async translateAbbreviation() {
    if (!this.switch) return false

    const text = this.e.msg
    // 匹配所有不包含特殊符号的字母组合（允许混合数字/中文）
    const abbreviations = [...text.matchAll(/(?:^|\s)([a-zA-Z]{2,}[a-zA-Z0-9\u4e00-\u9fa5]*)(?=$|\s|[,.!?])/g)]
      .map(match => match[1].replace(/[^a-zA-Z]/g, '')) // 提取纯字母部分

    if (!abbreviations || abbreviations.length === 0) {
      return false
    }

    const uniqueAbbreviations = [...new Set(abbreviations)]

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
          logger.debug(`"${abbr}" 没有找到对应的翻译`)
          continue
        }

        const translations = data[0].trans.slice(0, 5).join("  ")
        this.reply([
          `[iloli] 🔍 "${abbr}" 的可能含义：`,
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
