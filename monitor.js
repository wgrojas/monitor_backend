// monitor.js
const sqlite3 = require("sqlite3").verbose();
const net = require("net");
const axios = require("axios");
const { IPS, PUERTOS_COMUNES } = require("./terminales");

// =============================
// TELEGRAM
// =============================
const TELEGRAM_TOKEN = "8670630365:AAHzwcPtGEI3zgtWSN-evMCrl4GZ8igTjy0";
const CHAT_IDS = ["8626488038", "1234567890"];

async function enviarTelegram(mensaje) {
  try {
    for (const chat_id of CHAT_IDS) {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        { chat_id, text: mensaje, parse_mode: "Markdown" },
      );
    }
  } catch (err) {
    console.error("Error Telegram:", err.message);
  }
}

// =============================
// BASE DE DATOS
// =============================
const db = new sqlite3.Database("./monitor.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      ip TEXT,
      estado TEXT,
      latencia REAL,
      servicios TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

let estadoActual = {};

// =============================
// TCP CHECK
// =============================
function pingTCP(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();
    let terminado = false;

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      if (!terminado) {
        terminado = true;
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ alive: true, latency, port });
      }
    });

    socket.on("timeout", () => {
      if (!terminado) {
        terminado = true;
        socket.destroy();
        resolve({ alive: false, port });
      }
    });

    socket.on("error", () => {
      if (!terminado) {
        terminado = true;
        socket.destroy();
        resolve({ alive: false, port });
      }
    });

    socket.connect(port, host);
  });
}

// =============================
// MONITOR PRINCIPAL
// =============================
const CHECK_INTERVAL = 10000;

async function monitor() {
  for (const nombre in IPS) {
    try {
      let target = IPS[nombre];
      let ip = target;
      let puertoDefinido = null;

      if (target.includes(":")) {
        [ip, puertoDefinido] = target.split(":");
        puertoDefinido = parseInt(puertoDefinido);
      }

      const puertosAProbar = puertoDefinido
        ? [puertoDefinido]
        : PUERTOS_COMUNES;
      const resultados = await Promise.all(
        puertosAProbar.map((p) => pingTCP(ip, p)),
      );

      let estado = "DOWN";
      let latencia = 0;
      let serviciosUp = [];

      if (puertoDefinido) {
        // ⚡ Solo el puerto definido importa
        const res = resultados[0];
        if (res.alive) {
          estado = "UP";
          latencia = res.latency;
          serviciosUp = [res.port];
        }
      } else {
        // ⚡ Caso general: tomar el primero que esté abierto
        const abiertos = resultados.filter((r) => r.alive);
        if (abiertos.length > 0) {
          estado = "UP";
          latencia = abiertos[0].latency;
          serviciosUp = abiertos.map((r) => r.port);
        }
      }

      const key = puertoDefinido ? `${ip}:${puertoDefinido}` : ip;

      // Guardar en BD
      db.run(
        "INSERT INTO logs (nombre, ip, estado, latencia, servicios) VALUES (?, ?, ?, ?, ?)",
        [nombre, key, estado, latencia, serviciosUp.join(",")],
      );

      //   // Enviar Telegram solo si cambia el estado
      //   if (!estadoActual[key] || estadoActual[key] !== estado) {
      //     const emoji = estado === "UP" ? "🟢" : "🔴";
      //     const mensaje = `*${nombre}* - ${ip} ${emoji}  ${latencia} ms`;
      //     await enviarTelegram(mensaje);
      //   }
      // Enviar Telegram solo si cambia el estado
      
      if (!estadoActual[key] || estadoActual[key] !== estado) {
        const emoji = estado === "UP" ? "🟢" : "🔴";

        // Mostrar IP y puerto si existe
        const ipConPuerto = puertoDefinido ? `${ip}:${puertoDefinido}` : ip;

        const mensaje = `*${nombre}* - ${ipConPuerto} ${emoji}  ${latencia} ms`;
        await enviarTelegram(mensaje);
      }

      estadoActual[key] = estado;

      console.log(`${nombre} -> ${estado} (${latencia} ms)`);
    } catch (err) {
      console.error("Error monitoreando:", nombre, err.message);
    }
  }
}

function iniciarMonitor() {
  monitor(); // Ejecutar al inicio
  setInterval(monitor, CHECK_INTERVAL); // Repetir cada 10s
}

module.exports = { iniciarMonitor, db };
