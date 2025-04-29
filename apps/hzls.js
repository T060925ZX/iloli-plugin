import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import pkg from 'chinese-to-pinyin'; 

// 硬编码路径定义
const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const voiceDir = path.join(pluginDir, 'resources', 'voice');
const tempDir = path.join(pluginDir, 'temp', 'hzls');

// 确保temp目录存在
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

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
    try {
      const text = e.msg.replace(/^#活字乱刷/, '').trim();
      if (!text) return e.reply('请输入要转换的内容');

      // 中文转拼音（使用chinese-to-pinyin）
      const pinyinText = pkg(text, { removeTone: true }); // 示例输出: "ni hao"
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
      const safeName = text.replace(/[^\w\u4e00-\u9fa5]/g, '_');
      const outputFile = path.join(tempDir, `${safeName}.mp3`);

      // 生成临时列表文件
      const listContent = fileList.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
      const listFile = path.join(tempDir, `tmp_${Date.now()}.txt`);
      fs.writeFileSync(listFile, listContent);

      // 执行FFmpeg（带超时和重试）
      await this.executeFFmpeg(listFile, outputFile);

      // 发送语音（带文件存在性验证）
      if (fs.existsSync(outputFile)) {
        await e.reply([segment.record(`file://${outputFile}`)]);
      } else {
        throw new Error('输出文件生成失败');
      }
    } catch (err) {
      console.error('活字乱刷错误:', err.stack);
      e.reply([
        '语音合成失败：',
        err.message,
        '\n技术细节已记录，请联系开发者'
      ]);
    }
  }

  async executeFFmpeg(listFile, outputFile, retry = 2) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill(ffmpegProcess.pid, 'SIGKILL');
        reject(new Error('FFmpeg执行超时'));
      }, 30000);

      const ffmpegProcess = exec(
        `ffmpeg -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -q:a 2 "${outputFile}"`,
        async (err) => {
          clearTimeout(timeout);
          fs.unlinkSync(listFile);
          
          if (err && retry > 0) {
            console.log(`FFmpeg失败，剩余重试次数：${retry}`);
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
}