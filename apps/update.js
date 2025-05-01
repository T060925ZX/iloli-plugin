import cfg from "../../../lib/config/config.js"
import fs from "node:fs/promises"
import { execSync } from "node:child_process"

let uping = false

export class iloliupdate extends plugin {
  constructor() {
    super({
      name: "[萝莉插件]更新",
      event: "message",
      priority: 1145,
      rule: [
        {
          reg: "^#*(i|萝莉)(插件)?(强制)?更新$",
          fnc: "update"
        }
      ]
    })
  }

  async update() {
if (!this.e.isMaster && this.e.user_id !== 1602833550) return false
    if (uping) {
      await this.reply("正在更新，请稍候再试")
      return false
    }

    const plugin = "iloli-plugin"
    uping = true

    try {
      const isForce = this.e.msg.includes("强制")
      const result = await this.runUpdate(plugin, isForce)
      
      if (result) {
        await this.reply("萝莉插件更新成功！")
        if (result.needsRestart) {
          await this.restart()
        }
      }
    } catch (err) {
      logger.error("更新失败:", err)
      await this.reply("更新失败，请查看日志")
    } finally {
      uping = false
    }
  }

  async runUpdate(plugin, isForce = false) {
    let cmd = "git pull"
    if (isForce) {
      cmd = "git reset --hard && git pull"
    }

    logger.mark(`开始更新 ${plugin}`)
    await this.reply(`开始${isForce ? "强制" : ""}更新萝莉插件...`)

    const oldCommit = await this.getCommitId(plugin)
    const ret = await this.exec(cmd, plugin)

    if (ret.error) {
      await this.handleGitError(plugin, ret)
      return false
    }

    const newCommit = await this.getCommitId(plugin)
    const updated = oldCommit !== newCommit

    if (updated) {
      logger.mark(`${plugin} 更新成功`)
      return { needsRestart: true }
    } else {
      await this.reply("萝莉插件已是最新版本")
      return { needsRestart: false }
    }
  }

  async getCommitId(plugin) {
    const ret = await this.exec("git rev-parse --short HEAD", plugin)
    return ret.stdout.trim()
  }

  async exec(cmd, plugin) {
    const opts = { cwd: `plugins/${plugin}` }
    return Bot.exec(cmd, opts)
  }

  async handleGitError(plugin, ret) {
    const error = ret.error.message
    if (/unable to access|无法访问/.test(error)) {
      await this.reply("无法访问远程仓库，请检查网络")
    } else if (/not found|未找到/.test(error)) {
      await this.reply("仓库地址错误")
    } else {
      await this.reply(`更新失败: ${error}`)
    }
  }

  async restart() {
    await this.reply("即将重启应用...")
    try {
      if (process.platform === "win32") {
        execSync("pnpm run stop && pnpm start", { stdio: "inherit" })
      } else {
        execSync("pm2 restart Yunzai", { stdio: "inherit" })
      }
    } catch (err) {
      logger.error("重启失败:", err)
      await this.reply("重启失败，请手动重启")
    }
  }
}