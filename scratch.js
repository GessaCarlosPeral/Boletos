const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'data/boletos.db'));

db.all("SELECT * FROM lotes WHERE codigo_autorizacion = 'AUTH-2026-0420-2582';", (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(rows);
    if (rows.length > 0) {
      console.log('Intentos descarga:', rows[0].intentos_descarga);
      console.log('Max descargas:', rows[0].max_descargas);
      console.log('Estado:', rows[0].estado_pago);
      console.log('PDF URL:', rows[0].pdf_url);
    }
  }
});
