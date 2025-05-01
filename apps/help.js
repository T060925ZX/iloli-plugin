import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';
import Cfg from '../model/Cfg.js';

const pluginDir = path.resolve(process.cwd(), 'plugins/iloli-plugin');
const tempDir = path.join(pluginDir, 'temp');
const iconPath = path.join(pluginDir, 'resources', 'icon');
const configPath = path.join(pluginDir, 'config', 'help_config.yaml');
const yamlPath = path.join(pluginDir, 'config', 'default_config', 'help.yaml');
import { takeScreenshot } from '../model/takescreenshot.js';

// 全局变量，定义截图路径
let screenshotPath = path.join(tempDir, 'help.jpg');
let helpPath = path.join(tempDir, 'help.jpg');

// 封装重新加载配置的函数
const reloadConfig = () => {
  try {
    const config = Cfg.getConfig('help_config');
    return {
      H1: config.main_title || 'iloli-plugin',
      H2: config.sub_title || '帮助详情',
      columns: config.columns || 3,
      deviceScaleFactor: config.deviceScaleFactor || 2,
      yiyan: config.default_hitokoto || '种自己的花，爱自己的宇宙',
      bg: config.background_image_url || 'https://gitee.com/T060925ZX/iloli-plugin/raw/main/resources/image/nh.webp'
    };
  } catch (err) {
    logger.error('加载配置文件时出错:', err);
    return {
      H1: 'iloli-plugin',
      H2: '帮助详情',
      columns: 3,
      deviceScaleFactor: 2,
      yiyan: '种自己的花，爱自己的宇宙',
      bg: 'https://gitee.com/T060925ZX/iloli-plugin/raw/main/resources/image/nh.webp'
    };
  }
};

// 初始化配置
let configData = reloadConfig();
let { H1, H2, columns, deviceScaleFactor, yiyan, bg } = configData;

// 计算页面尺寸
const C = parseFloat((100 / columns).toFixed(2));
const P = (columns * 200 + 188).toFixed(2);

// 创建临时目录
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 使用 Cfg 读取 help.yaml 文件
const helpData = Cfg._getDefaultConfig('help');

// 生成 HTML 内容
const generateHTML = () => {
  let items = '';
  helpData.forEach(group => {
    items += `
      <div class="data_box">
        <div class="tab_lable">${group.group}</div>
        <div class="list">
    `;
    group.list.forEach(item => {
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
        @font-face {
          font-family: 'HYWenHei';
          src: url('file://${path.join(pluginDir, 'resources/font/HYWenHei-55W.ttf')}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        
        @font-face {
          font-family: 'OPSans';
          src: url('file://${path.join(pluginDir, 'resources/font/OPSans.woff2')}') format('woff2');
          font-display: swap;
        }

        body {
          overflow: -moz-scrollbars-none;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        body::-webkit-scrollbar { display: none; }
        ::-webkit-scrollbar { width: 0px; height: 5px; }
        * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
        body {
          padding: 20px;
          font-family: 'OPSans', -apple-system, sans-serif;
          font-size: 16px;
          color: #1e1f20;
          transform: scale(1.5);
          transform-origin: 0 0;
          width: ${P}px;
          background-image: url('${bg}');
        }
        .container { width: ${P}px; padding: 15px 15px 5px 15px; }
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
          font-family: 'HYWenHei', "Microsoft YaHei", sans-serif;
          padding: 20px 15px;
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
  const htmlContent = generateHTML();
  const htmlPath = path.join(tempDir, 'help.html');
  fs.writeFileSync(htmlPath, htmlContent);

  const screenshotConfig = {
    width: 1240,
    height: null,
    quality: 100,
    type: 'jpeg',
    deviceScaleFactor: deviceScaleFactor,
    waitUntil: 'networkidle2',
    fullPage: false,
    cacheTime: 3600,
    timeout: 180000,
    scrollToBottom: true,
    encoding: 'binary',
    hideScrollbars: true,
    javascript: true,
    retryCount: 2,
    retryDelay: 1000
  };

  try {
    screenshotPath = await takeScreenshot(htmlPath, 'help', screenshotConfig);
    const dataHash = createHash('md5').update(JSON.stringify(helpData)).digest('hex');
    fs.writeFileSync(path.join(tempDir, 'help.hash'), dataHash);
    logger.mark(`\x1b[32miloli_help预渲染完成！\x1b[0m`);
  } catch (err) {
    logger.error('预渲染失败:', err);
    throw err;
  }
};

// 检查 config.yaml 文件变化
const checkConfigChanges = () => {
  try {
    const configData = Cfg._getUserConfig('help_config');
    const currentConfigHash = createHash('md5').update(JSON.stringify(configData)).digest('hex');
    const configHashPath = path.join(tempDir, 'config.hash');
    const cachedConfigHash = fs.existsSync(configHashPath) ? fs.readFileSync(configHashPath, 'utf8') : null;

    if (!cachedConfigHash || cachedConfigHash !== currentConfigHash) {
      fs.writeFileSync(configHashPath, currentConfigHash);
      logger.mark('config.yaml 文件有变化，缓存已更新！');
      return true;
    }
    logger.mark('config.yaml 文件未发生变化。');
    return false;
  } catch (err) {
    logger.error('检查 config.yaml 文件失败:', err);
    return false;
  }
};

// 初始化缓存
const initCache = async () => {
  try {
    const configChanged = checkConfigChanges();
    const currentDataHash = createHash('md5').update(JSON.stringify(helpData)).digest('hex');
    const hashPath = path.join(tempDir, 'help.hash');
    const cachedDataHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, 'utf8') : null;

    if (!cachedDataHash || cachedDataHash !== currentDataHash || configChanged) {
      logger.mark('正在预渲染帮助页面...');
      await preRenderHelp();
      logger.mark('预渲染完成，缓存已更新！');
    } else {
      logger.mark('本次无需预渲染');
    }
  } catch (err) {
    logger.error('初始化缓存失败:', err);
  }
};

// 初始化
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
      await e.reply([segment.image(helpPath)]);
  }

  async refreshHelp(e) {
    configData = reloadConfig();
    ({ H1, H2, columns, deviceScaleFactor, yiyan, bg } = configData);
    await e.reply('正在渲染帮助页面，请稍等...');

    try {
      await preRenderHelp();
      if (fs.existsSync(screenshotPath)) {
        await e.reply([segment.image(screenshotPath)]);
      } else {
        await e.reply('帮助图片生成失败，请稍后再试。');
      }
    } catch (err) {
      await e.reply('渲染失败，请检查日志或稍后再试。');
    }
  }
}