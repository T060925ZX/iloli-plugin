import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import Cfg from '../model/Cfg.js';

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const tempDir = path.join(pluginDir, 'temp', 'AI');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

export class TongyiQianwenPlugin extends plugin {
    constructor() {
        super({
            name: '通义千问AI',
            dsc: '通义千问大语言模型插件',
            event: 'message',
            priority: -500,
            rule: [
                {
                    reg: '^#qwen结束对话$',
                    fnc: "endChat"
                },
                {
                    reg: '^#?qwen(.*)$',
                    fnc: 'chat'
                },
                {
                    reg: '^#qwen帮助$',
                    fnc: "showHelp"
                }
            ]
        });

        this.config = Cfg.getConfig('config');
        this.validateConfig();
    }

    validateConfig() {
        if (!this.config.qwen_api_key) {
            logger.error('通义千问API密钥未配置！请在config.yaml中添加qwen_api_key');
        }
    }

    async showHelp(e) {
        const helpMessage = [
            '🌟 通义千问AI使用帮助 🌟',
            '——————————————',
            '1. 基础对话: #qwen [问题]',
            '  例: #qwen 解释下量子计算',
            '2. 多轮对话: 自动保持上下文',
            '3. 结束会话: #qwen结束对话',
            '——————————————',
            '当前配置:',
            `• 模型: ${this.config.qwen_model || 'qwen-max'}`,
            `• 联网搜索: ${this.config.qwen_enable_search ? '开启' : '关闭'}`,
            '——————————————',
            '高级功能:',
            '• 自动记忆最近10轮对话',
            '• 支持代码/学术/生活问答',
            '• 超时自动重试机制'
        ];

        await e.reply(helpMessage.join('\n'));
        return true;
    }

    async endChat(e) {
        const sessionFile = path.join(tempDir, `${e.user_id}_QWEN.json`);
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
            await e.reply("✅ 对话历史已清除");
        } else {
            await e.reply("⚠️ 没有找到对话记录");
        }
        return true;
    }

    async chat(e) {
        if (!this.config.qwen_api_key) {
            await e.reply([
                '❌ 服务未配置完整',
                '请管理员检查配置:',
                '1. 确认config.yaml已配置qwen_api_key',
                '2. 重新加载插件'
            ]);
            return true;
        }

        const sessionFile = path.join(tempDir, `${e.user_id}_QWEN.json`);
        let messages = this.loadSession(sessionFile);

        const userMessage = e.msg.replace(/^#?qwen\s*/, "").trim();
        if (!userMessage) {
            await this.showHelp(e);
            return true;
        }

        messages.push({ role: "user", content: userMessage });

        try {
            const response = await this.callQwenAPI(messages);
            messages.push({ role: "assistant", content: response });
            this.saveSession(sessionFile, messages);
            
            await e.reply(response, true); // 自动分片发送长消息
        } catch (error) {
            await e.reply([
                '❌ 请求失败',
                `错误信息: ${error.message}`,
                '——————————————',
                '解决方案:',
                '1. 检查网络连接',
                '2. 稍后重试',
                '3. 联系管理员'
            ]);
            logger.error("API调用错误:", error);
        }
        return true;
    }

    async callQwenAPI(messages, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000;

        try {
            const response = await fetch(this.config.qwen_base_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.qwen_api_key}`
                },
                body: JSON.stringify({
                    model: this.config.qwen_model || "qwen-max",
                    input: { messages },
                    parameters: {
                        enable_search: this.config.qwen_enable_search || false,
                        temperature: 0.8,
                        top_p: 0.8,
                        max_tokens: 2000
                    }
                }),
                timeout: 30000
            });

            if (!response.ok) {
                const error = await response.json();
                if (retryCount < maxRetries && response.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.callQwenAPI(messages, retryCount + 1);
                }
                throw new Error(error.message || `API错误[${response.status}]`);
            }

            const data = await response.json();
            return data.output.text || "未收到有效回复";

        } catch (error) {
            if (retryCount < maxRetries && error.name !== "AbortError") {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.callQwenAPI(messages, retryCount + 1);
            }
            throw error;
        }
    }

    loadSession(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const messages = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                // 确保系统消息存在
                if (messages[0]?.role !== "system") {
                    return [{
                        role: "system",
                        content: "你是通义千问AI助手，回答应专业、准确且简洁。"
                    }, ...messages];
                }
                return messages;
            }
            return [{
                role: "system", 
                content: "你是通义千问AI助手，回答应专业、准确且简洁。"
            }];
        } catch (err) {
            logger.error("加载会话失败:", err);
            return [{
                role: "system",
                content: "对话初始化失败，已重置上下文。请重新提问。"
            }];
        }
    }

    saveSession(filePath, messages) {
        try {
            // 保留系统消息 + 最近10轮对话
            if (messages.length > 21) {
                messages = [messages[0], ...messages.slice(-20)];
            }
            fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), "utf-8");
        } catch (err) {
            logger.error("保存会话失败:", err);
        }
    }
}