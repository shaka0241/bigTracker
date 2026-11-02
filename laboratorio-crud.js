import mongoose from "mongoose";
import dotenv from "dotenv";
import Ticket from "./models/Ticket.js";

dotenv.config();

async function ejecutarCicloCRUD() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado a MongoDB Atlas (bugtracker_db)\n");

    // Limpieza inicial para poder repetir la práctica
    await Ticket.deleteMany({});

    // =========================================================================
    // 1. CREATE (Crear documentos)
    // =========================================================================
    console.log("--- 1. FASE CREATE: Insertando tickets iniciales ---");
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

    // A) Operador $or: Tickets Críticos O que tengan más de 4 horas invertidas
    const urgentesOComplejos = await Ticket.find({
      $or: [{ prioridad: "Crítica" }, { horasInvertidas: { $gt: 4 } }],
    }).select("codigo titulo prioridad horasInvertidas -_id");
    console.log("A) Críticos o con >4 horas ($or):", urgentesOComplejos);

    // B) Operador $exists: Tickets huérfanos (sin agenteAsignado)
    const sinAgente = await Ticket.find({
      agenteAsignado: { $exists: false },
    }).select("codigo titulo estado -_id");
    console.log(
      "\nB) Tickets sin agente asignado ($exists: false):",
      sinAgente,
    );

    // C) Operador $all: Tickets que tengan AMBAS etiquetas: 'backend' y 'produccion'
    const backendProd = await Ticket.find({
      etiquetas: { $all: ["backend", "produccion"] },
    }).select("codigo etiquetas -_id");
    console.log(
      "\nC) Tickets con tags backend Y produccion ($all):",
      backendProd,
    );

    // D) Operador $regex: Buscar por palabra clave "pago" o "login" en el título
    const busquedaTexto = await Ticket.find({
      titulo: { $regex: "pago|login", $options: "i" },
    }).select("codigo titulo -_id");
    console.log("\nD) Búsqueda de texto con $regex:", busquedaTexto);

    // =========================================================================
    // 3. UPDATE (Actualización individual, atómica y masiva)
    // =========================================================================
    console.log("\n--- 3. FASE UPDATE: Modificando documentos ---");

    // A) findOneAndUpdate con $set, $inc y $push
    // Asignamos agente al BUG-101, cambiamos estado, sumamos 3 horas y añadimos etiqueta
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

    // B) updateMany: Todos los tickets sin agente pasan a manos de "Soporte Nivel 1"
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

    // A) findOneAndDelete: Borrar el ticket BUG-104 porque ya está resuelto y es de prioridad Baja
    const ticketEliminado = await Ticket.findOneAndDelete({
      codigo: "BUG-104",
    });
    console.log(
      `A) Ticket eliminado: [${ticketEliminado.codigo}] - ${ticketEliminado.titulo}`,
    );

    // Conteo final
    const totalRestante = await Ticket.countDocuments();
    console.log(
      `Total de tickets activos en la base de datos: ${totalRestante}`,
    );
  } catch (error) {
    console.error("Error en el laboratorio CRUD:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nDesconectado de MongoDB Atlas");
  }
}

ejecutarCicloCRUD();
