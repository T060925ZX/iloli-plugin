import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export class TempCleaner extends plugin {
  constructor() {
    super({
      name: '临时文件清理',
      dsc: '清理临时文件夹并生成清理报告',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: '^#?(萝莉|iloli|i)清理缓存$',
          fnc: 'cleanTemp'
        }
      ]
    });

    // 获取插件目录下的 temp 文件夹
    this.tempDir = path.resolve(process.cwd(), 'plugins/iloli-plugin/temp');
    // 需要保留的文件列表
    this.keepFiles = ['config.hash', 'help.hash', 'help.html', 'help.jpeg'];
  }

  async cleanTemp(e) {
      if (!e.isMaster) {
        e.reply('我就喵一下，你懂我意思吧~₍˄·͈༝·͈˄*₎◞ ̑̑');
        return true;
      }

    try {
      if (!fs.existsSync(this.tempDir)) {
        return e.reply('临时文件夹不存在，无需清理');
      }

      await e.reply('正在扫描临时文件，请稍候...');
      const report = await this.cleanFiles(this.tempDir); // 仅清理文件，不删除目录
      const summary = this.generateSummary(report);
      await e.reply(summary);
    } catch (err) {
      console.error('[清理缓存] 错误:', err);
      e.reply([
        '清理过程中发生错误:',
        err.message,
        '\n请检查日志获取详细信息'
      ]);
    }
  }

  /**
   * 仅清理文件，不删除目录
   */
  async cleanFiles(dirPath) {
    let report = {
      filesDeleted: 0,
      spaceFreed: 0,
      failedDeletions: 0
    };

    try {
      const items = await readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // 如果是目录，递归扫描但不删除
          const subReport = await this.cleanFiles(fullPath);
          // 合并子目录的报告
          report.filesDeleted += subReport.filesDeleted;
          report.spaceFreed += subReport.spaceFreed;
          report.failedDeletions += subReport.failedDeletions;
        } else {
          // 检查文件是否需要保留
          if (this.keepFiles.includes(item)) {
            continue; // 跳过保留的文件
          }
          
          // 删除文件
          try {
            await unlink(fullPath);
            report.filesDeleted++;
            report.spaceFreed += stats.size;
          } catch (err) {
            report.failedDeletions++;
            console.error(`无法删除文件 ${fullPath}:`, err);
          }
        }
      }

      return report;
    } catch (err) {
      console.error(`扫描目录 ${dirPath} 时出错:`, err);
      throw err;
    }
  }

  /**
   * 生成清理总结
   */
  generateSummary(report) {
    const spaceFreedMB = (report.spaceFreed / (1024 * 1024)).toFixed(2);
    
    let summary = [
      '====== 缓存清理报告 ======',
      `✅ 已删除文件: ${report.filesDeleted} 个`,
      `💾 释放空间: ${spaceFreedMB} MB`,
      // `📁 保留文件: ${this.keepFiles.join(', ')}`,
      // `📂 所有文件夹结构已保留`,
    ];

    if (report.failedDeletions > 0) {
      summary.push(`❌ 失败操作: ${report.failedDeletions} 个`);
      summary.push('注: 部分文件可能被占用或权限不足');
    }

    summary.push('========================');
    return summary.join('\n');
  }
}