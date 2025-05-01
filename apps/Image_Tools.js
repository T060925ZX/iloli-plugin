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

    // 初始化时创建目录
    this.ensureDirExists(TEMP_DIR);
  }

  /**
   * 确保目录存在
   */
  ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 处理GIF变速请求
   */
  async processGifSpeed(e) {
    try {
      // 1. 获取变速参数
      const speed = this.parseSpeedParam(e);
      if (speed === null) return;

      // 2. 获取引用的GIF消息
      const gifUrl = await this.getReferencedGifUrl(e);
      if (!gifUrl) return;

      // 3. 下载并处理GIF
      const { originalPath, outputPath } = await this.processGif(gifUrl, speed);

      // 4. 发送结果
      await e.reply([segment.image(`file:///${outputPath}`)
      ]);

      // 5. 清理临时文件
      this.scheduleCleanup([originalPath, outputPath]);

    } catch (err) {
      console.error('GIF变速处理失败:', err);
      e.reply(`处理失败: ${err.message}`);
    }
  }

  /**
   * 解析变速参数
   */
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

  /**
   * 获取引用的GIF URL
   */
  async getReferencedGifUrl(e) {
    if (!e.source) {
      e.reply('请引用一条包含GIF的消息');
      return null;
    }

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

  /**
   * 处理GIF文件
   */
  async processGif(gifUrl, speed) {
    const timestamp = Date.now();
    const originalPath = path.join(TEMP_DIR, `${timestamp}.gif`);
    const outputPath = path.join(TEMP_DIR, `${timestamp}_${speed}x.gif`);

    await this.downloadGif(gifUrl, originalPath);
    await this.changeGifSpeed(originalPath, outputPath, speed);

    return { originalPath, outputPath };
  }

  /**
   * 从消息中提取GIF URL
   */
  extractGifUrl(message) {
    try {
      if (Array.isArray(message)) {
        const imageSeg = message.find(m => m.type === 'image');
        return imageSeg?.url;
      } else if (typeof message === 'string') {
        const urlMatch = message.match(/\[CQ:image,file=.+?,url=(.+?)\]/);
        return urlMatch?.[1];
      }
    } catch (e) {
      console.error('提取GIF URL失败:', e);
    }
    return null;
  }

  /**
   * 下载GIF文件
   */
  async downloadGif(url, savePath) {
    const writer = fs.createWriteStream(savePath);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    // 文件大小限制检查
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

  /**
   * 使用FFmpeg改变GIF速度
   */
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

  /**
   * 定时清理临时文件
   */
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