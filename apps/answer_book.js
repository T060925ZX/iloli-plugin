import Cfg from '../model/Cfg.js'
import Button from '../model/Buttons.js'

export class AnswerBook extends plugin {
  constructor() {
    super({
      name: "答案之书",
      dsc: "随机给出神秘答案",
      event: "message.group",
      priority: 5002,
      rule: [
        {
          reg: "^#答案之书\\s*(.+)$", 
          fnc: "getAnswer"
        }
      ]
    })
    
    // 加载配置文件中的答案列表
    this.config = Cfg.getConfig('answer_book', false);
    this.answers = this.config?.answers || [
      "是的，毫无疑问",
      "不太可能",
      "再问一次吧",
      "未来可期",
      "时机未到",
      "绝对如此",
      "不要指望",
      "好兆头",
      "坏兆头",
      "顺其自然",
      "努力争取",
      "静观其变",
      "一切皆有可能",
      "不要放弃",
      "命运自有安排"
    ];
  }

  async getAnswer() {
    const question = this.e.msg.replace(/^#答案之书\s*/, '').trim();
    
    if (!question) {
      await Bot.pickGroup(this.e.group_id).sendMsg("请提出你的问题");
      return false;
    }

    const randomIndex = Math.floor(Math.random() * this.answers.length);
    const answer = this.answers[randomIndex];

    await this.reply([
      `📖 你的问题：${question}\n` + 
      `📖 答案之书：${answer}`
    , new Button().answer_book()]);

    return false;
  }
}