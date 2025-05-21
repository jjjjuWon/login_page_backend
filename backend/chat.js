const name = localStorage.getItem("name");
document.getElementById("welcome").textContent = `안녕하세요, ${name}님!`;

const ws = new WebSocket("wss://YOUR_RENDER_WS_BACKEND_URL");

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join", name }));
};

ws.onmessage = (event) => {
  const msgBox = document.getElementById("messages");
  const { name, message } = JSON.parse(event.data);
  msgBox.innerHTML += `<p><strong>${name}:</strong> ${message}</p>`;
};

document.getElementById("sendBtn").addEventListener("click", () => {
  const input = document.getElementById("messageInput");
  const message = input.value;
  ws.send(JSON.stringify({ type: "chat", name, message }));
  input.value = "";
});
