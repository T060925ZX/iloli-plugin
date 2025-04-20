import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import Cfg from "../model/Cfg.js";

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const tempDir = path.join(pluginDir, 'temp', 'AI');

// 确保 temp 目录存在
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export class OptimizedKimiPlugin extends plugin {
  constructor() {
    super({
      name: "Kimi AI",
      dsc: "Kimi 智能助手",
      event: "message",
      priority: -500,
      rule: [
        {
          reg: "^#kimi结束对话$",
          fnc: "endChat"
        },
        {
          reg: "^#?kimi(.*)$",
          fnc: "chat"
        },
        {
          reg: "^#kimi帮助$",
          fnc: "showHelp"
        },
        {
          reg: "^#kimi重置$",
          fnc: "resetChat"
        }
      ]
    });

    this.config = Cfg.getConfig('config');
    this.apiUrl = this.config.moonshot_url || "https://api.moonshot.cn/v1/chat/completions";
    this.maxContextLength = 10; // 最大上下文消息数
  }

  async showHelp(e) {
    await e.reply([
      "🌟 Kimi AI Pro 使用指南 🌟",
      "1. 开始对话: #kimi 你好",
      "2. 多轮对话: 自动保持上下文",
      "3. 结束对话: #kimi结束对话",
      "4. 重置对话: #kimi重置",
      "5. 当前模型: " + (this.config.moonshot_model || "moonshot-v1-8k"),
      "6. 官方文档: https://platform.moonshot.cn/docs"
    ]);
    return true;
  }

  async endChat(e) {
    const filePath = path.join(tempDir, `${e.user_id}_Kimi.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      await e.reply("✅ Kimi 对话历史已清除");
    } else {
      await e.reply("⚠️ 没有找到您的对话记录");
    }
    return true;
  }

  async resetChat(e) {
    const filePath = path.join(tempDir, `${e.user_id}_Kimi.json`);
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        JSON.stringify([{
          role: "system",
          content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手。"
        }]),
        "utf-8"
      );
      await e.reply("🔄 对话已重置，上下文保留初始状态");
    } else {
      await e.reply("⚠️ 没有找到您的对话记录");
    }
    return true;
  }

  async chat(e) {
    // 1. 准备对话记录
    const sessionFile = path.join(tempDir, `${e.user_id}_Kimi.json`);
    let messages = this.loadSession(sessionFile);

    // 2. 处理用户输入
    const userMessage = e.msg.replace(/^#?kimi\s*/, "").trim();
    if (!userMessage) {
      await e.reply("请输入要咨询的内容，例如：#kimi 你好");
      return true;
    }

    // 3. 添加上下文（限制最大长度）
    messages.push({ role: "user", content: userMessage });
    if (messages.length > this.maxContextLength * 2 + 1) {
      messages = [
        messages[0], // 保留系统消息
        ...messages.slice(-this.maxContextLength * 2) // 保留最近的对话
      ];
    }

    // 4. 调用API
    try {
      const response = await this.callKimiAPI(messages);
      
      // 5. 保存上下文
      messages.push({ role: "assistant", content: response });
      this.saveSession(sessionFile, messages);

      // 6. 回复用户
      await e.reply(response, true);
    } catch (error) {
      await e.reply(`❌ 请求失败: ${error.message}`);
      logger.error("Kimi API Error:", error);
    }
    return true;
  }

  loadSession(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const messages = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // 确保总是包含系统消息
        if (messages[0]?.role !== "system") {
          return [{
            role: "system",
            content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手。"
          }, ...messages];
        }
        return messages;
      }
      return [{
        role: "system",
        content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手。"
      }];
    } catch (err) {
      logger.error("加载会话失败:", err);
      return [{
        role: "system",
        content: "对话初始化失败，已重置上下文。"
      }];
    }
  }

  saveSession(filePath, messages) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), "utf-8");
    } catch (err) {
      logger.error("保存会话失败:", err);
    }
  }

  async callKimiAPI(messages) {
    const apiKey = this.config.moonshot_sk?.trim();
    if (!apiKey) throw new Error("未配置API密钥，请检查config.yaml");

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.config.moonshot_model || "moonshot-v1-8k",
        messages: messages,
        temperature: 0.3,
        max_tokens: 2048,
        stream: false
      }),
      timeout: 30000
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "未收到有效回复";
  }
}