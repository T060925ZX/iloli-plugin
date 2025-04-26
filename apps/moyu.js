import Cfg from '../model/Cfg.js'
import { segment } from 'oicq' 

export class moyu extends plugin {
    constructor() {
        super({
            name: "摸鱼日历",
            dsc: "获取摸鱼日历图片",
            event: "message",
            priority: -1,
            rule: [
                {
                    reg: `^#?(摸鱼|摸鱼日历)$`, 
                    fnc: "getMoyuImage"     
                }
            ]
        });

        this.config = Cfg.getConfig('api') || {};
        this.moyuApi = this.config.moyu || 'https://api.vvhan.com/api/moyu'; 
    }

    async getMoyuImage(e) {
        try {
            await this.reply(segment.image(this.moyuApi), { quote: true , at: false });
        } catch (error) {
            console.error("获取摸鱼图片失败:", error);
            await this.reply("摸鱼失败，API请求出错啦~");
        }
    }
}
