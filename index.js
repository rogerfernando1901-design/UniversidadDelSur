const path = require('path');
const express = require('express');

const app = express();
const puerto = 3000;

app.use('/CSS', express.static(path.join(__dirname, 'CSS')));
app.use('/Java', express.static(path.join(__dirname, 'Java')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Paginas', 'Pagina_principal.html'));
});

app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
