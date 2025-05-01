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
      console.error('[活字乱刷] 错误:', err.stack);
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
   * 检查缺失的语音文件
   */
  checkMissingFiles(pinyinArr) {
    const missing = [];
    pinyinArr.forEach(py => {
      const file = path.join(this.voiceDir, `${py}.wav`);
      if (!fs.existsSync(file)) missing.push(py);
    });
    return missing;
  }

  /**
   * 处理缺失文件的情况
   */
  handleMissingFiles(e, missingFiles) {
    return e.reply([
      `缺少以下拼音文件：${missingFiles.join(', ')}`,
      `请将对应的.wav文件放入目录：`,
      segment.file(this.voiceDir)
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
   * 生成最终的音频文件
   */
  async generateAudio(pinyinArr, outputFile) {
    // 清理已存在的文件
    safeUnlink(outputFile);

    // 准备文件列表（包含最后的静音）
    const fileList = pinyinArr.map(py => 
      path.join(this.voiceDir, `${py}.wav`)
    );
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