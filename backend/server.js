const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "https://login-page-frontend-qp6d.vercel.app"
}));
app.use(bodyParser.json());

// In-memory "DB"
const users = new Map();

app.post("/api/signup", (req, res) => {
  const { name, email, pw } = req.body;
  if (users.has(email)) {
    return res.status(409).json({ message: "이미 가입된 이메일입니다." });
  }
  users.set(email, { name, pw });
  res.status(201).json({ message: "회원가입 성공" });
});

app.post("/api/login", (req, res) => {
  const { email, pw } = req.body;
  const user = users.get(email);
  if (!user || user.pw !== pw) {
    return res.status(401).json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
  }
  const fakeToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");
  res.json({ message: "로그인 성공", token: fakeToken, name: user.name });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
