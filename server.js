const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// 数学的パラメータ (logic.jsと完全に一致させる)
const MOD = (2n ** 255n) - 19n;
const ORDER = MOD - 1n;
const g = 5n;
const h = 7n;

// ユーザーDB (メモリ保存なので再起動でリセットされます)
const db = new Map(); 
// セッション管理 (チャレンジ e を一時保存)
const activeSessions = new Map();

// 冪剰余計算
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

// [0] 登録API
app.post('/api/signup', (req, res) => {
    const { username, salt, com, r } = req.body;
    // 重要: comだけでなく、saltとrも保存する
    db.set(username, { 
        salt, 
        com: BigInt(com), 
        r: BigInt(r) 
    });
    console.log(`Registered: ${username}`);
    res.json({ status: "success" });
});

// [1] チャレンジAPI (認証開始)
app.post('/api/login/challenge', (req, res) => {
    const { username, t } = req.body;
    const user = db.get(username);
    
    if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // ランダムな質問 e を生成
    const e = BigInt(Math.floor(Math.random() * 1000000000000)); 
    
    // 検証のために必要なデータをセッションに保存
    activeSessions.set(username, { 
        t: BigInt(t), 
        e, 
        com: user.com, 
        r: user.r 
    });

    // クライアントに e と、計算に必要な salt, r を返す
    res.json({ 
        e: e.toString(), 
        r: user.r.toString(), 
        salt: user.salt 
    });
});

// [2] 検証API (最終確認)
app.post('/api/login/verify', (req, res) => {
    const { username, s_v, s_r } = req.body;
    const session = activeSessions.get(username);
    
    if (!session) return res.status(400).json({ error: "セッションがありません。" });

    // ZKP検証式: g^s_v * h^s_r == t * com^e (mod MOD)
    const lhs = (modPow(g, BigInt(s_v), MOD) * modPow(h, BigInt(s_r), MOD)) % MOD;
    const rhs = (session.t * modPow(session.com, session.e, MOD)) % MOD;

    const success = (lhs === rhs);
    console.log(`Verification for ${username}: ${success ? "OK" : "FAILED"}`);
    
    res.json({ success });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ZKP Server running on port ${PORT}`));
