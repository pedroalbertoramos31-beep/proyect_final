const express = require('express');
const pool = require('./elephant'); 
const connectMongoDB = require("./mondongo"); 
const Vehicle = require("./Vehicle");
const app = express();

app.use(express.json());
connectMongoDB();

// ---------------------------------------------------
// ----------------- FAST CHECKER -----------------
// ---------------------------------------------------

app.get('/', (req, res) => {
  res.send('Todo al 100 maquina!');
});

// ---------------------------------------------------
// ----------------- VEHICLE (MONGO) -----------------
// ---------------------------------------------------

app.get("/Vehicle", async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.status(200).json({
      message: "Vehículos consultados correctamente",
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al consultar vehículos",
      error: error.message
    });
  }
});

app.post("/Vehicle", async (req, res) => {
  try {
    const { marca, modelo, anio, color } = req.body; 

    if (!marca || !modelo || !anio || !color) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }
    if (isNaN(anio)) return res.status(400).json({ message: "El año debe ser numérico" });

    const nuevoVehicle = new Vehicle({ marca, modelo, anio, color });
    await nuevoVehicle.save();

    res.status(201).json({ message: "Vehículo creado correctamente", data: nuevoVehicle });
  } catch (error) {
    res.status(500).json({ message: "Error al crear vehículo", error: error.message });
  }
});


// ---------------------------------------------------
// ----------------- ALUMNOS (POSTGRES) --------------
// ---------------------------------------------------

// 1. Consultar todos los alumnos activos
app.get('/getAlumnos', async (req, res) => {
    try {
        const query = 'SELECT id, nombre, apellido, email FROM alumnos WHERE is_active = true';
        const result = await pool.query(query);

        return res.status(200).json({
            message: "Alumnos activos obtenidos correctamente",
            data: result.rows
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor: " + error.message });
    }
});

// 2. Consultar alumno por ID
app.get('/getAlumnoById/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "El ID del alumno es obligatorio y debe ser numérico" });
    }

    try {
        const query = 'SELECT id, nombre, apellido, email FROM alumnos WHERE id = $1 AND is_active = true';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Alumno no encontrado o inactivo" });
        }

        return res.status(200).json({
            message: "Alumno encontrado correctamente",
            data: result.rows[0]
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 3. Buscar alumno por nombre o apellido
app.get('/searchAlumno', async (req, res) => {
    const { query: searchTerm } = req.query;

    if (!searchTerm || searchTerm.trim() === "") {
        return res.status(400).json({ message: "El parámetro de búsqueda 'query' es obligatorio y no puede estar vacío" });
    }

    try {
        const sqlQuery = `
            SELECT id, nombre, apellido, email 
            FROM alumnos 
            WHERE (nombre ILIKE $1 OR apellido ILIKE $1) AND is_active = true
        `;
        const values = [`%${searchTerm}%`];
        const result = await pool.query(sqlQuery, values);

        return res.status(200).json({
            message: `Resultados de búsqueda para: ${searchTerm}`,
            data: result.rows
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 4. Crear alumno
app.post('/createAlumno', async (req, res) => {
    const { nombre, apellido, email } = req.body;

    if (!nombre || nombre.trim() === "" || !apellido || apellido.trim() === "" || !email || email.trim() === "") {
        return res.status(400).json({ message: "Todos los campos (nombre, apellido, email) son obligatorios" });
    }

    try {
        const query = 'INSERT INTO alumnos (nombre, apellido, email) VALUES ($1, $2, $3) RETURNING id, nombre, apellido, email';
        const result = await pool.query(query, [nombre, apellido, email]);

        return res.status(201).json({
            message: "Alumno creado correctamente",
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: "El email ya se encuentra registrado" });
        }
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 5. Modificar alumno
app.put('/updateAlumno/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, email } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "El ID del alumno debe ser numérico" });
    }

    if (!nombre || nombre.trim() === "" || !apellido || apellido.trim() === "" || !email || email.trim() === "") {
        return res.status(400).json({ message: "Los datos a modificar no pueden venir vacíos" });
    }

    try {
        const checkQuery = 'SELECT id FROM alumnos WHERE id = $1 AND is_active = true';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: "El alumno no existe o está inactivo" });
        }

        const updateQuery = 'UPDATE alumnos SET nombre = $1, apellido = $2, email = $3 WHERE id = $4 RETURNING id, nombre, apellido, email';
        const result = await pool.query(updateQuery, [nombre, apellido, email, id]);

        return res.status(200).json({
            message: "Alumno modificado correctamente",
            data: result.rows[0]
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 6. Eliminar alumno de manera lógica
app.delete('/deleteAlumno/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "El ID del alumno debe ser numérico" });
    }

    try {
        const checkQuery = 'SELECT id FROM alumnos WHERE id = $1 AND is_active = true';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: "El alumno no existe o ya ha sido eliminado" });
        }

        const deleteQuery = 'UPDATE alumnos SET is_active = false WHERE id = $1';
        await pool.query(deleteQuery, [id]);

        return res.status(200).json({
            message: "Alumno eliminado correctamente (Baja lógica)",
            data: { id }
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});


// ---------------------------------------------------
// ----------------- MATERIAS (POSTGRES) -------------
// ---------------------------------------------------

// 1. Consultar todas las materias
app.get('/getMaterias', async (req, res) => {
    try {
        const query = 'SELECT * FROM materias';
        const result = await pool.query(query);

        return res.status(200).json({
            message: "Materias obtenidas correctamente",
            data: result.rows
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 2. Crear materia
app.post('/createMateria', async (req, res) => {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ message: "El nombre de la materia es obligatorio" });
    }

    try {
        const query = 'INSERT INTO materias (nombre) VALUES ($1) RETURNING *';
        const result = await pool.query(query, [nombre]);

        return res.status(201).json({
            message: "Materia creada correctamente",
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: "Esta materia ya existe registrada" });
        }
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});


// ---------------------------------------------------
// ----------------- RELACIÓN ALUMNO-MATERIA ---------
// ---------------------------------------------------

// 1. Relacionar alumno con materia
app.post('/assignMateriaToAlumno', async (req, res) => {
    const { alumno_id, materia_id } = req.body;

    if (!alumno_id || isNaN(alumno_id) || !materia_id || isNaN(materia_id)) {
        return res.status(400).json({ message: "Los campos 'alumno_id' y 'materia_id' son obligatorios y deben ser numéricos" });
    }

    try {
        const studentCheck = await pool.query('SELECT id FROM alumnos WHERE id = $1 AND is_active = true', [alumno_id]);
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: "El alumno no existe o está inactivo" });
        }

        const subjectCheck = await pool.query('SELECT id FROM materias WHERE id = $1', [materia_id]);
        if (subjectCheck.rows.length === 0) {
            return res.status(404).json({ message: "La materia especificada no existe" });
        }

        const relationCheck = await pool.query('SELECT id FROM alumno_materia WHERE alumno_id = $1 AND materia_id = $2', [alumno_id, materia_id]);
        if (relationCheck.rows.length > 0) {
            return res.status(400).json({ message: "El alumno ya tiene asignada esta materia" });
        }

        const insertQuery = 'INSERT INTO alumno_materia (alumno_id, materia_id) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(insertQuery, [alumno_id, materia_id]);

        return res.status(201).json({
            message: "Materia asignada al alumno correctamente",
            data: result.rows[0]
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 2. Consultar materias relacionadas a un alumno
app.get('/getMateriasByAlumnoId/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "El ID del alumno debe ser numérico" });
    }

    try {
        const studentCheck = await pool.query('SELECT id FROM alumnos WHERE id = $1 AND is_active = true', [id]);
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: "El alumno no existe o está inactivo" });
        }

        const query = `
            SELECT m.id, m.nombre 
            FROM materias m
            INNER JOIN alumno_materia am ON m.id = am.materia_id
            WHERE am.alumno_id = $1
        `;
        const result = await pool.query(query, [id]);

        return res.status(200).json({
            message: "Materias asignadas encontradas correctamente",
            data: result.rows
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// 3. Consultar cuántas materias tiene un alumno
app.get('/getMateriasCountByAlumnoId/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "El ID del alumno debe ser numérico" });
    }

    try {
        const studentCheck = await pool.query('SELECT id FROM alumnos WHERE id = $1 AND is_active = true', [id]);
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: "El alumno no existe o está inactivo" });
        }

        const query = 'SELECT COUNT(*)::INT AS total_materias FROM alumno_materia WHERE alumno_id = $1';
        const result = await pool.query(query, [id]);

        return res.status(200).json({
            message: "Conteo de materias realizado con éxito",
            data: {
                total_materias: result.rows[0].total_materias
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});


// ---------------------------------------------------
// -------------- ARRANCAR SERVIDOR ------------------
// ---------------------------------------------------
// NOTA: Movido al final para asegurar el mapeo de todas las rutas previas
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});