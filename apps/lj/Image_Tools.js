import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { exec } from 'child_process';

const PLUGIN_DIR = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const TEMP_DIR = path.join(PLUGIN_DIR, 'temp/gif_speed'); 
const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const CLEANUP_DELAY = 30000; 

export class GifSpeedControl extends plugin {
  constructor() {
    super({
      name: 'GIF变速控制',
      dsc: '下载并调整GIF播放速度',
      event: 'message',
      priority: 10,
      rule: [
        {
          reg: '^#gif变速(\\d+\\.?\\d*)x$',
          fnc: 'processGifSpeed'
        }
      ]
    });

    this.ensureDirExists(TEMP_DIR);
  }

  ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async processGifSpeed(e) {
    try {
      const speed = this.parseSpeedParam(e);
      if (speed === null) return;

      // 如果有引用消息
      if (e.source) {
        const gifUrl = await this.getReferencedGifUrl(e);
        if (!gifUrl) return;
        await this.processAndSendGif(gifUrl, speed, e);
      } 
      // 没有引用则设置上下文
      else {
        this.setContext('waitForGif');
        e.reply('请直接发送要处理的GIF图片', false, { at: true });
      }
    } catch (err) {
      console.error('GIF变速处理失败:', err);
      e.reply(`处理失败: ${err.message}`);
    }
  }

  /**
   * 上下文处理 - 等待用户发送GIF
   */
  async waitForGif(e) {
    try {
      const gifUrl = this.extractGifUrl(e.message);
      if (!gifUrl) {
        return e.reply('未检测到GIF图片，请重新发送或取消操作');
      }

      const speedMatch = e.msg.match(/^#gif变速(\d+\.?\d*)x$/);
      const speed = speedMatch ? parseFloat(speedMatch[1]) : 1.0; // 默认1倍速
      
      await this.processAndSendGif(gifUrl, speed, e);
      this.finish('waitForGif');
    } catch (err) {
      console.error('上下文处理失败:', err);
      e.reply(`处理失败: ${err.message}`);
      this.finish('waitForGif');
    }
  }

  /**
   * 处理并发送GIF
   */
  async processAndSendGif(gifUrl, speed, e) {
    const { originalPath, outputPath } = await this.processGif(gifUrl, speed);
    await e.reply([segment.image(`file:///${outputPath}`)]);
    this.scheduleCleanup([originalPath, outputPath]);
  }

  parseSpeedParam(e) {
    const speedMatch = e.msg.match(/^#gif变速(\d+\.?\d*)x$/);
    if (!speedMatch) return null;
    
    const speed = parseFloat(speedMatch[1]);
    if (speed <= 0.1 || speed > 10) {
      e.reply('变速参数必须在0.1-10之间');
      return null;
    }
    return speed;
  }

  async getReferencedGifUrl(e) {
    const chatHistory = await e.group.getChatHistory(e.source.seq, 1);
    const referencedMsg = chatHistory[0];
    
    if (!referencedMsg?.message) {
      e.reply('未找到引用的消息');
      return null;
    }

    const gifUrl = this.extractGifUrl(referencedMsg.message);
    if (!gifUrl) {
      e.reply('引用的消息中没有找到GIF');
    }
    return gifUrl;
  }

  async processGif(gifUrl, speed) {
    const timestamp = Date.now();
    const originalPath = path.join(TEMP_DIR, `${timestamp}.gif`);
    const outputPath = path.join(TEMP_DIR, `${timestamp}_${speed}x.gif`);

    await this.downloadGif(gifUrl, originalPath);
    await this.changeGifSpeed(originalPath, outputPath, speed);

    return { originalPath, outputPath };
  }

  extractGifUrl(message) {
    try {
      // 处理数组消息
      if (Array.isArray(message)) {
        const imageSeg = message.find(m => m.type === 'image');
        if (imageSeg) {
          // 检查是否为GIF（根据URL或文件扩展名）
          if (imageSeg.url?.endsWith('.gif') || imageSeg.file?.endsWith('.gif')) {
            return imageSeg.url || imageSeg.file;
          }
        }
      } 
      // 处理字符串消息
      else if (typeof message === 'string') {
        const urlMatch = message.match(/\[CQ:image,file=(.+?\.gif).+?url=(.+?)\]/);
        if (urlMatch) return urlMatch[2];
        
        const fileMatch = message.match(/\[CQ:image,file=(.+?\.gif)/);
        if (fileMatch) return fileMatch[1];
      }
    } catch (e) {
      console.error('提取GIF URL失败:', e);
    }
    return null;
  }

  async downloadGif(url, savePath) {
    const writer = fs.createWriteStream(savePath);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    let downloaded = 0;
    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      if (downloaded > MAX_FILE_SIZE) {
        writer.close();
        throw new Error('文件大小超过10MB限制');
      }
    });

    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  changeGifSpeed(inputPath, outputPath, speed) {
    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -i "${inputPath}" -vf "setpts=${1/speed}*PTS" -y "${outputPath}"`;
      
      exec(cmd, (error) => {
        if (error) {
          console.error('FFmpeg执行错误:', cmd, error);
          reject(new Error('GIF变速处理失败'));
        } else {
          resolve();
        }
      });
    });
  }

  scheduleCleanup(filePaths) {
    setTimeout(() => {
      filePaths.forEach(file => {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch (e) {
          console.error('清理文件失败:', file, e);
        }
      });
    }, CLEANUP_DELAY);
  }
}