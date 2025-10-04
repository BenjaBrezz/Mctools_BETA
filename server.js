const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'datos.json');

// Middleware para parsear JSON en el cuerpo de las peticiones (PUT)
app.use(express.json());

// ====================================================================
// CONFIGURACIÓN DE CORS (Cross-Origin Resource Sharing)
// NECESARIO para que GitHub Pages pueda comunicarse con Render
// ====================================================================
app.use((req, res, next) => {
    // Permitir acceso desde CUALQUIER origen (*)
    res.header('Access-Control-Allow-Origin', '*');

    // Permitir los métodos que usaremos (GET para leer, PUT para actualizar)
    res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');

    // Permitir el encabezado Content-Type (necesario para la petición PUT)
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar la solicitud "preflight" de OPTIONS, necesaria antes del PUT
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ====================================================================
// 1. RUTA DE SALUDO O ESTADO (GET /)
// Responde a la ruta base para evitar el error "Cannot GET /"
// ====================================================================
app.get('/', (req, res) => {
    res.send('Servidor del Asistente de Programación (API) Activo. Use /api/datos para acceder a la base de datos.');
});

// ====================================================================
// 2. RUTA PARA OBTENER TODOS LOS DATOS (GET /api/datos)
// ====================================================================
app.get('/api/datos', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            // Si el archivo no se encuentra, devuelve un array vacío
            return res.status(500).json([]);
        }
        try {
            // Devuelve el JSON parseado (el array de datos)
            res.json(JSON.parse(data));
        } catch (e) {
            console.error("Error al parsear datos.json:", e);
            res.status(500).json([]);
        }
    });
});

// ====================================================================
// 3. RUTA PARA ACTUALIZAR UN SOLO DATO (PUT /api/datos/:id)
// Requiere: { campo: 'nombre' o 'direccion', valor: 'nuevo valor' }
// ====================================================================
app.put('/api/datos/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const { campo, valor } = req.body;

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al leer la base de datos.');
        }

        let datos;
        try {
            datos = JSON.parse(data);
        } catch (e) {
            console.error("Error al parsear JSON:", e);
            return res.status(500).send('Error de formato en la base de datos.');
        }

        // 1. Encontrar el índice del elemento
        const itemIndex = datos.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            return res.status(404).send('Elemento no encontrado.');
        }

        // 2. Validar el campo y el valor a actualizar
        // ¡Se valida que el campo sea 'nombre' o 'direccion' en MINÚSCULA!
        if (!['nombre', 'direccion'].includes(campo)) {
            return res.status(400).send('Campo de actualización inválido.');
        }

        // 3. Aplicar la actualización
        datos[itemIndex][campo] = valor;

        // 4. Escribir el array completo de vuelta al archivo
        fs.writeFile(DATA_FILE, JSON.stringify(datos, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al guardar los datos.');
            }

            // Éxito: devuelve el elemento actualizado (opcional)
            res.json(datos[itemIndex]);
        });
    });
});

// ====================================================================
// INICIO DEL SERVIDOR
// ====================================================================
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});