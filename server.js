// server.js
const express = require("express");
const cors = require("cors");
const { iniciarMonitor, db } = require("./monitor");

const app = express();
const PORT = process.env.PORT || 5000;

// =============================
// CORS
// =============================
app.use(cors()); // Permite conexiones desde cualquier frontend
app.use(express.json());
app.use(express.static("public"));

// =============================
// RUTAS
// =============================
app.get("/", (req, res) => {
  res.json({
    sistema: "🖥️ Monitor NOC Profesional",
    estado_servidor: "🟢 ACTIVO",
    hora_colombia: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    mensaje: "Sistema de monitoreo funcionando correctamente"
  });
});

app.get("/estado", (req, res) => {
  db.all(`
    SELECT nombre, ip, estado, servicios
    FROM logs
    WHERE id IN (
      SELECT MAX(id) FROM logs GROUP BY ip
    )
  `, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.get("/latencia/:nombre", (req, res) => {
  db.all(`
    SELECT latencia, timestamp
    FROM logs
    WHERE nombre = ?
    ORDER BY id DESC
    LIMIT 30
  `, [req.params.nombre], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.reverse());
  });
});

// =============================
// LEVANTAR SERVIDOR Y MONITOR
// =============================
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
  iniciarMonitor(); // Ejecutar monitor en segundo plano
});