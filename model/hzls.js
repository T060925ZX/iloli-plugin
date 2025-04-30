import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import pkg from 'chinese-to-pinyin';

/**
 * 数字转中文映射表
 */
const NUMBER_TO_CHINESE = {
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

/**
 * 配置常量
 */
const CONFIG = {
  SILENCE_DURATION: '0.5', // 500ms静音时长(秒)
  MAX_FILENAME_LENGTH: 50,
  FFMPEG_RETRIES: 2,
  FFMPEG_AUDIO_QUALITY: '2' // LAME音频质量参数(数值越小质量越好)
};

/**
 * 预处理文本：移除符号 + 数字转中文
 * @param {string} text 原始文本
 * @returns {string} 处理后的文本
 */
export function preprocessText(text) {
  // 移除所有标点符号（保留中文字符和数字）
  let cleaned = text.replace(/[^\u4e00-\u9fa50-9]/g, '');
  
  // 将数字转换为中文
  return cleaned.split('').map(char => 
    NUMBER_TO_CHINESE[char] || char
  ).join('');
}

/**
 * 中文转拼音数组
 * @param {string} text 中文文本
 * @returns {Array} 拼音数组
 */
export function convertToPinyinArray(text) {
  const pinyinText = pkg(text, { removeTone: true });
  return pinyinText.split(' ').filter(Boolean);
}

/**
 * 安全删除文件
 * @param {string} filePath 文件路径
 */
export function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn(`[活字乱刷] 删除文件失败: ${filePath}`, err);
  }
}

/**
 * 转义文件路径中的特殊字符
 * @param {string} filePath 文件路径
 * @returns {string} 转义后的路径
 */
export function escapePath(filePath) {
  return filePath.replace(/'/g, "'\\''");
}

/**
 * 生成静音音频文件
 * @param {string} outputDir 输出目录
 * @returns {string} 静音文件路径
 */
export function generateSilenceFile(outputDir) {
  const silenceFile = path.join(outputDir, 'silence.wav');
  
  if (!fs.existsSync(silenceFile)) {
    exec(`ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t ${CONFIG.SILENCE_DURATION} "${silenceFile}"`);
  }
  
  return silenceFile;
}

/**
 * 验证音频文件是否有效
 * @param {string} filePath 文件路径
 * @returns {Promise<boolean>} 是否有效
 */
export function validateAudio(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.R_OK, (err) => {
      resolve(!err);
    });
  });
}

/**
 * 执行FFmpeg命令
 * @param {string} listFile 文件列表路径
 * @param {string} outputFile 输出文件路径
 * @param {number} retry 剩余重试次数
 * @returns {Promise} 执行结果
 */
export function executeFFmpeg(listFile, outputFile, retry = CONFIG.FFMPEG_RETRIES) {
  return new Promise((resolve, reject) => {
    const ffmpegCmd = [
      'ffmpeg -y',
      '-f concat',
      '-safe 0',
      `-i "${listFile}"`,
      '-c:a libmp3lame',
      `-q:a ${CONFIG.FFMPEG_AUDIO_QUALITY}`,
      `"${outputFile}"`
    ].join(' ');

    const ffmpegProcess = exec(ffmpegCmd, async (err) => {
      safeUnlink(listFile);
      
      if (err && retry > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return executeFFmpeg(listFile, outputFile, retry - 1)
          .then(resolve)
          .catch(reject);
      }
      
      err ? reject(err) : resolve();
    });
  });
}