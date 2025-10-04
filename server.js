// server.js

// Dependencias
const express = require('express');
// Usamos fs/promises para trabajar de forma asíncrona (necesario en un servidor)
const fs = require('fs/promises');
const path = require('path');
const app = express();
// Render asignará un puerto dinámico a través de process.env.PORT
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON en el cuerpo de las peticiones (PUT)
app.use(express.json());

// =================================================================
// MIDDLEWARE DE SEGURIDAD (CORS)
// Necesario para que GitHub Pages pueda hablar con Render
// =================================================================
app.use((req, res, next) => {
    // Permitir acceso desde CUALQUIER origen (*)
    res.header('Access-Control-Allow-Origin', '*');
    // Permitir los métodos HTTP que usaremos
    res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    // Permitir el encabezado Content-Type
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar la petición OPTIONS previa al PUT (solicitud preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});


// Ruta del archivo JSON que funciona como nuestra 'base de datos'
const DATA_FILE = path.join(__dirname, 'datos.json');


// =================================================================
// 1. RUTA GET /api/datos: Leer todos los datos al cargar la app
// =================================================================
app.get('/api/datos', async (req, res) => {
    try {
        // Leer el archivo de forma asíncrona
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error("Error al leer datos:", error);
        // Si el archivo falla o no existe, devolvemos un array vacío para no bloquear el frontend
        res.status(200).json([]);
    }
});


// =================================================================
// 2. RUTA PUT /api/datos/:id: Guardar una corrección
// =================================================================
app.put('/api/datos/:id', async (req, res) => {
    const idToUpdate = parseInt(req.params.id);
    const { campo, valor } = req.body;

    // Validación básica de la entrada
    if (isNaN(idToUpdate) || !campo || typeof valor === 'undefined') {
        return res.status(400).json({ error: 'Datos de entrada inválidos.' });
    }

    try {
        // 1. Leer los datos actuales del archivo
        const dataStr = await fs.readFile(DATA_FILE, 'utf8');
        let datos = JSON.parse(dataStr);

        // 2. Encontrar el elemento por ID
        const itemIndex = datos.findIndex(item => item.id === idToUpdate);

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Elemento no encontrado.' });
        }

        // 3. Aplicar la actualización SÓLO a campos permitidos
        if (['nombre', 'direccion'].includes(campo)) {
            datos[itemIndex][campo] = valor;
        } else {
            return res.status(400).json({ error: `Campo '${campo}' no es editable.` });
        }

        // 4. Escribir los datos actualizados de vuelta al archivo (PERSISTENCIA)
        // Usamos 'null, 2' para formatear el JSON de forma legible
        await fs.writeFile(DATA_FILE, JSON.stringify(datos, null, 2), 'utf8');

        // 5. Confirmar éxito
        res.status(200).json({ mensaje: 'Dato actualizado exitosamente.' });

    } catch (error) {
        console.error("Error al actualizar y escribir datos:", error);
        res.status(500).json({ error: 'Error interno del servidor al guardar.' });
    }
});

// Ruta de "saludo" o estado para confirmar que el servidor está vivo.
app.get('/', (req, res) => {
    res.send('Servidor del Asistente de Programación (API) Activo. Use /api/datos para acceder a los datos.');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto: ${PORT}`);
});