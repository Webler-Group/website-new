import sharp from "sharp";
import bcrypt from "bcrypt";
import { createCanvas } from "canvas";

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const getCaptcha = async () => {
    const width = 100;
    const height = 36;

    const message = [...new Array(6)]
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join("");

    // Draw text on canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Green background
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, width, height);

    // Black text
    ctx.fillStyle = "black";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, width / 2, height / 2);

    const canvasBuffer = canvas.toBuffer("image/png");

    // Use sharp to apply blur
    const blurredBuffer = await sharp(canvasBuffer)
        .blur(1)
        .png()
        .toBuffer();

    const base64ImageDataURI = `data:image/png;base64,${blurredBuffer.toString("base64")}`;

    const salt = bcrypt.genSaltSync();
    const encrypted = bcrypt.hashSync(message.toLowerCase(), salt);

    return {
        base64ImageDataURI,
        encrypted,
    };
};

const verifyCaptcha = (answer: string, encrypted: string): boolean => {
    return bcrypt.compareSync(answer.trim().toLowerCase(), encrypted);
};

export { getCaptcha, verifyCaptcha };