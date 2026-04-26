const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- 数学的パラメータ（デモコードと共通） ---
const MOD = (2n ** 255n) - 19n;
const ORDER = MOD - 1n;
const g = 5n;
const h = 7n;

// (base^exp) mod mod
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

// --- サーバー内「DB」と「セッション」 ---
const serverDB = new Map(); // { username: { salt, com } }
const sessions = new Map(); // 認証途中の一時データ保存

// --- API エンドポイント ---

// [0] 登録: クライアントが計算した com (南京錠) を保存するだけ
app.post('/api/signup', (req, res) => {
    const { username, salt, com } = req.body;
    // サーバーは r を知らない。com (BigInt) は文字列で届くので BigInt() で戻す
    serverDB.set(username, { 
        salt: salt, 
        com: BigInt(com) 
    });
    console.log(`[Signup] Registered: ${username}`);
    res.json({ status: "ok" });
});

// [1] 認証開始 (Challenge): クライアントから t を受け取り e を返す
app.post('/api/login/challenge', (req, res) => {
    const { username, t } = req.body;
    const user = serverDB.get(username);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    // サーバーがランダムな質問 e を生成
    const e = BigInt(Math.floor(Math.random() * 1000000000)); // 本来はもっと巨大な乱数
    
    // 検証のために t と e を一時保存
    sessions.set(username, { t: BigInt(t), e: e });

    res.json({ 
        salt: user.salt, 
        e: e.toString() 
    });
});

// [2] 最終検証 (Verify): クライアントの回答 s_v, s_r をチェック
app.post('/api/login/verify', (req, res) => {
    const { username, s_v, s_r } = req.body;
    const user = serverDB.get(username);
    const session = sessions.get(username);

    if (!user || !session) return res.status(400).json({ error: "Invalid session" });

    const { t, e } = session;
    const { com } = user;

    // --- ZKP 検証ロジック ---
    // LHS = (g^s_v * h^s_r) mod MOD
    const lhs = (modPow(g, BigInt(s_v), MOD) * modPow(h, BigInt(s_r), MOD)) % MOD;
    // RHS = (t * com^e) mod MOD
    const rhs = (t * modPow(com, e, MOD)) % MOD;

    const isOk = (lhs === rhs);
    
    // 使い終わったセッションは削除
    sessions.delete(username);

    console.log(`[Login] ${username}: ${isOk ? "SUCCESS" : "FAIL"}`);
    res.json({ success: isOk });
});

app.listen(3000, () => console.log('ZKP Server running on http://localhost:3000'));
