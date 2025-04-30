import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import pkg from 'chinese-to-pinyin';

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const voiceDir = path.join(pluginDir, 'resources', 'voice');
const tempDir = path.join(pluginDir, 'temp', 'hzls');

// 数字转中文映射
const numberToChinese = {
  '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
  '5': '五', '6': '六', '7': '七', '8': '八', '9': '九'
};

// 标点停顿映射（单位：秒）
const punctuationPause = {
  ',': 0.3, '，': 0.3, '、': 0.3,  // 短停顿
  '.': 0.8, '。': 0.8, '!': 0.8, '！': 0.8, '?': 0.8, '？': 0.8  // 长停顿
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
      lockFileHandle = await fs.promises.open(lockFile, 'wx');
      let text = e.msg.replace(/^#活字乱刷/, '').trim();
      if (!text) return e.reply('请输入要转换的内容');

      // 文本预处理（保留标点用于停顿）
      const { cleanedText, pauses } = this.preprocessText(text);
      const pinyinArr = pkg(cleanedText, { removeTone: true })
        .split(' ')
        .filter(Boolean);

      // 检查音频文件
      const [fileList, missing] = this.checkVoiceFiles(pinyinArr);
      if (missing.length > 0) return this.handleMissingFiles(e, missing);

      // 生成输出文件
      const outputFile = this.prepareOutputFile(cleanedText);
      await this.processAudio(fileList, pauses, outputFile);
      
      await e.reply([segment.record(`file://${outputFile}`)]);
    } catch (err) {
      logger.error('活字乱刷错误:', err.stack);
      e.reply(this.buildErrorMessage(err));
    } finally {
      await this.cleanup(lockFileHandle, lockFile);
    }
  }

  // 改进的文本预处理
  preprocessText(text) {
    const pauses = [];
    let lastWasChinese = false;
    let cleaned = '';

    // 遍历每个字符
    for (const char of text) {
      if (numberToChinese[char]) {
        // 数字转中文
        cleaned += numberToChinese[char];
        lastWasChinese = true;
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        // 中文字符
        cleaned += char;
        lastWasChinese = true;
      } else if (punctuationPause[char] && lastWasChinese) {
        // 有效标点（前一个字符是中文时才处理）
        pauses.push({
          index: cleaned.length - 1, // 在前一个字符后插入停顿
          duration: punctuationPause[char]
        });
        lastWasChinese = false;
      }
      // 其他字符忽略
    }

    return { cleanedText: cleaned, pauses };
  }

  checkVoiceFiles(pinyinArr) {
    const missing = [];
    const fileList = pinyinArr.map(py => {
      const file = path.join(voiceDir, `${py}.wav`);
      if (!fs.existsSync(file)) missing.push(py);
      return file;
    });
    return [fileList, missing];
  }

  handleMissingFiles(e, missing) {
    return e.reply([
      `缺少以下拼音文件：${missing.join(', ')}`,
      `请检查目录：${voiceDir}`,
      segment.file(voiceDir)
    ]);
  }

  prepareOutputFile(text) {
    const safeName = text.replace(/[^\w\u4e00-\u9fa5]/g, '_').slice(0, 50);
    const outputFile = path.join(tempDir, `${safeName}.mp3`);
    this.safeUnlink(outputFile);
    return outputFile;
  }

  async processAudio(fileList, pauses, outputFile) {
    const listFile = path.join(tempDir, `list_${Date.now()}.txt`);
    try {
      // 生成带时间标记的文件列表
      fs.writeFileSync(listFile, this.buildFileList(fileList, pauses));
      await this.executeFFmpeg(listFile, outputFile);
      if (!await this.validateAudio(outputFile)) {
        throw new Error('生成的音频文件无效');
      }
    } finally {
      this.safeUnlink(listFile);
    }
  }

  // 构建带停顿时间的文件列表
  buildFileList(fileList, pauses) {
    const pauseMap = new Map();
    pauses.forEach(p => {
      pauseMap.set(p.index, p.duration);
    });

    return fileList.map((file, index) => {
      const duration = pauseMap.get(index) || 0;
      return `file '${this.escapePath(file)}'\nduration ${duration}`;
    }).join('\n');
  }

  async executeFFmpeg(listFile, outputFile, retry = 2) {
    return new Promise((resolve, reject) => {
      // 关键优化：精确控制每个片段时长
      const cmd = [
        'ffmpeg -y',
        '-f concat -safe 0',
        `-i "${listFile}"`,
        '-filter_complex',
        '"',
        'aresample=async=1000',  // 智能重采样
        ',apad=pad_dur=0.5',     // 结尾静音
        '[out]"',
        '-map "[out]"',
        '-c:a libmp3lame -q:a 2',
        `"${outputFile}"`
      ].join(' ');

      const ffmpegProcess = exec(cmd, (err) => {
        if (err && retry > 0) {
          setTimeout(() => this.executeFFmpeg(listFile, outputFile, retry - 1)
            .then(resolve)
            .catch(reject), 1000);
          return;
        }
        err ? reject(err) : resolve();
      });
    });
  }

  safeUnlink(file) {
    try { fs.existsSync(file) && fs.unlinkSync(file); } 
    catch (err) { console.warn(`删除失败: ${file}`, err); }
  }

  escapePath(p) {
    return p.replace(/'/g, "'\\''");
  }

  async validateAudio(file) {
    return fs.promises.access(file, fs.constants.R_OK)
      .then(() => true)
      .catch(() => false);
  }

  buildErrorMessage(err) {
    return [
      '语音合成失败：',
      err.message.includes('ENOENT') ? '缺少必要的音频文件' : err.message,
      '\n请稍后再试或联系开发者'
    ];
  }

  async cleanup(handle, lockFile) {
    try {
      handle && await handle.close();
      this.safeUnlink(lockFile);
    } catch (err) {
      console.error('清理失败:', err);
    }
  }
}