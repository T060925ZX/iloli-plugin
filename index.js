import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 获取版本号
function getVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '0.0.0'
  } catch (err) {
    logger.error('[iloli插件] 读取版本号失败:', err)
    return '0.0.0'
  }
}

// 需要强制同步的配置文件列表
const FORCE_SYNC_FILES = ['chuo.yaml'] 

// 初始化配置文件
function initConfig() {
  const configDir = path.join(__dirname, 'config')
  const defaultConfigDir = path.join(configDir, 'default_config')
  const result = { 
    new: 0, 
    existing: 0, 
    forced: 0, 
    forcedFiles: {}, // 记录每个强制同步文件的详细状态
    otherFiles: { new: 0, existing: 0 } // 其他文件的统计
  }

  try {
    // 确保配置目录存在
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
      logger.mark('[iloli插件] 创建配置目录')
    }

    // 检查默认配置目录是否存在
    if (!fs.existsSync(defaultConfigDir)) {
      logger.error('[iloli插件] 默认配置目录不存在:', defaultConfigDir)
      return result
    }

    // 处理强制同步文件
    for (const file of FORCE_SYNC_FILES) {
      const source = path.join(defaultConfigDir, file)
      const target = path.join(configDir, file)

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target) // 强制覆盖
        result.forced++
        result.forcedFiles[file] = 'success'
        logger.debug(`[iloli插件] 已强制同步配置: ${file}`)
      } else {
        result.forcedFiles[file] = 'missing'
        logger.warn(`[iloli插件] 默认配置中缺少强制同步文件: ${file}`)
      }
    }

    // 遍历其他默认配置文件（非强制同步）
    const defaultConfigs = fs.readdirSync(defaultConfigDir)
      .filter(file => ['.yaml', '.yml', '.json'].includes(path.extname(file)) && 
                      !FORCE_SYNC_FILES.includes(file))

    if (defaultConfigs.length === 0) {
      logger.warn('[iloli插件] 默认配置目录中没有找到其他配置文件');
      return result;
    }

    // 复制其他配置文件（仅当目标不存在时）
    defaultConfigs.forEach(file => {
      const source = path.join(defaultConfigDir, file)
      const target = path.join(configDir, file)

      if (!fs.existsSync(target)) {
        fs.copyFileSync(source, target)
        result.otherFiles.new++
        logger.debug(`[iloli插件] 已复制默认配置: ${file}`)
      } else {
        result.otherFiles.existing++
      }
    })

    // 合并统计
    result.new = result.otherFiles.new
    result.existing = result.otherFiles.existing

    // 输出统计信息
    if (result.forced > 0) {
      logger.mark(`[iloli插件] 已强制同步 ${result.forced} 个配置文件`);
      Object.entries(result.forcedFiles).forEach(([file, status]) => {
        if (status === 'success') {
          logger.debug(`[iloli插件]   ✓ ${file}`);
        } else {
          logger.warn(`[iloli插件]   ⚠ 缺少: ${file}`);
        }
      });
    }
    if (result.new > 0) {
      logger.mark(`[iloli插件] 已初始化 ${result.new} 个新配置文件`);
    }
    if (result.existing > 0) {
      logger.mark(`[iloli插件] 跳过 ${result.existing} 个已存在的配置文件`);
    }

    return result;
  } catch (err) {
    logger.error('[iloli插件] 配置初始化失败:', err);
    return result;
  }
}

// 加载所有模块
async function loadApps() {
  const appsPath = path.join(__dirname, 'apps')
  const result = { success: 0, failed: 0, apps: {} }

  try {
    // 检查模块目录是否存在
    if (!fs.existsSync(appsPath)) {
      logger.error('[iloli插件] 模块目录不存在:', appsPath)
      return { ...result, duration: 0 }
    }

    const files = fs.readdirSync(appsPath)
      .filter(file => file.endsWith('.js'))

    const startTime = Date.now()
    
    // 使用for循环保证顺序加载
    for (const file of files) {
      const name = file.replace('.js', '')
      try {
        const module = await import(`./apps/${file}`)
        const exportKey = Object.keys(module)[0]
        if (exportKey) {
          result.apps[name] = module[exportKey]
          result.success++
          logger.debug(`[iloli插件] 成功加载模块: ${name}`)
        }
      } catch (err) {
        result.failed++
        logger.warn(`[iloli插件] 加载模块 ${name} 失败:`, err)
      }
    }

    const duration = Date.now() - startTime
    return { ...result, duration }
  } catch (err) {
    logger.error('[iloli插件] 加载过程出错:', err)
    throw err
  }
}

// 打印横幅信息
function printBanner(version, config, modules) {
  const line = '='.repeat(38)
  const content = [
    `           iloli-plugin v${version}`,
    `    ✓ 配置: ${config.new}个新初始化 | ${config.existing}个已存在 | 强制同步: ${config.forced}个`,
    `    ✓ 模块: 成功加载 ${modules.success}个 | 失败 ${modules.failed}个`,
    `            ⏱️ 总耗时: ${modules.duration}ms`
  ].join('\n')

  logger.mark(`\n${line}\n${content}\n${line}\n`)
}

// 主初始化函数
async function initialize() {
  const version = getVersion()
  const config = initConfig()
  const modules = await loadApps()
  
  printBanner(version, config, modules)
  
  return {
    version,
    apps: modules.apps
  }
}

// 执行初始化并导出
try {
  const { version, apps } = await initialize()
  export { version, apps }
} catch (err) {
  logger.error('[iloli插件] 初始化失败，无法导出:', err)
  // 确保即使初始化失败也能导出基本结构
  export const version = '0.0.0'
  export const apps = {}
}
