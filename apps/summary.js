import Cfg from "./Cfg.js";

segment.image = function (file, name) {
    return {
        type: "image",
        file: file,
        name: name,
        summary: Cfg.getConfig("defSet", "config")
    };
};
