import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import Cfg from '../model/Cfg.js';
import Button from '../model/Buttons.js';

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const SAVE_DIR = path.join(pluginDir, 'temp', 'life_simulator');

if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

export class AILifeSimulator extends plugin {
    constructor() {
        super({
            name: 'AI人生模拟器',
            dsc: '基于AI的人生模拟',
            event: 'message',
            priority: 100,
            rule: [
                {
                    reg: '^#?(模拟人生|人生模拟)$',
                    fnc: 'startLife'
                },
                {
                    reg: '^#?(我的人生|人生进度)$',
                    fnc: 'showLife'
                },
                {
                    reg: '^#?(下一阶段|人生继续)$',
                    fnc: 'nextStage'
                },
                {
                    reg: '^#?(重开人生|人生重置)$',
                    fnc: 'resetLife'
                },
                {
                    reg: '^#人生帮助$',
                    fnc: 'showHelp'
                }
            ]
        });

        // 初始化目录
        if (!fs.existsSync(SAVE_DIR)) {
            fs.mkdirSync(SAVE_DIR, { recursive: true });
        }
        
        // 获取配置
        this.config = Cfg.getConfig('config');
        
        // 模型配置
        this.modelType = this.config?.ai_life_model || "deepseek";
        
        // 设置API参数
        switch (this.modelType) {
            case "moonshot":
                this.apiUrl = this.config?.moonshot_url;
                this.apiKey = this.config?.moonshot_sk;
                this.modelName = this.config?.moonshot_model;
                break;
            case "qwen":
                this.apiUrl = this.config?.qwen_base_url;
                this.apiKey = this.config?.qwen_api_key;
                this.modelName = this.config?.qwen_model;
                break;
            default: // deepseek
                this.apiUrl = this.config?.deepseek_url;
                this.apiKey = this.config?.deepseek_sk;
                this.modelName = this.config?.deepseek_model;
        }

        if (!this.apiKey) {
            logger.error(`未配置${this.modelType} API密钥！`);
        }

        this.stages = [
            { name: "童年", ageRange: "0-12岁" },
            { name: "青少年", ageRange: "13-18岁" },
            { name: "成年早期", ageRange: "19-30岁" },
            { name: "中年", ageRange: "31-50岁" },
            { name: "老年", ageRange: "51+" }
        ];
    }

    // ============ 核心功能 ============
    async startLife(e) {
        const savePath = this.getSavePath(e.user_id);
        
        if (fs.existsSync(savePath)) {
            await e.reply('⚠️ 你已有正在进行的人生，使用 #我的人生 查看');
            return true;
        }

        if (!this.apiKey) {
            await e.reply('❌ 服务未配置，请联系管理员');
            return true;
        }

        try {
            const prompt = `生成以下JSON数据：
{
  "background": "随机出生背景(50字)",
  "traits": ["特质1", "特质2", "特质3"],
  "challenges": ["挑战1", "挑战2"]
}`;

            const response = await this.callAPI(prompt);
            const { background, traits, challenges } = this.parseJSON(response);

            const lifeData = {
                name: e.sender.card || e.sender.nickname,
                currentStage: 0,
                age: 0,
                background,
                traits: traits.slice(0, 3),
                challenges: challenges.slice(0, 2),
                memories: [],
                attributes: {
                    健康: this.getRandomValue(35, 65),
                    智力: this.getRandomValue(35, 65),
                    魅力: this.getRandomValue(35, 65),
                    财富: this.getRandomValue(35, 65),
                    幸福: 50
                }
            };

            this.saveData(savePath, lifeData);
            
            const startMsg = [
                '🎉 人生已启动！',
                '——————————',
                `📜 背景: ${background}`,
                `✨ 特质: ${traits.join('、')}`,
                `⚠️ 挑战: ${challenges.join('、')}`,
                '——————————',
                '输入 #下一阶段 继续'
            ].join('\n');

            await e.reply([startMsg, new Button().life()]);

        } catch (err) {
            await e.reply('❌ 创建失败，请稍后再试');
            logger.error('创建失败:', err);
        }
        return true;
    }

    async nextStage(e) {
        const savePath = this.getSavePath(e.user_id);
        
        if (!fs.existsSync(savePath)) {
            await e.reply('⚠️ 请先 #模拟人生 开始');
            return true;
        }

        try {
            let lifeData = this.loadData(savePath);
            
            if (lifeData.currentStage >= this.stages.length - 1) {
                const endMsg = '🎉 人生已完结！用 #重开人生 开始新生';
                await e.reply([endMsg, new Button().life()]);
                return true;
            }

            const nextStage = this.stages[lifeData.currentStage + 1];
            const prompt = this.buildPrompt(lifeData);
            
            const response = await this.callAPI(prompt);
            const { events, attribute_changes } = this.parseJSON(response);

            // 更新数据
            lifeData.currentStage++;
            lifeData.age = this.calculateAge(nextStage.ageRange);
            lifeData.memories.push({
                stage: nextStage.name,
                events: events.slice(0, 3),
                changes: attribute_changes
            });

            // 更新属性
            Object.entries(attribute_changes).forEach(([attr, val]) => {
                lifeData.attributes[attr] = Math.max(0, Math.min(100, 
                    (lifeData.attributes[attr] || 50) + Number(val)));
            });

            this.saveData(savePath, lifeData);
            
            const stageMsg = [
                `🌠 ${nextStage.name} (${nextStage.ageRange})`,
                '——————————',
                ...events.slice(0, 3).map((e, i) => `${i+1}. ${e}`),
                '——————————',
                ...Object.entries(attribute_changes)
                    .filter(([_, v]) => v !== 0)
                    .map(([k, v]) => `· ${k}: ${v > 0 ? '+' : ''}${v}`),
                '——————————',
                lifeData.currentStage < this.stages.length - 1 
                    ? '输入 #下一阶段 继续' 
                    : '人生旅程已完成'
            ].join('\n');

            await e.reply([stageMsg, new Button().life()]);

        } catch (err) {
            await e.reply('❌ 推进失败: ' + this.getErrorMsg(err));
            logger.error('推进失败:', err);
        }
        return true;
    }

    // ============ API调用 ============
    async callAPI(prompt, retry = 3) {
        if (!this.apiKey) throw new Error('API密钥未配置');

        for (let i = 0; i < retry; i++) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                };

                // Qwen特殊处理
                if (this.modelType === "qwen") {
                    headers['X-DashScope-SSE'] = 'enable';
                }

                const body = {
                    model: this.modelName,
                    messages: [
                        {
                            role: "system",
                            content: "你是一个人生模拟器，必须返回严格JSON格式的数据,背景可好可坏，结局可好可坏"
                        },
                        { role: "user", content: prompt }
                    ],
                    temperature: 1.5,
                    response_format: { type: "json_object" }
                };

                // Qwen请求体特殊格式
                if (this.modelType === "qwen") {
                    body.input = { messages: body.messages };
                    delete body.messages;
                }

                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    timeout: 30000
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || `HTTP ${response.status}`);
                }

                const data = await response.json();
                return this.modelType === "qwen" ? data.output.text : data.choices[0].message.content;

            } catch (err) {
                if (i === retry - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // ============ 工具方法 ============
    parseJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (typeof data !== 'object') throw new Error('返回的不是JSON对象');
            return data;
        } catch (err) {
            logger.error('解析失败:', jsonStr);
            throw new Error('API返回数据格式错误');
        }
    }

    buildPrompt(lifeData) {
        const stage = this.stages[lifeData.currentStage + 1];
        return `请为${stage.name}阶段(${stage.ageRange})生成JSON数据：
{
  "events": ["事件1", "事件2", "事件3"],
  "attribute_changes": {
    "健康": 数值(-10~10),
    "智力": 数值(-10~10),
    "魅力": 数值(-10~10),
    "财富": 数值(-10~10),
    "幸福": 数值(-10~10)
  }
}
参考背景:
- 特质: ${lifeData.traits.join(', ')}
- 挑战: ${lifeData.challenges.join(', ')}
- 上一阶段: ${lifeData.memories.slice(-1)[0]?.events.join('; ') || '无'}`;
    }

    getSavePath(uid) {
        return path.join(SAVE_DIR, `${uid}.json`);
    }

    loadData(path) {
        try {
            return JSON.parse(fs.readFileSync(path, 'utf-8'));
        } catch (err) {
            logger.error('读取失败:', err);
            throw new Error('人生数据损坏');
        }
    }

    saveData(path, data) {
        try {
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
        } catch (err) {
            logger.error('保存失败:', err);
            throw new Error('保存数据失败');
        }
    }

    calculateAge(ageRange) {
        const [min, max] = ageRange.split('-').map(s => parseInt(s) || 0);
        return max ? Math.floor((min + max) / 2) : min + 5;
    }

    getRandomValue(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getErrorMsg(err) {
        if (err.message.includes('API密钥')) return '服务配置错误';
        if (err.message.includes('rate limit')) return '操作太频繁';
        if (err.message.includes('timeout')) return '请求超时';
        return '系统繁忙';
    }

    // ============ 其他命令 ============
    async showLife(e) {
        try {
            const data = this.loadData(this.getSavePath(e.user_id));
            const stage = this.stages[data.currentStage];
            
            const lifeMsg = [
                `📜 ${data.name}的人生`,
                '——————————',
                `阶段: ${stage.name} (${data.age}岁)`,
                `特质: ${data.traits.join('、')}`,
                '——————————',
                ...Object.entries(data.attributes).map(([k, v]) => `· ${k}: ${v}`),
                '——————————',
                `输入 #下一阶段 继续`
            ].join('\n');

            await e.reply([lifeMsg, new Button().life()]);
        } catch {
            await e.reply('⚠️ 你还没有开始人生');
        }
        return true;
    }

    async resetLife(e) {
        try {
            fs.unlinkSync(this.getSavePath(e.user_id));
            const resetMsg = '🔄 人生已重置，用 #模拟人生 开始';
            await e.reply([resetMsg, new Button().life()]);
        } catch {
            await e.reply('⚠️ 你还没有开始人生');
        }
        return true;
    }

    async showHelp(e) {
        const helpMsg = [
            '📚 使用帮助',
            '——————————',
            '#模拟人生 - 开始新人生',
            '#下一阶段 - 推进人生',
            '#我的人生 - 查看状态',
            '#重开人生 - 重置人生',
            '——————————',
            `当前模型: ${this.modelType}`,
            '——————————',
            '人生阶段:',
            ...this.stages.map(s => `· ${s.name} (${s.ageRange})`)
        ].join('\n');
        
        await e.reply([helpMsg, new Button().life()]);
        return true;
    }
}
