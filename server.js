const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors()); app.use(express.json());

const MOD = (2n ** 255n) - 19n;
const ORDER = MOD - 1n;
const g = 5n; const h = 7n;

const db = new Map(); // username -> { salt, com, r } を保存
const activeSessions = new Map();

app.post('/api/signup', (req, res) => {
    const { username, salt, com, r } = req.body;
    // 提示コード通り、rもDBに保存
    db.set(username, { salt, com: BigInt(com), r: BigInt(r) });
    res.json({ status: "success" });
});

app.post('/api/login/challenge', (req, res) => {
    const { username, t } = req.body;
    const user = db.get(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 0〜ORDER未満の巨大な乱数eを生成
    const e = BigInt(Math.floor(Math.random() * 1000000000)); 
    activeSessions.set(username, { t: BigInt(t), e, com: user.com, r: user.r });
    res.json({ e: e.toString(), r: user.r.toString(), salt: user.salt });
});

app.post('/api/login/verify', (req, res) => {
    const { username, s_v, s_r } = req.body;
    const s = activeSessions.get(username);
    if (!s) return res.status(400).end();

    const lhs = (modPow(g, BigInt(s_v), MOD) * modPow(h, BigInt(s_r), MOD)) % MOD;
    const rhs = (s.t * modPow(s.com, s.e, MOD)) % MOD;

    res.json({ success: lhs === rhs });
});

function modPow(base, exp, mod) {
    let result = 1n;
    let b = base % mod; let e = exp;
    while (e > 0n) { if (e & 1n) result = (result * b) % mod; b = (b * b) % mod; e >>= 1n; }
    return result;
}

app.listen(process.env.PORT || 3000);
