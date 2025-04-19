import { segment } from 'oicq';
import cfg from '../../../lib/config/config.js';
import common from '../../../lib/common/common.js';
import moment from "moment";
import _ from 'lodash';
import Cfg from '../model/Cfg.js';

export class chuo extends plugin {
    constructor() {
        super({
            name: '戳一戳',
            dsc: '戳一戳机器人触发效果',
            event: 'notice.group.poke',
            priority: -9999,
            rule: [{ fnc: 'chuoyichuo' }]
        });

        // 加载配置
        this.systemCfg = Cfg.getConfig('config');
        this.chuoCfg = Cfg.getConfig('chuo');

        // 配置合并
        this.prob = {
            text: this.systemCfg.probabilities?.text || 0.6,
            img: this.systemCfg.probabilities?.img || 0.1,
            voice: this.systemCfg.probabilities?.voice || 0,
            mute: this.systemCfg.probabilities?.mute || 0.05,
            video: this.systemCfg.probabilities?.video || 0.15
        };

        this.settings = {
            master: this.systemCfg.settings?.master || "主人",
            mutetime: this.systemCfg.settings?.mutetime || 1,
            speakerapi: this.systemCfg.settings?.speakerapi || "纳西妲",
            emoji_api: this.systemCfg.settings?.emoji_api || "https://api.lolimi.cn/API/chaiq/c.php",
            video_api: this.systemCfg.settings?.video_api || "https://api.yujn.cn/api/nvda.php?type=video",
            tts_api: this.systemCfg.settings?.tts_api || "http://frp-fit.top:42444/tts"
        };

        this.replies = {
            text: this.chuoCfg.replies?.text || [],
            voice: this.chuoCfg.replies?.voice || [],
            counter: this.chuoCfg.replies?.counter || []
        };

        // 默认回复兜底
        if (this.replies.text.length === 0) {
            this.replies.text = ["被戳晕了……轻一点啦！", "救命啊，有变态>_<！！！"];
        }
    }

    async chuoyichuo(e) {
        // 将enabled初始化移到async函数内
        this.enabled = this.systemCfg.chuo !== false; // 默认true
        
        if (!this.enabled) return;

        const replyActions = {
            text: () => {
                logger.info('[回复随机文字生效]');
                e.reply(_.sample(this.replies.text));
            },
            image: () => {
                logger.info('[回复随机图片生效]');
                e.reply(segment.image(this.settings.emoji_api));
            },
            voice: () => {
                logger.info('[回复随机语音生效]');
                const text = _.sample(this.replies.voice);
                if (!text) return replyActions.text();
                e.reply(segment.record(`${this.settings.tts_api}?character=${this.settings.speakerapi}&text=${encodeURIComponent(text)}`));
            },
            video: () => {
                logger.info('[回复随机视频生效]');
                e.reply('戳累了，看会视频吧！');
                e.reply(segment.video(this.settings.video_api));
            },
            mute: async (usercount) => {
                logger.info('[禁言生效]');
                const duration = this.settings.mutetime === 0 ? 
                    60 * (usercount + 1) : 
                    60 * this.settings.mutetime;
                await e.group.muteMember(e.operator_id, Math.min(duration, 21600));
            },
            counterAttack: async () => {
                e.reply(_.sample([
                    '吃我一拳喵！', 
                    '你刚刚是不是戳我了，你是坏蛋！',
                    '是不是要本萝莉揍你一顿才开心啊！！！'
                ]));
                await common.sleep(1000);
                await e.group.pokeMember(e.operator_id);
            }
        };

        // 主人保护逻辑
        if (cfg.masterQQ.includes(e.target_id)) {
            await this.handleMasterPoke(e);
            return true;
        }

        if (e.target_id === e.self_id) {
            const count = await this.getCount('Yz:pokecount:', e.group_id);
            const usercount = this.settings.mutetime === 0 ? 
                await this.getCount(`Yz:pokecount${e.operator_id}:`) : 
                0;

            // 防刷提示
            if (_.random(1, 100) <= 20 && count >= 10) {
                const msg = _.sample(this.replies.counter)
                    .replace("_num_", count);
                e.reply(msg);
                return;
            }

            // 概率决策
            const rand = _.random(0, 1, true);
            const thresholds = [
                this.prob.text,
                this.prob.text + this.prob.img,
                this.prob.text + this.prob.img + this.prob.voice,
                this.prob.text + this.prob.img + this.prob.voice + this.prob.mute,
                this.prob.text + this.prob.img + this.prob.voice + this.prob.mute + this.prob.video
            ];

            if (rand <= thresholds[0]) replyActions.text();
            else if (rand <= thresholds[1]) replyActions.image();
            else if (rand <= thresholds[2]) replyActions.voice();
            else if (rand <= thresholds[3]) await replyActions.mute(usercount);
            else if (rand <= thresholds[4]) replyActions.video();
            else await replyActions.counterAttack();
        }
    }

    async handleMasterPoke(e) {
        if (cfg.masterQQ.includes(e.operator_id)) return;
        
        e.reply([
            segment.at(e.operator_id),
            `\n你几把谁啊, 竟敢戳我亲爱滴${this.settings.master}, 胆子好大啊你`,
            segment.image(this.settings.emoji_api)
        ], true);
        
        await common.sleep(1000);
        await e.group.pokeMember(e.operator_id);
        await e.group.muteMember(e.operator_id, 60);
    }

    async getCount(key, group_id) {
        const count = (await redis.get(key + (group_id || ''))) || 0;
        await redis.set(key + (group_id || ''), +count + 1, { 
            EX: this.getExpireTime() 
        });
        return +count + 1;
    }

    getExpireTime() {
        return moment().endOf('day').unix() - moment().unix();
    }
}