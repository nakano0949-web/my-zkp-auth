window.MOD = (2n ** 255n) - 19n;
window.ORDER = window.MOD - 1n;
window.g = 5n;
window.h = 7n;

// メビウス変換で v と r を両方作る
function deriveVAndR(password, saltBytes) {
    let a = 1n, b = 0n, c = 0n, d = 1n;
    const enc = new TextEncoder();
    const pwBytes = enc.encode(password);
    
    const combined = new Uint8Array(saltBytes.length + pwBytes.length);
    combined.set(saltBytes, 0);
    combined.set(pwBytes, saltBytes.length);

    const bits = [];
    for (const byte of combined) {
        for (let i = 7; i >= 0; i--) {
            bits.push(((byte >> i) & 1) === 1 ? 1 : -1);
        }
    }

    for (const bit of bits) {
        const na = (a + b) % window.MOD;
        const nc = (c + d) % window.MOD;
        if (bit === 1) {
            a = na; b = (2n * a + b) % window.MOD;
            c = nc; d = (2n * c + d) % window.MOD;
        } else {
            a = na; b = b;
            c = nc; d = d;
        }
    }
    // v は前半の合計、r は後半の合計にする（これでパスワードから両方固定で作れる）
    const v = (a + b) % window.ORDER;
    const r = (c + d) % window.ORDER;
    return { v, r };
}

function modPow(base, exp, mod) {
    let result = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) result = (result * b) % mod;
        b = (b * b) % mod;
        e >>= 1n;
    }
    return result;
}
