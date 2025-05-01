import path from 'path';
import fs from 'fs';
import { 
  preprocessText,
  convertToPinyinArray,
  safeUnlink,
  escapePath,
  generateSilenceFile,
  validateAudio,
  executeFFmpeg
} from '../model/hzls.js';

// 插件路径配置
const PLUGIN_DIR = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const VOICE_DIR = path.join(PLUGIN_DIR, 'resources', 'voice');
const TEMP_DIR = path.join(PLUGIN_DIR, 'temp', 'hzls');

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
    
    this.voiceDir = VOICE_DIR;
    this.tempDir = TEMP_DIR;
    this.initDirs();
  }

  /**
   * 初始化所需目录
   */
  initDirs() {
    [this.voiceDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 生成语音主处理函数
   */
  async generateVoice(e) {
    const lockFile = path.join(this.tempDir, 'generate.lock');
    let lockFileHandle = null;
    
    try {
      // 创建文件锁防止并发冲突
      lockFileHandle = await fs.promises.open(lockFile, 'wx');
      
      // 提取并预处理文本
      const text = e.msg.replace(/^#活字乱刷/, '').trim();
      if (!text) return e.reply('请输入要转换的内容');
      const processedText = preprocessText(text);

      // 转换为拼音并检查文件
      const pinyinArr = convertToPinyinArray(processedText);
      const missingFiles = this.checkMissingFiles(pinyinArr);
      
      if (missingFiles.length > 0) {
        return this.handleMissingFiles(e, missingFiles);
      }

      // 生成语音文件
      const outputFile = this.generateOutputPath(processedText);
      await this.generateAudio(pinyinArr, outputFile);

      // 验证并发送语音
      if (await validateAudio(outputFile)) {
        await e.reply([segment.record(`file://${outputFile}`)]);
      } else {
        throw new Error('生成的音频文件无效');
      }
    } catch (err) {
      logger.error('[活字乱刷] 错误:', err.stack);
      e.reply([
        '语音合成失败：',
        err.message,
        '\n技术细节已记录，请联系开发者'
      ]);
    } finally {
      // 释放文件锁
      if (lockFileHandle) {
        await lockFileHandle.close();
        safeUnlink(lockFile);
      }
    }
  }

  /**
   * 检查缺失的语音文件，并尝试拆分拼音
   */
  checkMissingFiles(pinyinArr) {
    const missing = [];
    pinyinArr.forEach(py => {
      const file = path.join(this.voiceDir, `${py}.wav`);
      if (!fs.existsSync(file)) {
        // 尝试拆分拼音
        const splitSuccess = this.canSplitPinyin(py);
        if (!splitSuccess) {
          missing.push(py);
        }
      }
    });
    return missing;
  }

  /**
   * 检查是否可以拆分拼音
   */
  canSplitPinyin(pinyin) {
    const splitFiles = this.getSplitPinyinFiles(pinyin);
    return splitFiles.length > 0;
  }

  /**
   * 获取拆分后的拼音文件列表
   */
  getSplitPinyinFiles(pinyin) {
    // 常见声母列表
    const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 
                    'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'];
    
    // 尝试不同的拆分方式
    const possibleSplits = [];
    
    // 1. 尝试常见声母+韵母组合
    for (const initial of initials) {
      if (pinyin.startsWith(initial)) {
        const remaining = pinyin.slice(initial.length);
        if (remaining) {
          possibleSplits.push([initial, remaining]);
        }
      }
    }
    
    // 2. 尝试两拼音节拆分（如 x-iao）
    if (pinyin.length > 2) {
      possibleSplits.push([
        pinyin.substring(0, 1),
        pinyin.substring(1)
      ]);
    }
    
    // 3. 尝试三拼音节拆分（如 q-i-ang）
    if (pinyin.length > 3) {
      possibleSplits.push([
        pinyin.substring(0, 1),
        pinyin.substring(1, 2),
        pinyin.substring(2)
      ]);
    }

    // 检查哪些拆分组合的文件都存在
    for (const split of possibleSplits) {
      const files = split.map(part => 
        path.join(this.voiceDir, `${part}.wav`)
      );
      
      if (files.every(f => fs.existsSync(f))) {
        return files;
      }
    }
    
    return [];
  }

  /**
   * 处理缺失文件的情况
   */
  handleMissingFiles(e, missingFiles) {
    return e.reply([
      `缺少以下拼音文件：${missingFiles.join(', ')}`,
      `请将对应的.wav文件放入目录：`,
      segment.file(this.voiceDir),
      `\n或者提供拆分后的部分（如 nuo 需要 nu.wav 和 o.wav）`
    ]);
  }

  /**
   * 生成输出文件路径
   */
  generateOutputPath(text) {
    const safeName = text
      .replace(/[^\w\u4e00-\u9fa5]/g, '_')
      .slice(0, 50);
    return path.join(this.tempDir, `${safeName}.mp3`);
  }

  /**
   * 生成最终的音频文件（支持拆分拼音）
   */
  async generateAudio(pinyinArr, outputFile) {
    // 清理已存在的文件
    safeUnlink(outputFile);

    // 准备文件列表
    const fileList = [];
    for (const py of pinyinArr) {
      const fullFile = path.join(this.voiceDir, `${py}.wav`);
      if (fs.existsSync(fullFile)) {
        fileList.push(fullFile);
      } else {
        // 尝试拆分拼音
        const splitFiles = this.getSplitPinyinFiles(py);
        if (splitFiles.length > 0) {
          fileList.push(...splitFiles);
        } else {
          throw new Error(`无法找到拼音文件: ${py}.wav`);
        }
      }
    }

    // 添加结尾静音
    const silenceFile = generateSilenceFile(this.tempDir);
    
    // 创建临时列表文件
    const listContent = [
      ...fileList.map(f => `file '${escapePath(f)}'`),
      `file '${escapePath(silenceFile)}'`
    ].join('\n');
    
    const listFile = path.join(this.tempDir, `list_${Date.now()}.txt`);
    safeUnlink(listFile);
    fs.writeFileSync(listFile, listContent);

    // 执行FFmpeg合并
    await executeFFmpeg(listFile, outputFile);
  }
}