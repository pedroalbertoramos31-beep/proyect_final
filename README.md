# Proyecto-Practica-Express

-- 1. Tabla de Alumnos
CREATE TABLE alumnos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL -- Eliminación lógica
);

-- 2. Tabla de Materias
CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Tabla Intermedia (Relación Alumno - Materia)
CREATE TABLE alumno_materia (
    id SERIAL PRIMARY KEY,
    alumno_id INT NOT NULL,
    materia_id INT NOT NULL,
    CONSTRAINT fk_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    CONSTRAINT fk_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    CONSTRAINT uq_alumno_materia UNIQUE (alumno_id, materia_id) -- Evita duplicar la relación
);


crear carros

{
    "marca": "ohyeah",
    "modelo": "fire",
    "anio": 1000,
    "color": "ohyeah@gmail.com"
}

crear o modificar alumno

{
  "nombre": "María José",
  "apellido": "Gómez Alán",
  "email": "mariajose@email.com"
}

asignar materia a alumno

{
  "alumno_id": 1,
  "materia_id": 2
}

añadir materia

{
  "nombre": "Matemáticas"
}