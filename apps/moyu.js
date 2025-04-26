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
      
      // 这些初始化代码应该放在构造函数的主体内
      this.config = Cfg.getConfig('api');
      this.moyu = this.config?.moyu || 'https://api.vvhan.com/api/moyu';
    }

  async moyu(e) {
    try {
        await this.reply(segment.image(this.config));
    } catch (error) {
        await this.reply('获取摸鱼图片失败');
    }
}

}
