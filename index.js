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

// 初始化配置文件
function initConfig() {
  const configDir = path.join(__dirname, 'config')
  const defaultConfigDir = path.join(configDir, 'default_config')
  const result = { new: 0, existing: 0 }

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

    // 遍历默认配置目录下的所有配置文件
    const defaultConfigs = fs.readdirSync(defaultConfigDir)
      .filter(file => ['.yaml', '.yml', '.json'].includes(path.extname(file)))

    if (defaultConfigs.length === 0) {
      logger.warn('[iloli插件] 默认配置目录中没有找到配置文件')
      return result
    }

    // 复制每个配置文件
    defaultConfigs.forEach(file => {
      const source = path.join(defaultConfigDir, file)
      const target = path.join(configDir, file)

      // 只复制不存在的配置文件
      if (!fs.existsSync(target)) {
        fs.copyFileSync(source, target)
        result.new++
        logger.debug(`[iloli插件] 已复制默认配置: ${file}`)
      } else {
        result.existing++
      }
    })

    if (result.new > 0) {
      logger.mark(`[iloli插件] 已初始化 ${result.new} 个新配置文件`)
    }
    if (result.existing > 0) {
      logger.mark(`[iloli插件] 跳过 ${result.existing} 个已存在的配置文件`)
    }

    return result
  } catch (err) {
    logger.error('[iloli插件] 配置初始化失败:', err)
    return result
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
    // logger.mark(`[iloli插件] 加载完成，成功 ${result.success} 个，失败 ${result.failed} 个，耗时 ${logger.green(duration + 'ms')}`)
    
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
    `    ✓ 配置: ${config.new}个新初始化 | ${config.existing}个已存在`,
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
const { version, apps } = await initialize()
export { version, apps }