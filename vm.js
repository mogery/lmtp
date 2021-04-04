#!/usr/bin/env node
// Lime Machine
// Original code by ast
// Minified/modularized by mogery

function vm(c, input, opts = {}) {
    let r, i;
    const s = [], f = [
        x => r = x, // 0
        x => i = x - 1, // 1
        (x, y) => x && (i = y - 1), // 2
        () => null, // 3
        () => ({JSON, input, Math, Date}), // 4
        () => String.fromCharCode, // 5
        x => s[x], // 6
        (x, y) => x[y], // 7
        (x, y, z) => (x[y] = z, x), // 8
        (x, y) => x.call(...s.splice(-y)), // 9
        (x, y) => x + y, // 10
        (x, y) => x * y, // 11
        x => -x, // 12
        x => !x, // 13
        (x, y) => x > y, // 14
        (x, y) => x == y, // 15
        x => typeof x // 16
    ];

    for (i = 0; !r; i++) {
        const e = c[i];

        if (e >= 50) {
            s.push(e - 50);
            continue;
        }

        const p = f[e % 25];
        if (opts.debug) console.error("[DEBUG]", e % 25, "(" + e + ")", s);
        const o = p(...s.splice(s.length - p.length));
        if (e < 25) s.push(o);
    }

    return r;
}

module.exports = vm;

if (require.main === module) {
    let path = process.argv[2], inputPath = process.argv[3];
    
    if (!path) {
        console.error("Usage: vm.js <code path> [JSON input]");
        process.exit(1);
    }

    let fs = require("fs"),
        code = JSON.parse(fs.readFileSync(path, "utf8")),
        input = inputPath ? JSON.parse(fs.readFileSync(inputPath, "utf8")) : undefined;
    
    console.log(vm(code, input))
}