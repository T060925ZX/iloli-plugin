import fs from "node:fs";
import path from "path";
import Cfg from "./model/Cfg.js";
import chalk from 'chalk'

if (!global.segment) {
  try {
    global.segment = (await import("oicq")).segment;
  } catch (err) {
    global.segment = (await import("icqq")).segment;
  }
}

const _path = process.cwd();

// 异步函数获取插件版本
async function globalVersion() {
  let PluginVersion = JSON.parse(fs.readFileSync(`${_path}/plugins/iloli-plugin/package.json`, 'utf-8'));
  PluginVersion = PluginVersion.version; 
  global.PluginVersion = PluginVersion;
  return PluginVersion; 
}

// 异步执行获取版本操作
(async () => {
  const version = await globalVersion();
})();

// 检查并复制需要的配置文件
const configDir = `${_path}/plugins/iloli-plugin/config`;
const defSetDir = `${_path}/plugins/iloli-plugin/defSet`;

const requiredFiles = [
  'config.yaml',
  'help.yaml'
];

// 检查 config 目录是否存在，不存在则复制文件
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true }); 
  
  requiredFiles.forEach(file => {
    const sourceFile = path.join(defSetDir, file);
    const targetFile = path.join(configDir, file);

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, targetFile);
      logger.mark(`初始化 ${file} 文件...`);
    } else {
      logger.warn(`警告: 源文件 ${file} 不存在，无法复制`);
    }
  });
}

logger.mark(`======0ε٩(๑> ₃ <)۶з ======`);

const versionData = Cfg.getdefSet("version", "version");

const files = fs
  .readdirSync("./plugins/iloli-plugin/apps")
  .filter((file) => file.endsWith(".js"));

let ret = [];

files.forEach((file) => {
  ret.push(import(`./apps/${file}`));
});

ret = await Promise.allSettled(ret);

let apps = {};
for (let i in files) {
  let name = files[i].replace('.js', '');

  if (ret[i].status !== 'fulfilled') {
    logger.warn(`[iloli-plugin] 载入插件错误：${logger.red(name)}`);
    console.error(ret[i].reason);
    continue;
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
}

logger.mark(`欢迎使用 [iloli-plugin]`);
logger.mark(`当前版本: ${PluginVersion}`);
logger.mark(`========================== `);

export { apps };
