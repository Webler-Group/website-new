"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCaptcha = exports.getCaptcha = void 0;
const jimp_1 = __importDefault(require("jimp"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const getCaptcha = () => __awaiter(void 0, void 0, void 0, function* () {
    const image = new jimp_1.default(100, 36, 'green', (err, image) => {
        if (err)
            throw err;
    });
    const randNum = Math.floor(Math.random() * 1000000);
    const message = randNum.toString();
    const font = yield jimp_1.default.loadFont(jimp_1.default.FONT_SANS_16_BLACK);
    const textWidth = jimp_1.default.measureText(font, message);
    const x = (100 - textWidth) / 2;
    const y = 10;
    image.print(font, x, y, message);
    image.blur(1);
    const base64ImageDataURI = yield image.getBase64Async(jimp_1.default.MIME_PNG);
    const salt = bcrypt_1.default.genSaltSync();
    const encrypted = bcrypt_1.default.hashSync(message, salt);
    return {
        base64ImageDataURI,
        encrypted
    };
});
exports.getCaptcha = getCaptcha;
const verifyCaptcha = (answer, encrypted) => {
    return bcrypt_1.default.compareSync(answer, encrypted);
};
exports.verifyCaptcha = verifyCaptcha;
