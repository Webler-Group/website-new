"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCaptcha = exports.getCaptcha = void 0;
const jimp_1 = __importDefault(require("jimp"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getCaptcha = async () => {
    const image = new jimp_1.default(100, 36, 'green', (err, image) => {
        if (err)
            throw err;
    });
    const message = [...new Array(6)].map(x => chars[Math.floor(Math.random() * chars.length)]).join("");
    const font = await jimp_1.default.loadFont(jimp_1.default.FONT_SANS_16_BLACK);
    const textWidth = jimp_1.default.measureText(font, message);
    const x = (100 - textWidth) / 2;
    const y = 10;
    image.print(font, x, y, message);
    image.blur(1);
    const base64ImageDataURI = await image.getBase64Async(jimp_1.default.MIME_PNG);
    const salt = bcrypt_1.default.genSaltSync();
    const encrypted = bcrypt_1.default.hashSync(message.toLowerCase(), salt);
    return {
        base64ImageDataURI,
        encrypted
    };
};
exports.getCaptcha = getCaptcha;
const verifyCaptcha = (answer, encrypted) => {
    return bcrypt_1.default.compareSync(answer.trim().toLowerCase(), encrypted);
};
exports.verifyCaptcha = verifyCaptcha;
