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
        }
      ]
    })
  }

  async bro() {
    this.reply('有的兄弟，有的')
    return false
  }
}
