import Jimp from "jimp";
import bcrypt from "bcrypt";

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const getCaptcha = async () => {
    const image = new Jimp(100, 36, 'green', (err: any, image: any) => {
        if (err)
            throw err;
    });
    const message = [...new Array(6)].map(x => chars[Math.floor(Math.random() * chars.length)]).join("");
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    const textWidth = Jimp.measureText(font, message);
    const x = (100 - textWidth) / 2;
    const y = 10;
    image.print(font, x, y, message);
    image.blur(1);
    const base64ImageDataURI = await image.getBase64Async(Jimp.MIME_PNG);
    const salt = bcrypt.genSaltSync();
    const encrypted = bcrypt.hashSync(message.toLowerCase(), salt);
    return {
        base64ImageDataURI,
        encrypted
    };
};

const verifyCaptcha = (answer: string, encrypted: string) => {
    return bcrypt.compareSync(answer.trim().toLowerCase(), encrypted);
};

export {
    getCaptcha,
    verifyCaptcha
}