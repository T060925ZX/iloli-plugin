import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import pkg from 'chinese-to-pinyin';

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const voiceDir = path.join(pluginDir, 'resources', 'voice');
const tempDir = path.join(pluginDir, 'temp', 'hzls');

// 确保temp目录存在
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// 数字转中文映射
const numberToChinese = {
  '0': '零',
  '1': '一',
  '2': '二',
  '3': '三',
  '4': '四',
  '5': '五',
  '6': '六',
  '7': '七',
  '8': '八',
  '9': '九'
};

export class HuoZiLuanShua extends plugin {
  constructor() {
    super({
      name: '活字乱刷',
      dsc: '将文字转换为拼音并合成语音',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: /^#活字乱刷(.+)/,
          fnc: 'generateVoice'
        }
      ]
    });
    this.initDirs();
  }

  initDirs() {
    [voiceDir, tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async generateVoice(e) {
    const lockFile = path.join(tempDir, 'generate.lock');
    let lockFileHandle = null;
    
    try {
      // 创建文件锁防止并发冲突
      lockFileHandle = await fs.promises.open(lockFile, 'wx');
      
      let text = e.msg.replace(/^#活字乱刷/, '').trim();
      if (!text) return e.reply('请输入要转换的内容');

      // 预处理文本：移除符号 + 数字转中文
      text = this.preprocessText(text);

      // 中文转拼音
      const pinyinText = pkg(text, { removeTone: true });
      const pinyinArr = pinyinText.split(' ').filter(Boolean);

      // 检查音频文件
      const missing = [];
      const fileList = pinyinArr.map(py => {
        const file = path.join(voiceDir, `${py}.wav`);
        if (!fs.existsSync(file)) missing.push(py);
        return file;
      });

      if (missing.length > 0) {
        return e.reply([
          `缺少以下拼音文件：${missing.join(', ')}`,
          `请将对应的.wav文件放入目录：`,
          segment.file(voiceDir)
        ]);
      }

      // 生成输出路径
      const safeName = text.replace(/[^\w\u4e00-\u9fa5]/g, '_').slice(0, 50);
      const outputFile = path.join(tempDir, `${safeName}.mp3`);
      
      // 强制覆盖已存在的文件
      this.safeUnlink(outputFile);

      // 生成临时列表文件
      const listContent = fileList.map(f => `file '${this.escapePath(f)}'`).join('\n');
      const listFile = path.join(tempDir, `list_${Date.now()}.txt`);
      this.safeUnlink(listFile);
      fs.writeFileSync(listFile, listContent);

      // 执行FFmpeg
      await this.executeFFmpeg(listFile, outputFile);

      // 验证并发送语音
      if (await this.validateAudio(outputFile)) {
        await e.reply([segment.record(`file://${outputFile}`)]);
      } else {
        throw new Error('生成的音频文件无效');
      }
    } catch (err) {
      console.error('活字乱刷错误:', err.stack);
      e.reply([
        '语音合成失败：',
        err.message,
        '\n技术细节已记录，请联系开发者'
      ]);
    } finally {
      // 释放文件锁
      if (lockFileHandle) {
        await lockFileHandle.close();
        this.safeUnlink(lockFile);
      }
    }
  }

  // 文本预处理：移除符号 + 数字转中文
  preprocessText(text) {
    // 移除所有标点符号（保留中文字符和数字）
    let cleaned = text.replace(/[^\u4e00-\u9fa50-9]/g, '');
    
    // 将数字转换为中文
    return cleaned.split('').map(char => 
      numberToChinese[char] || char
    ).join('');
  }

  async executeFFmpeg(listFile, outputFile, retry = 2) {
    return new Promise((resolve, reject) => {
      const ffmpegProcess = exec(
        `ffmpeg -y -f concat -safe 0 -i "${listFile}" ` +
        `-c:a libmp3lame -q:a 2 "${outputFile}"`,
        async (err) => {
          this.safeUnlink(listFile);
          if (err && retry > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return this.executeFFmpeg(listFile, outputFile, retry - 1)
              .then(resolve)
              .catch(reject);
          }
          err ? reject(err) : resolve();
        }
      );
    });
  }

  safeUnlink(file) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
      console.warn(`删除文件失败: ${file}`, err);
    }
  }

  escapePath(p) {
    return p.replace(/'/g, "'\\''");
  }

  async validateAudio(file) {
    return new Promise((resolve) => {
      fs.access(file, fs.constants.R_OK, (err) => {
        resolve(!err);
      });
    });
  }
}