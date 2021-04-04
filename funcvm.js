// Lime Function Virtual Machine
// Original code by ast
// Extended by mogery
//
// This is essentially a LEM with additional shims, so that LMTP can bind
// bytecode and arg specification to this, and you can pass it to JS
// methods without issue.

let r, i, h;
const s = [], f = [
    x => r = x, // 0
    x => i = x - 1, // 1
    (x, y) => x && (i = y - 1), // 2
    () => null, // 3
    () => (Object.assign(glob, names.map((x,i) => [x, args[i] || defaults[i]]))), // 4
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

for (i = 0; !h; i++) {
    const e = c[i];

    if (e >= 50) {
        s.push(e - 50);
        continue;
    }

    const p = f[e % 25];
    if (opts.debug) console.error("[DEBUG]", e % 25, "(" + e + ")", s);
    const o = p(...s.splice(s.length - p.length));
    if (e % 25 == 0) h = true;
    if (e < 25) s.push(o);
}

return r;