import plugin from "../../../lib/plugins/plugin.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import Help from "../model/help.js";
import md5 from "md5";

let helpData = {
  md5: "",
  img: "",
};

export class help extends plugin {
  constructor(e) {
    super({
      name: "[iloli-plugin]帮助",
      dsc: "[iloli-plugin]帮助",
      event: "message",
      priority: 500,
      rule: [
        {
          reg: "^#*(i|萝莉|iloli|莉莉)(插件)?(命令|帮助|菜单|help|说明|功能|指令|使用说明)$",
          fnc: "help",
        },
      ],
    });
  }

  /**
   * rule - [iloli-plugin]插件帮助
   * @returns
   */
  async help() {
    let data = await Help.get(this.e);
    if (!data) return;
    let img = await this.cache(data);
    await this.reply(img);
  }

  async cache(data) {
    let tmp = md5(JSON.stringify(data));
    if (helpData.md5 == tmp) return helpData.img;

    helpData.img = await puppeteer.screenshot("help", data);
    helpData.md5 = tmp;

    return helpData.img;
  }
}
