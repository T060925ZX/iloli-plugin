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

}