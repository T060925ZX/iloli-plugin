export default class Button {
    ability() {
        return segment.button([
            { text: "我的超能力", callback: `#随机超能力` },
        ], [
            { text: "新增超能力", input: `#新增超能力` },
            { text: "新增副作用", input: `#新增副作用` },
        ])
    }

    life() {
        return segment.button([
            { text: "下一阶段", callback: `#下一阶段` },
            { text: "重开", callback: `#重开人生` },
        ], [
            { text: "模拟人生", callback: `#模拟人生` },
            { text: "我的人生", callback: `#我的人生` },
        ])
    }

    help() {
        return segment.button([
            { text: "随机超能力", callback: `#随机超能力` },
            { text: "涩图", input: `#来份涩图` },
        ], [
            { text: "戳他", input: `戳他` },
            { text: "留言", input: `#留言` },
        ])
    }

    ai() {
        return segment.button([
            { text: "DeepSeek", input: `#dp` },
            { text: "Qwen", input: `#qwen` },
        ], [
            { text: "Kimi", input: `#kimi` },
        ])
    }

}