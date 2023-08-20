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
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const countryCodes_1 = __importDefault(require("../config/countryCodes"));
const isEmail_1 = __importDefault(require("validator/lib/isEmail"));
const roles_1 = __importDefault(require("../config/roles"));
const userSchema = new mongoose_1.default.Schema({
    email: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [isEmail_1.default, 'invalid email']
    },
    password: {
        required: true,
        type: String
    },
    name: {
        type: String,
        trim: true,
        default: "Weblerian",
        minLength: 3,
        maxLength: 20
    },
    countryCode: {
        type: String,
        enum: countryCodes_1.default,
        default: ""
    },
    bio: {
        type: String,
        trim: true,
        maxLength: 120,
        default: ""
    },
    roles: {
        type: [String],
        default: ["User"],
        enum: roles_1.default
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    avatarUrl: {
        type: String
    }
}, {
    timestamps: true
});
userSchema.methods.matchPassword = function (inputPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield bcrypt_1.default.compare(inputPassword, this.password);
    });
};
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("password")) {
            return next();
        }
        if (this.password.length < 6) {
            return next(new Error("Password must contain at least 6 characters"));
        }
        const salt = yield bcrypt_1.default.genSalt(10);
        this.password = yield bcrypt_1.default.hash(this.password, salt);
    });
});
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
