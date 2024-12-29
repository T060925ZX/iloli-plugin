import fs from 'node:fs'
import path from 'node:path'

// 检查并复制需要的配置文件
const configDir = './plugins/iloli-plugin/config'
const defSetDir = './plugins/iloli-plugin/defSet'

const requiredFiles = [
  'config.yaml',
  'help.yaml'
]

// 检查 config 目录是否存在，不存在则复制文件
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true })  // 创建 config 目录
  
  requiredFiles.forEach(file => {
    const sourceFile = path.join(defSetDir, file)
    const targetFile = path.join(configDir, file)

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, targetFile)
      //console.log(`文件已复制: ${file}`)
      console.log(`[iloli-plugin] 初始化....`)
    } else {
      console.warn(`警告: 源文件 ${file} 不存在，无法复制`)
    }
  })
}

const files = fs.readdirSync('./plugins/iloli-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status !== 'fulfilled') {
    logger.error(`[iloli-plugin] 载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
