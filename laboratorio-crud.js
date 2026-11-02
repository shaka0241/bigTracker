// Mongoose proporciona el cliente y los modelos de MongoDB; dotenv carga
// las variables de entorno (por ejemplo, MONGODB_URI) desde el archivo .env.
import mongoose from "mongoose";
import dotenv from "dotenv";
import Ticket from "./models/Ticket.js";

dotenv.config();

// Ejecuta la práctica completa en orden: conecta, prepara datos de ejemplo,
// demuestra las operaciones CRUD y finalmente cierra la conexión.
async function ejecutarCicloCRUD() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado a MongoDB Atlas (bugtracker_db)\n");

    // Vacía la colección antes de insertar los ejemplos para que cada ejecución
    // empiece con los mismos datos. Atención: también elimina tickets previos.
    await Ticket.deleteMany({});

    // =========================================================================
    // 1. CREATE (Crear documentos)
    // =========================================================================
    console.log("--- 1. FASE CREATE: Insertando tickets iniciales ---");
    // insertMany crea varios documentos en una sola operación y devuelve los
    // documentos creados, que aquí se usan para informar cuántos se insertaron.
    const ticketsCreados = await Ticket.insertMany([
      {
        codigo: "BUG-101",
        titulo: "Pasarela de pago lanza error 500 con tarjetas Visa",
        prioridad: "Crítica",
        estado: "Abierto",
        etiquetas: ["pagos", "backend", "produccion"],
      },
      {
        codigo: "BUG-102",
        titulo: "El botón de login se desalinea en pantallas móviles",
        prioridad: "Baja",
        estado: "En Progreso",
        agenteAsignado: "Sofía Castro",
        horasInvertidas: 2,
        etiquetas: ["ui", "css", "movil"],
      },
      {
        codigo: "BUG-103",
        titulo: "Fuga de memoria en el servidor de WebSockets",
        prioridad: "Alta",
        estado: "En Progreso",
        agenteAsignado: "Marcos Vega",
        horasInvertidas: 5,
        etiquetas: ["backend", "rendimiento", "produccion"],
      },
      {
        codigo: "BUG-104",
        titulo: "Error tipográfico en el pie de página de contacto",
        prioridad: "Baja",
        estado: "Resuelto",
        agenteAsignado: "Sofía Castro",
        horasInvertidas: 1,
        etiquetas: ["ui", "texto"],
      },
      {
        codigo: "BUG-105",
        titulo: "Lentitud al exportar reportes en PDF desde el panel",
        prioridad: "Media",
        estado: "Abierto",
        etiquetas: ["backend", "reportes"],
      },
    ]);
    console.log(`Se crearon ${ticketsCreados.length} tickets en Atlas.\n`);

    // =========================================================================
    // 2. READ (Consultas con Operadores de MongoDB)
    // =========================================================================
    console.log("--- 2. FASE READ: Consultas con operadores avanzados ---");

    // A) $or devuelve documentos que cumplan al menos una condición: prioridad
    // crítica o más de cuatro horas. select limita los campos de la respuesta;
    // el signo menos delante de _id excluye ese campo.
    const urgentesOComplejos = await Ticket.find({
      $or: [{ prioridad: "Crítica" }, { horasInvertidas: { $gt: 4 } }],
    }).select("codigo titulo prioridad horasInvertidas -_id");
    console.log("A) Críticos o con >4 horas ($or):", urgentesOComplejos);

    // B) $exists: false busca documentos donde la propiedad no existe.
    // No equivale necesariamente a buscar una propiedad guardada como null.
    const sinAgente = await Ticket.find({
      agenteAsignado: { $exists: false },
    }).select("codigo titulo estado -_id");
    console.log(
      "\nB) Tickets sin agente asignado ($exists: false):",
      sinAgente,
    );

    // C) $all exige que el array etiquetas contenga los dos valores indicados;
    // los documentos pueden tener además otras etiquetas.
    const backendProd = await Ticket.find({
      etiquetas: { $all: ["backend", "produccion"] },
    }).select("codigo etiquetas -_id");
    console.log(
      "\nC) Tickets con tags backend Y produccion ($all):",
      backendProd,
    );

    // D) $regex busca cualquiera de las palabras alternativas en titulo;
    // $options: "i" hace que la búsqueda no distinga mayúsculas de minúsculas.
    const busquedaTexto = await Ticket.find({
      titulo: { $regex: "pago|login", $options: "i" },
    }).select("codigo titulo -_id");
    console.log("\nD) Búsqueda de texto con $regex:", busquedaTexto);

    // =========================================================================
    // 3. UPDATE (Actualización individual, atómica y masiva)
    // =========================================================================
    console.log("\n--- 3. FASE UPDATE: Modificando documentos ---");

    // A) findOneAndUpdate localiza un ticket y lo modifica en una sola operación.
    // $set reemplaza valores concretos, $inc suma al número existente y $push
    // añade un elemento al array. Así se conservan los demás campos del ticket.
    const ticketActualizado = await Ticket.findOneAndUpdate(
      { codigo: "BUG-101" },
      {
        $set: { agenteAsignado: "Marcos Vega", estado: "En Progreso" },
        $inc: { horasInvertidas: 3 },
        $push: { etiquetas: "parche-urgente" },
      },
      { new: true, runValidators: true }, // Devuelve el nuevo y ejecuta validadores del Schema
    );
    console.log("A) BUG-101 actualizado:", {
      codigo: ticketActualizado.codigo,
      agente: ticketActualizado.agenteAsignado,
      estado: ticketActualizado.estado,
      horas: ticketActualizado.horasInvertidas,
      etiquetas: ticketActualizado.etiquetas,
    });

    // B) updateMany aplica el mismo cambio a todos los documentos que coincidan
    // con el filtro. modifiedCount informa cuántos cambiaron realmente.
    const resultadoMasivo = await Ticket.updateMany(
      { agenteAsignado: { $exists: false } },
      { $set: { agenteAsignado: "Guardia Nivel 1" } },
    );
    console.log(
      `B) Actualización masiva completada: ${resultadoMasivo.modifiedCount} tickets asignados a Guardia Nivel 1.`,
    );

    // =========================================================================
    // 4. DELETE (Borrado individual y por filtro)
    // =========================================================================
    console.log("\n--- 4. FASE DELETE: Eliminando documentos ---");

    // A) findOneAndDelete elimina el primer documento que coincide y lo devuelve,
    // lo que permite mostrar sus datos después del borrado.
    const ticketEliminado = await Ticket.findOneAndDelete({
      codigo: "BUG-104",
    });
    console.log(
      `A) Ticket eliminado: [${ticketEliminado.codigo}] - ${ticketEliminado.titulo}`,
    );

    // countDocuments cuenta cuántos documentos siguen en la colección después
    // de las operaciones de esta práctica.
    const totalRestante = await Ticket.countDocuments();
    console.log(
      `Total de tickets activos en la base de datos: ${totalRestante}`,
    );
  } catch (error) {
    // Informa de fallos de conexión o de operaciones de base de datos.
    console.error("Error en el laboratorio CRUD:", error.message);
  } finally {
    // finally se ejecuta tanto si la práctica termina bien como si ocurre un error.
    await mongoose.disconnect();
    console.log("\nDesconectado de MongoDB Atlas");
  }
}

// Inicia la práctica al ejecutar este archivo con Node.js.
ejecutarCicloCRUD();
