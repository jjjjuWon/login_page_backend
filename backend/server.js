const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://login-page-frontend-qp6d.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "https://login-page-frontend-qp6d.vercel.app",
  credentials: true
}));
app.use(bodyParser.json());

const users = new Map();
const onlineUsers = new Map();
const rooms = new Map();

// 기본 채팅방 생성
rooms.set("general", {
  name: "일반 채팅방",
  users: new Set()
});

// Socket.IO 연결 처리
io.on("connection", (socket) => {
  console.log("사용자 연결됨:", socket.id);

  // 사용자 로그인 처리
  socket.on("user_login", (userData) => {
    onlineUsers.set(socket.id, userData);
    // 기본 채팅방에 참가
    socket.join("general");
    rooms.get("general").users.add(socket.id);
    
    // 모든 채팅방 목록 전송
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      name: room.name,
      userCount: room.users.size
    }));
    io.emit("room_list", roomList);
    
    // 현재 채팅방의 사용자 목록 전송
    io.to("general").emit("user_list", Array.from(rooms.get("general").users).map(id => onlineUsers.get(id)));
  });

  // 채팅방 참가
  socket.on("join_room", (roomId) => {
    // 이전 채팅방에서 나가기
    const currentRoom = Array.from(socket.rooms).find(room => room !== socket.id);
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).users.delete(socket.id);
      socket.leave(currentRoom);
      io.to(currentRoom).emit("user_list", Array.from(rooms.get(currentRoom).users).map(id => onlineUsers.get(id)));
    }

    // 새 채팅방 참가
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        name: roomId,
        users: new Set()
      });
    }
    socket.join(roomId);
    rooms.get(roomId).users.add(socket.id);
    
    // 채팅방 사용자 목록 업데이트
    io.to(roomId).emit("user_list", Array.from(rooms.get(roomId).users).map(id => onlineUsers.get(id)));
    
    // 채팅방 목록 업데이트
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      name: room.name,
      userCount: room.users.size
    }));
    io.emit("room_list", roomList);
  });

  // 메시지 전송
  socket.on("send_message", (messageData) => {
    const roomId = messageData.roomId || "general";
    io.to(roomId).emit("receive_message", {
      ...messageData,
      timestamp: new Date().toISOString()
    });
  });

  // 연결 해제
  socket.on("disconnect", () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      // 모든 채팅방에서 사용자 제거
      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.id)) {
          room.users.delete(socket.id);
          io.to(roomId).emit("user_list", Array.from(room.users).map(id => onlineUsers.get(id)));
        }
      });
      
      onlineUsers.delete(socket.id);
      
      // 채팅방 목록 업데이트
      const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        name: room.name,
        userCount: room.users.size
      }));
      io.emit("room_list", roomList);
    }
    console.log("사용자 연결 해제:", socket.id);
  });
});

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

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
