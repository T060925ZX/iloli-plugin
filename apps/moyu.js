import Cfg from '../model/Cfg.js'

export class moyu extends plugin {
    constructor() {
      super({
        name: "摸鱼日历",
        dsc: "摸会鱼",
        event: "message",
        priority: -1,
        rule: [
          {
            reg: `^#?(摸鱼|摸鱼日历)$`,
            fnc: "moyu"
          }
        ]
      });
    this.config = Cfg.getConfig('api');
    this.moyu = this.config?.moyu || 'https://api.vvhan.com/api/moyu';
    }
  
    async moyu(e) {
        await this.reply(segment.image(this.moyu))
  }
}