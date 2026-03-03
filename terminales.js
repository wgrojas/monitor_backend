// terminals.js

// =============================
// LISTA DE TERMINALES
// =============================
const IPS = {
  "Terminal Giron canal 1": "181.48.219.230",
  "Terminal Giron canal 2": "181.59.165.246",
  "Bodega Giron canal 1": "186.80.90.57",
  "Bodega Giron canal 2": "181.59.165.246",
  "AP Santacruz": "181.129.185.131:8070",
  "RB San Andres": "181.129.185.131:8071",
  "Terminal Cucuta canal 1": "181.57.129.146",
  "Terminal Cucuta canal 2": "181.63.162.173",
  "RouterBoard casa": "181.131.235.206:8090"

};

// Puertos comunes a probar si no se especifica uno en la IP
const PUERTOS_COMUNES = [80, 443, 8080];

module.exports = { IPS, PUERTOS_COMUNES };