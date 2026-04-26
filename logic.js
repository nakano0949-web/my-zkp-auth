// パラメータ
const MOD = (2n ** 255n) - 19n;
const ORDER = MOD - 1n;
const g = 5n;
const h = 7n;

/**
 * ハッシュ関数を一切使わず、パスワードの全ビットを行列演算(Möbius)に通す
 * これにより「同じ文字数」の脆弱性を完全に排除します
 */
function deriveVFromMoebius(password, saltBytes) {
    let a = 1n, b = 0n, c = 0n, d = 1n;
    const enc = new TextEncoder();
    const pwBytes = enc.encode(password);
    
    const combined = new Uint8Array(saltBytes.length + pwBytes.length);
    combined.set(saltBytes, 0);
    combined.set(pwBytes, saltBytes.length);

    // パスワードをビット列に分解
    const bits = [];
    for (const byte of combined) {
        for (let i = 7; i >= 0; i--) {
            // 1 なら 1、0 なら -1 として行列を選択
            bits.push(((byte >> i) & 1) === 1 ? 1 : -1);
        }
    }

    // メビウス変換（ハッシュゼロでの数値化）
    for (const bit of bits) {
        if (bit === 1) {
            // Cplus 行列演算
            const na = (a + b) % MOD;
            const nb = (2n * a + b) % MOD;
            const nc = (c + d) % MOD;
            const nd = (2n * c + d) % MOD;
            a = na; b = nb; c = nc; d = nd;
        } else {
            // Cminus 行列演算
            const na = (a + b) % MOD;
            const nb = b;
            const nc = (c + d) % MOD;
            const nd = d;
            a = na; b = nb; c = nc; d = nd;
        }
    }
    // 最終的な「鍵」となる v
    return (a + b + c + d) % ORDER;
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
