import Cfg from '../model/Cfg.js'

export class Bro extends plugin {
  constructor() {
    super({
      name: "有的兄弟",
      dsc: "像这样的兄弟还有九个",
      event: "message.group",
      priority: 5001,
      rule: [
        {
          reg: "((.*)?有(.*)?(吗|嘛)(.*)?|(.*)?有没(.*)?)",
          fnc: "bro"
        },
        {
          reg: "(.*)?能(.*)?(吗|嘛)(.*)?",
          fnc: "canDo"
        }
      ]
    })
    this.config = Cfg.getConfig('config');
    this.switch = this.config?.bro || true;
  }

  async bro() {
    if (!this.switch) return false
    
    this.reply('有的兄弟，有的', { quote: true, at: false }); 
    return false;
  }

  async canDo() {
    if (!this.switch) return false
    
    const match = this.e.msg.match(/能(.*?)(吗|嘛)/);
    if (match && match[1]) {
      const action = match[1].trim();
      this.reply(`包能${action}的`, { quote: true, at: false }); 
    } else {
      this.reply('包的', { quote: true, at: false }); 
    }
    return false;
  }
}