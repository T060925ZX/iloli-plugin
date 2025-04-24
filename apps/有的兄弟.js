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

    await Bot.pickGroup(this.e.group_id).sendMsg('有的兄弟，有的');

    return false;
  }

  async canDo() {
    if (!this.switch) return false
  
    const match = this.e.msg.match(/能([\u4e00-\u9fa5])(吗|嘛)(.*)?/);

    if (match && match[1]) {
      const word = match[1]; 
      await Bot.pickGroup(this.e.group_id).sendMsg(`包能${word}的`);
    } else {
      await Bot.pickGroup(this.e.group_id).sendMsg('包的');
    }
    return false;
  }
}
