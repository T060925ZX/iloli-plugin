import Button from '../model/Buttons.js';
import Cfg from '../model/Cfg.js';
import yaml from 'yaml';
import fs from 'node:fs';

export class RandomAbility extends plugin {
    constructor() {
        super({
            name: '随机超能力',
            dsc: '获取随机超能力及副作用',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: "^#?(今日|随机)超能力$",
                    fnc: 'getAbility'
                },
                {
                    reg: "^#?(刷新能力列表|重载能力)$",
                    fnc: 'refreshList'
                },
                {
                    reg: "^#?能力统计$",
                    fnc: 'showStats'
                },
                {
                    reg: "^#?新增超能力\\s+(.+)$",
                    fnc: 'addBuff'
                },
                {
                    reg: "^#?新增副作用\\s+(.+)$",
                    fnc: 'addDebuff'
                }
            ]
        });

        // 初始化数据容器
        this.abilityData = {
            buff: new Set(),
            debuff: new Set()
        };
        
        this.configName = 'random_ability'; 
        this.init();
    }

    async init() {
        try {
            // 加载配置
            await this.loadConfig();
            
            logger.debug(`[随机超能力] 初始化完成，加载 ${this.abilityData.buff.size} 个超能力和 ${this.abilityData.debuff.size} 个副作用`);
        } catch (err) {
            logger.warn('[随机超能力] 初始化失败:', err);
        }
    }

    async loadConfig() {
        // 获取配置
        this.config = Cfg.getConfig(this.configName) || {};
        
        // 初始化默认配置结构
        if (!this.config.buff) this.config.buff = [];
        if (!this.config.debuff) this.config.debuff = [];
        
        // 加载数据
        this.abilityData.buff.clear();
        this.config.buff.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
                this.abilityData.buff.add(item.trim());
            }
        });
        
        this.abilityData.debuff.clear();
        this.config.debuff.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
                this.abilityData.debuff.add(item.trim());
            }
        });
    }

    async saveConfig() {
        // 转换Set为数组
        this.config.buff = Array.from(this.abilityData.buff);
        this.config.debuff = Array.from(this.abilityData.debuff);
        
        // 保存配置
        return Cfg.setConfig(this.configName, this.config);
    }

    async refreshList(e) {
        try {
            // 重新加载配置
            await this.loadConfig();
            
            await e.reply([
                '🔄 能力列表已刷新',
                `• 超能力: ${this.abilityData.buff.size}种`,
                `• 副作用: ${this.abilityData.debuff.size}种`,
                '——————————————',
                '输入 #能力统计 查看详情'
            ].join('\n'), new Button().ability());
        } catch (err) {
            await e.reply('❌ 刷新失败，请检查日志');
            logger.error('[随机超能力] 刷新失败:', err);
        }
        return true;
    }

    async showStats(e) {
        await e.reply([
            '📊 能力库存统计',
            '——————————————',
            `✨ 超能力: ${this.abilityData.buff.size}种`,
            `⚠️ 副作用: ${this.abilityData.debuff.size}种`,
            '——————————————',
            '使用 #刷新能力列表 更新数据'
        ].join('\n'), new Button().ability());
        return true;
    }

    async getAbility(e) {
        if (this.abilityData.buff.size === 0 || this.abilityData.debuff.size === 0) {
            await e.reply('能力列表为空，请检查配置文件...');
            return true;
        }

        // 转换为数组提高随机访问性能
        const buffArray = [...this.abilityData.buff];
        const debuffArray = [...this.abilityData.debuff];
        
        const msg = [
            '🎁 你获得了新的能力组合 🎁',
            `【超能力】${this.getRandomItem(buffArray)}`,
            '——————————————',
            `【副作用】${this.getRandomItem(debuffArray)}`,
            '——————————————'
        ];

        await e.reply(msg.join('\n'), new Button().ability());
        return true;
    }

    async addBuff(e) {
        const newBuff = e.msg.replace(/^#?新增超能力\s+/, '').trim();
        
        if (!newBuff) {
            await e.reply('❌ 请输入有效的超能力描述');
            return true;
        }
        
        if (this.abilityData.buff.has(newBuff)) {
            await e.reply('⚠️ 该超能力已存在');
            return true;
        }
        
        this.abilityData.buff.add(newBuff);
        await this.saveConfig();
        
        await e.reply([
            '✅ 超能力添加成功',
            `新增: ${newBuff}`,
            `当前超能力总数: ${this.abilityData.buff.size}`
        ].join('\n'), new Button().ability());
        return true;
    }

    async addDebuff(e) {
        const newDebuff = e.msg.replace(/^#?新增副作用\s+/, '').trim();
        
        if (!newDebuff) {
            await e.reply('❌ 请输入有效的副作用描述');
            return true;
        }
        
        if (this.abilityData.debuff.has(newDebuff)) {
            await e.reply('⚠️ 该副作用已存在');
            return true;
        }
        
        this.abilityData.debuff.add(newDebuff);
        await this.saveConfig();
        
        await e.reply([
            '✅ 副作用添加成功',
            `新增: ${newDebuff}`,
            `当前副作用总数: ${this.abilityData.debuff.size}`
        ].join('\n'), new Button().ability());
        return true;
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}