#!/usr/bin/env node
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require("fs");
const path = require("path");
const { Minimatch } = require("minimatch");
const args = require("minimist")(process.argv.slice(2));
const cwd = process.cwd();
const packagejson = path.join(cwd, "package.json");
const verbose = args["v"] || args["verbose"];
const usingYarn = args["yarn"];
(function npmRunSeries() {
    return __awaiter(this, void 0, void 0, function* () {
        const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
        if (fs.existsSync(packagejson)) {
            /**
             * @type {import('../package.json')}
             */
            const parse = JSON.parse(fs.readFileSync(packagejson, "utf-8"));
            if (parse !== null && typeof parse === "object") {
                if ("scripts" in parse) {
                    const patterns = args._;
                    const scripts = parse.scripts;
                    const scriptNames = Object.keys(scripts);
                    for (let i = 0; i < patterns.length; i++) {
                        const pattern = patterns[i];
                        const matcher = new Minimatch(pattern, { nonegate: true });
                        for (let ii = 0; ii < scriptNames.length; ii++) {
                            const scriptName = scriptNames[ii];
                            const match = matcher.match(scriptName);
                            if (verbose)
                                console.log({ pattern, scriptName, match });
                            if (match === true) {
                                yield execa(usingYarn ? "yarn" : "npm", ["run", scriptName], {
                                    cwd,
                                    stdio: "inherit"
                                });
                            }
                        }
                    }
                }
            }
        }
    });
})();
