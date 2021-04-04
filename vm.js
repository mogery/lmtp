#!/usr/bin/env node
// Lime Machine
// Original code by ast
// Minified/modularized by mogery

function vm(c, input) {
    let r, i;
    const s = [], f = [
        x => r = x,
        x => i = x - 1,
        (x, y) => x && (i = y - 1),
        () => null,
        () => ({JSON, input, Math, Date}),
        () => String.fromCharCode,
        x => s[x],
        (x, y) => x[y],
        (x, y, z) => (x[y] = z, x),
        (x, y) => x.call(...s.splice(-y)),
        (x, y) => x + y,
        (x, y) => x * y,
        x => -x,
        x => !x,
        (x, y) => x > y,
        (x, y) => x == y,
        x => typeof x
    ];

    for (i = 0; !r; i++) {
        const e = c[i];

        if (e >= 50) {
            s.push(e - 50);
            continue;
        }

        const p = f[e % 25], o = p(...s.splice(s.length - p.length));
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