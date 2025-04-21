import fetch from "node-fetch";
import fs from 'fs';
import path from 'path';
import Cfg from '../model/Cfg.js';

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const tempDir = path.join(pluginDir, 'temp', 'AI');

// 确保temp目录存在
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

export class DeepSeekPlugin extends plugin {
    constructor() {
        super({
            name: 'DeepSeek AI',
            dsc: 'DeepSeek AI 智能助手',
            event: 'message',
            priority: -500,
            rule: [
                {
                    reg: '^#dp结束对话$',
                    fnc: "endChat"
                },
                {
                    reg: '^#?dp(.*)$',
                    fnc: 'chat'
                },
                {
                    reg: '^#dp帮助$',
                    fnc: "showHelp"
                }
            ]
        });

        this.config = Cfg.getConfig('config');
        this.apiUrl = this.config.deepseek_url || 'https://api.deepseek.com/v1/chat/completions';
        this.defaultModel = 'deepseek-chat';
    }

    async showHelp(e) {
        await e.reply([
            'DeepSeek 使用指南：',
            '1. 基础对话: #dp 你好',
            '2. 多轮对话: 自动保持上下文',
            '3. 结束对话: #dp结束对话',
            '4. 当前模型: ' + (this.config.deepseek_model || this.defaultModel),
            '5. 官方文档: https://platform.deepseek.com/docs'
        ]);
        return true;
    }

    async endChat(e) {
        const filePath = path.join(tempDir, `${e.user_id}_DS.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            await e.reply('✅ DeepSeek 对话历史已清除');
        } else {
            await e.reply('⚠️ 没有找到您的对话记录');
        }
        return true;
    }

    async chat(e) {
        // 1. 准备对话记录
        const sessionFile = path.join(tempDir, `${e.user_id}_DS.json`);
        let messages = this.loadSession(sessionFile);

        // 2. 构建消息
        const userMessage = e.msg.replace(/^#?dp\s*/, '').trim();
        if (!userMessage) {
            await e.reply('请输入要咨询的内容，例如：#dp 你好');
            return true;
        }

        // 3. 调用API
        try {
            const response = await this.callDeepSeekAPI([
                ...messages,
                { role: 'user', content: userMessage }
            ]);

            // 4. 保存上下文
            messages.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response }
            );
            this.saveSession(sessionFile, messages);

            // 5. 回复用户
            await e.reply(response, true);
        } catch (error) {
            await e.reply(`❌ 请求失败: ${error.message}`);
            logger.error('DeepSeek API Error:', error);
        }
        return true;
    }

    loadSession(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
            return [{ role: 'system', content: '你是DeepSeek AI助手，由深度求索公司开发。' }];
        } catch (err) {
            logger.error('加载会话失败:', err);
            return [{ role: 'system', content: '对话初始化失败，已重置上下文。' }];
        }
    }

    saveSession(filePath, messages) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf-8');
        } catch (err) {
            logger.error('保存会话失败:', err);
        }
    }

    async callDeepSeekAPI(messages) {
        const apiKey = this.config.deepseek_sk?.trim();
        if (!apiKey) throw new Error('未配置API密钥，请检查config.yaml');

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.config.deepseek_model || this.defaultModel,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: false
            }),
            timeout: 30000
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '未收到有效回复';
    }
}