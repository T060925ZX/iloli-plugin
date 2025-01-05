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

const configDir = `${_path}/plugins/iloli-plugin/config`;
const defSetDir = `${_path}/plugins/iloli-plugin/defSet`;

// 复制文件并按指定的命名规则保存
function copyFilesWithCustomNaming(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true }); // 确保目标文件夹存在
  }

  const items = fs.readdirSync(source); // 读取源文件夹内容
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, `${item.split('/').join('.')}`); // 按照文件夹名.文件名的方式保存

    if (fs.statSync(sourcePath).isDirectory()) {
      // 如果是子文件夹，递归复制
      copyFilesWithCustomNaming(sourcePath, target);
    } else {
      // 如果是文件，按新的命名规则复制
      const customTargetPath = path.join(target, `${path.basename(source)}.${item}`);
      fs.copyFileSync(sourcePath, customTargetPath);
    }
  });
}

// 检查 config 目录是否存在，不存在则复制整个文件夹
if (!fs.existsSync(configDir)) {
  try {
    copyFilesWithCustomNaming(defSetDir, configDir);
    logger.mark(`[iloli-plugin]初始化配置文件`);
  } catch (error) {
    logger.error(`初始化配置文件失败: ${error.message}`);
  }
}

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

logger.mark(`======0ε٩(๑> ₃ <)۶з ======`);
logger.mark(`欢迎使用 [iloli-plugin]`);
logger.mark(`当前版本: ${PluginVersion}`);
logger.mark(`========================== `);

export { apps };
