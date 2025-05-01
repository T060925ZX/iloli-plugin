import { createHash } from 'crypto';
import puppeteer from 'puppeteer';
import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';
import Cfg from '../model/Cfg.js';
const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const tempDir = path.join(pluginDir, 'temp');
const iconPath = path.join(pluginDir, 'resources', 'icon');
const configPath = path.join(pluginDir, 'config', 'help_config.yaml');
const yamlPath = path.join(pluginDir, 'config', 'default_config', 'help.yaml');
import Button from '../model/Buttons.js';
import { takeScreenshot } from '../model/takescreenshot.js';
// 封装重新加载配置的函数
const reloadConfig = () => {
  try {
    // 使用配置
    const H1 = Cfg.getConfig('config').main_title || 'iloli-plugin';
    const H2 = Cfg.getConfig('config').sub_title || '帮助详情';
    const columns = Cfg.getConfig('config').columns || 3;
    const deviceScaleFactor = Cfg.getConfig('config').deviceScaleFactor || 1;
    const yiyan = Cfg.getConfig('config').default_hitokoto || '种自己的花，爱自己的宇宙';
    const bg = Cfg.getConfig('config').background_image_url || 'https://gitee.com/T060925ZX/iloli-plugin/raw/main/resources/image/nh.webp';

    // 单独返回每一项数据
    return {
      H1,
      H2,
      columns,
      deviceScaleFactor,
      yiyan,
      bg
    };
  } catch (err) {
    console.error('加载配置文件时出错:', err);
    return null;
  }
};

// 调用封装的函数来重新加载配置
const { H1, H2, columns, deviceScaleFactor, yiyan, bg } = reloadConfig() || {};

// 自动计算列数，页面尺寸
const C = parseFloat((100 / columns).toFixed(2)); 
const P = (columns * 200 + 188).toFixed(2); 

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 读取 help.yaml 文件并解析为 JavaScript 对象
const helpData = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

// 生成 HTML 内容
const generateHTML = () => {
  let items = '';

  // 生成卡片内容
  helpData.forEach(group => {
    items += `
      <div class="data_box">
        <div class="tab_lable">${group.group}</div>
        <div class="list">
    `;

    group.list.forEach(item => {
      // 动态生成图标路径
      const iconSrc = `file://${path.join(iconPath, item.icon)}.png`;
      items += `
        <div class="item">
          <img class="icon" src="${iconSrc}" />
          <div class="title">
            <div class="text">${item.title}</div>
            <div class="dec">${item.desc}</div>
          </div>
        </div>
      `;
    });

    items += `
        </div>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="content-type" content="text/html;charset=utf-8" />
      <style>
        /* 隐藏滚动条 */
        body {
          overflow: -moz-scrollbars-none;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        body::-webkit-scrollbar {
          display: none;
        }

        ::-webkit-scrollbar {
          width: 0px;
          height: 5px;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          user-select: none;
        }

        body {
          padding: 20px 20px 20px 20px;
          font-family: "OPSans";
          font-size: 16px;
          color: #1e1f20;
          transform: scale(1.5);
          transform-origin: 0 0;
          width: ${P}px;
          background-image: url('${bg}');
        }

        .container {
          width: ${P}px;
          padding: 15px 15px 5px 15px;
        }
   
       bq {
          margin: 0 auto; 
          text-align: center;
          color: #d2d2d2;
          font-size: 12px; 
          font-weight: bold;
          display: block; 
          width: fit-content; 
        }

        .head_box {
          border-radius: 15px;
          font-family: HYWenHei;
          padding: 20px 15px;
          position: relative;
          box-shadow: 0 5px 10px 0 rgb(0 0 0 / 15%);
          background: rgba(169, 169, 169, 0.1);
          backdrop-filter: blur(10px);
        }

        .head_box .id_text {
          margin-left: 20px;
          font-size: 24px;
        }

        .head_box .day_text {
          margin-left: 20px;
          font-size: 20px;
        }

        .data_box {
          padding-left: 20px;
          border-radius: 15px;
          margin-top: 20px;
          margin-bottom: 15px;
          padding: 20px 0px 5px 0px;
          background: rgba(169, 169, 169, 0.1);
          box-shadow: 0 5px 10px 0 rgb(0 0 0 / 15%);
          position: relative;
          backdrop-filter: blur(10px);
        }

        .tab_lable {
          position: absolute;
          top: -10px;
          left: -8px;
          background: #d4b98c;
          color: #fff;
          font-size: 14px;
          padding: 3px 10px;
          border-radius: 15px 0px 15px 15px;
          z-index: 20;
        }

        .list {
          padding-left: 20px;
          padding-right: 0px;
          display: flex;
          justify-content: flex-start;
          flex-wrap: wrap;
          gap: 5px;
        }

        .list .item {
          width: calc(${C}% - 10px);
          display: flex;
          align-items: center;
          background: #f1f1f1; 
          padding: 8px 6px 8px 6px;
          border-radius: 8px;
          margin: 10px 0px 10px 0px;
        }

        .list .item .icon {
          width: 35px;
          height: 35px;
          background-repeat: no-repeat;
          background-size: 100% 100%;
          position: relative;
          flex-shrink: 0;
          margin-left: 10px;
          margin-right: 5px;
        }

        .list .item .title {
          font-size: 16px;
          margin-left: 6px;
          line-height: 20px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .list .item .title .dec {
          font-size: 12px;
          color: #999;
          margin-top: 2px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .logo {
          font-size: 14px;
          font-family: "HYWenHei";
          text-align: center;
          color: #fff;
          background: rgba(169, 169, 169, 0.3);
          backdrop-filter: blur(10px);
          padding: 10px;
          border-radius: 8px;
          font-weight: bold;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/bluebird@3/js/browser/bluebird.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@2.0.3/fetch.min.js"></script>
      <script>
        fetch('https://v1.hitokoto.cn')
          .then(function(res) {
            return res.json();
          })
          .then(function(data) {
            var hitokoto = data.hitokoto;
            document.getElementById('hitokoto').innerText = hitokoto;
          })
          .catch(function(err) {
            console.error(err);
            var hitokoto = ${yiyan};
            document.getElementById('hitokoto').innerText = ${yiyan};

          });
      </script>
    </head>
    <body>
      <div class="container" id="container">
        <div class="head_box">
          <div class="id_text">${H1}</div>
          <h2 class="day_text">${H2}</h2>
        </div>
        ${items}
        <div id="hitokoto" class="logo">${yiyan}</div>
      </div>
        <bq>Yunzai & iloli-plugin</bq>
    </body>
    </html>
  `;
};

// 预渲染帮助页面
const preRenderHelp = async () => {
  // 生成 HTML 内容
  const htmlContent = generateHTML();
  const htmlPath = path.join(tempDir, 'help.html');
  fs.writeFileSync(htmlPath, htmlContent);

  // 使用外部 takeScreenshot 方法渲染页面并截图
  const htmlUrl = `file://${htmlPath}`;
  const screenshotPath = path.join(tempDir, 'help.png');
  
  // 截图配置，可以根据需要调整参数
      const screenshotConfig = {
        width: null,                  // 截图宽度
        height: null,                 // 截图高度
        quality: 100,                 // JPEG图片质量(1-100)
        type: 'jpeg',                 // 图片类型(jpeg, png)
        deviceScaleFactor: deviceScaleFactor || 1, // 设备缩放比例
        selector: null,               // 截取特定元素的CSS选择器
        waitForSelector: null,        // 等待特定元素出现的CSS选择器
        waitForTimeout: null,         // 等待固定时间(毫秒)
        waitUntil: 'networkidle2',    // 页面加载完成条件
        fullPage: false,              // 是否截取整个页面
        topCutRatio: 0,               // 顶部裁剪比例
        bottomCutRatio: 0,            // 底部裁剪比例
        leftCutRatio: 0,              // 左侧裁剪比例
        rightCutRatio: 0,             // 右侧裁剪比例
        cacheTime: 3600,              // 缓存时间(秒)
        emulateDevice: null,          // 模拟设备
        userAgent: null,              // 自定义UA
        timeout: 120000,              // 总超时时间
        scrollToBottom: true,         // 是否滚动到底部
        cookies: null,                // 自定义Cookie
        allowFailure: true,           // 允许失败并返回默认图片
        authentication: null,         // HTTP认证
        clip: null,                   // 裁剪区域
        omitBackground: false,        // 是否省略背景
        encoding: 'binary',           // 图片编码
        hideScrollbars: true,         // 隐藏滚动条
        javascript: true,             // 是否启用JavaScript
        dark: false,                  // 暗黑模式
        retryCount: 2,                // 重试次数
        retryDelay: 1000              // 重试间隔
    };
  // 调用外部截图方法
  await takeScreenshot(htmlUrl, screenshotPath.replace(/\.png$/, ''), screenshotConfig);
  const dataHash = createHash('md5').update(JSON.stringify(helpData)).digest('hex');
  const hashPath = path.join(tempDir, 'help.hash');
  fs.writeFileSync(hashPath, dataHash);

  logger.mark(`\x1b[32miloli_help预渲染完成！\x1b[0m`);
};

// 检查 config.yaml 文件的哈希值变化
const checkConfigChanges = () => {
  try {
    // 读取 config.yaml 文件并计算哈希值
    const configData = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const currentConfigHash = createHash('md5').update(JSON.stringify(configData)).digest('hex');
    
    const configHashPath = path.join(tempDir, 'config.hash');
    const cachedConfigHash = fs.existsSync(configHashPath) ? fs.readFileSync(configHashPath, 'utf8') : null;

    if (!cachedConfigHash || cachedConfigHash !== currentConfigHash) {
      // 如果 config.yaml 文件有变化，更新缓存
      fs.writeFileSync(configHashPath, currentConfigHash);
      logger.mark('config.yaml 文件有变化，缓存已更新！');
      preRenderHelp();
    } else {
      logger.mark('config.yaml 文件未发生变化，缓存保持不变。');
    }
  } catch (err) {
    logger.error('检查 config.yaml 文件失败:', err);
  }
};

// 初始化缓存
const initCache = async () => {
  try {
    // 检查 config.yaml 文件的变更
    checkConfigChanges();

    // 计算当前数据的哈希值
    const currentDataHash = createHash('md5').update(JSON.stringify(helpData)).digest('hex');

    // 检查是否有缓存的哈希值
    const hashPath = path.join(tempDir, 'help.hash');
    const cachedDataHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, 'utf8') : null;

    if (!cachedDataHash || cachedDataHash !== currentDataHash) {
      logger.mark('正在预渲染帮助页面...');
      logger.mark(`\x1b[32m------------------------------\x1b[0m`)
      logger.mark(` `)
      await preRenderHelp();
      logger.mark('预渲染完成，缓存已更新！');
    } else {
      logger.mark(` ⸜(๑'ᵕ'๑)⸝⋆*  本次无需预渲染`);
      logger.mark(`\x1b[32m------------------------------\x1b[0m`)
      logger.mark(` `)
    }
  } catch (err) {
    logger.error('初始化缓存失败:', err);
  }
};

// 初始化缓存
initCache();

export class HelpPlugin extends plugin {
  constructor() {
    super({
      name: 'iloli-help',
      dsc: '帮助',
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: '^(#|/)?(云崽|云宝|全部)?(i|iloli|萝莉)(帮助|菜单|help|功能|说明|指令|使用说明|命令)(列表)?$',
          fnc: 'showHelp'
        },
        {
          reg: '^(#|/)?(刷新|重载|重置)(云崽|云宝|全部)?(i|iloli|萝莉)(帮助|菜单|help|功能|说明|指令|使用说明|命令)(列表)?$',
          fnc: 'refreshHelp'
        }
      ]
    });
  }

  async showHelp(e) {
    // 获取缓存的图片
    const screenshotPath = path.join(tempDir, 'help.png');
    if (fs.existsSync(screenshotPath)) {
      // 发送缓存的图片
      const help_image = segment.image(`file:///${screenshotPath}`)
      await e.reply([help_image, new Button().help()]);
    } else {
      await e.reply('帮助图片未生成，请稍后再试。');
    }
  }

  async refreshHelp(e) {
    await reloadConfig();
    // 提示用户正在刷新帮助
    await this.reply(`正在玩命渲染...\n请等一下喔( *ˊᵕˋ)✩︎‧₊`);


    // 重新生成帮助页面并截图
    await preRenderHelp();

    // 读取截图文件
    const screenshotPath = path.join(tempDir, 'help.png');
    if (fs.existsSync(screenshotPath)) {
      // 发送新的截图
      await e.reply([segment.image(`file:///${screenshotPath}`)]);
    } else {
      await e.reply('帮助图片生成失败，请稍后再试。');
    }
  }
}
