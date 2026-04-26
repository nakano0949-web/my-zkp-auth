const express = require('express');
const cors = require('cors');
const app = express();

// スマホのブラウザからのアクセスを許可
app.use(cors());
app.use(express.json());

// --- ZKP数学パラメータ ---
const MOD = (2n ** 255n) - 19n;
const g = 5n;
const h = 7n;

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

// 簡易DB（Render無料版は再起動でリセットされますが、テストには十分です）
const serverDB = new Map();
const sessions = new Map();

// --- APIエンドポイント ---

// 1. 登録
app.post('/api/signup', (req, res) => {
    const { username, salt, com } = req.body;
    serverDB.set(username, { salt, com: BigInt(com) });
    console.log(`User registered: ${username}`);
    res.json({ status: "success" });
});

// 2. 認証開始 (Challenge)
app.post('/api/login/challenge', (req, res) => {
    const { username, t } = req.body;
    const user = serverDB.get(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const e = BigInt(Math.floor(Math.random() * 1000000));
    sessions.set(username, { t: BigInt(t), e });

    res.json({ salt: user.salt, e: e.toString() });
});

// 3. 最終検証 (Verify)
app.post('/api/login/verify', (req, res) => {
    const { username, s_v, s_r } = req.body;
    const user = serverDB.get(username);
    const session = sessions.get(username);

    if (!user || !session) return res.status(400).json({ error: "Invalid session" });

    const lhs = (modPow(g, BigInt(s_v), MOD) * modPow(h, BigInt(s_r), MOD)) % MOD;
    const rhs = (session.t * modPow(user.com, session.e, MOD)) % MOD;

    const success = (lhs === rhs);
    sessions.delete(username);
    res.json({ success });
});

// --- 重要：Render用のポート設定 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
