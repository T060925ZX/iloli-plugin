import cfg from '../model/Cfg.js'

export class ConfigTest extends plugin {
    constructor() {
        super({
            name: '配置测试',
            dsc: '测试配置文件读写功能',
            event: 'message',
            priority: 1,
            rule: [
                { reg: /^#测试配置\s*(.*)$/, fnc: 'testConfig' },
                { reg: /^#修改配置\s*(\S+):(\S+):(.+)$/, fnc: 'modifyConfig' }
            ]
        })
    }

    async testConfig() {
        const configName = this.e.msg.replace(/^#测试配置\s*/, '').trim() || 'system'
        
        try {
            const config = cfg.getConfig(configName)
            const msg = [
                '📋 配置测试结果',
                `🔧 配置文件: ${configName}.yaml`,
                `📂 配置路径: ${cfg.userConfigDir}`,
                '📄 配置内容:',
                JSON.stringify(config, null, 2),
                '',
                '💡 使用 #修改配置 文件名:配置项:值 来修改配置',
                '示例: #修改配置 system:deviceScaleFactor:2'
            ].join('\n')
            
            await this.reply(msg)
        } catch (err) {
            await this.reply(`❌ 配置测试失败: ${err.message}`)
        }
    }

    async modifyConfig() {
        const [, file, key, value] = this.e.msg.match(/^#修改配置\s*(\S+):(\S+):(.+)$/)
        
        try {
            // 获取当前配置
            let config = cfg.getConfig(file)
            
            // 转换值类型（尝试转为数字/布尔值）
            let newValue = value
            if (/^\d+$/.test(value)) newValue = Number(value)
            else if (value.toLowerCase() === 'true') newValue = true
            else if (value.toLowerCase() === 'false') newValue = false
            
            // 支持多级配置项（如 a.b.c）
            const keys = key.split('.')
            let temp = config
            for (let i = 0; i < keys.length - 1; i++) {
                if (!temp[keys[i]]) temp[keys[i]] = {}
                temp = temp[keys[i]]
            }
            temp[keys[keys.length - 1]] = newValue
            
            // 保存配置
            if (cfg.setConfig(file, config)) {
                await this.reply(`✅ 配置修改成功\n${key} = ${JSON.stringify(newValue)}\n文件: ${file}.yaml`)
            } else {
                await this.reply('❌ 配置保存失败，请检查控制台日志')
            }
        } catch (err) {
            await this.reply(`❌ 配置修改失败: ${err.message}`)
        }
    }
}
