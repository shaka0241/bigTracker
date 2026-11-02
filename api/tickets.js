import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

// Función de servidor sin estado persistente: cada petición HTTP pasa por aquí
// y la respuesta se construye según el método y los parámetros recibidos.
export default async function handler(req, res) {
  try {
    // En entornos como funciones serverless, reutiliza una conexión ya abierta
    // y crea una nueva solo cuando Mongoose indica que está desconectado.
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // El método HTTP indica la operación CRUD que solicita el cliente.
    const { method } = req;

    // =========================================================================
    // GET (READ): Consultar con soporte para operadores ($regex, $exists, filtros)
    // =========================================================================
    if (method === "GET") {
      // Construye un filtro con los parámetros opcionales de la URL. Si no se
      // envía ninguno, el objeto vacío hace que se consulten todos los tickets.
      const { prioridad, estado, buscar, sinAsignar } = req.query;
      const filtro = {};

      if (prioridad) filtro.prioridad = prioridad;
      if (estado) filtro.estado = estado;
      if (buscar) {
        // La opción "i" permite encontrar coincidencias sin distinguir
        // mayúsculas y minúsculas.
        filtro.titulo = { $regex: buscar, $options: "i" };
      }
      if (sinAsignar === "true") {
        // Busca documentos en los que agenteAsignado no está guardado.
        filtro.agenteAsignado = { $exists: false };
      }

      // Ordena por fecha de creación descendente (más recientes primero) y
      // devuelve un contador junto con la lista de documentos.
      const tickets = await Ticket.find(filtro).sort({ createdAt: -1 });
      return res.status(200).json({ total: tickets.length, datos: tickets });
    }

    // =========================================================================
    // POST (CREATE): Crear un nuevo ticket
    // =========================================================================
    if (method === "POST") {
      // Crea un documento con los datos JSON del cuerpo de la petición.
      // El Schema de Mongoose aplica aquí sus tipos, valores por defecto y reglas.
      const nuevoTicket = await Ticket.create(req.body);
      return res.status(201).json({
        mensaje: "Ticket creado con éxito",
        ticket: nuevoTicket,
      });
    }

    // =========================================================================
    // PATCH (UPDATE): Actualizar estado, agente o sumar horas por código (?codigo=BUG-101)
    // =========================================================================
    if (method === "PATCH") {
      // PATCH modifica parcialmente un recurso: solo se aplicarán los campos
      // recibidos en el cuerpo, identificando el ticket mediante ?codigo=...
      const { codigo } = req.query;
      const { estado, agenteAsignado, sumarHoras, nuevaEtiqueta } = req.body;

      // Sin código no hay forma de identificar qué documento actualizar.
      if (!codigo) {
        return res
          .status(400)
          .json({ error: "Debes indicar ?codigo=BUG-XXX en la URL" });
      }

      // Los operadores de actualización expresan qué cambios hacer sin sustituir
      // el documento entero: $set asigna campos, $inc suma y $push agrega al array.
      const actualizacion = { $set: {} };
      if (estado) actualizacion.$set.estado = estado;
      if (agenteAsignado) actualizacion.$set.agenteAsignado = agenteAsignado;
      if (sumarHoras)
        actualizacion.$inc = { horasInvertidas: Number(sumarHoras) };
      if (nuevaEtiqueta) actualizacion.$push = { etiquetas: nuevaEtiqueta };

      const ticketModificado = await Ticket.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        actualizacion,
        // new devuelve el documento actualizado; runValidators vuelve a aplicar
        // las validaciones del Schema a los valores modificados.
        { new: true, runValidators: true },
      );

      // Un resultado nulo significa que el código no corresponde a ningún ticket.
      if (!ticketModificado) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      return res.status(200).json({
        mensaje: "Ticket actualizado",
        ticket: ticketModificado,
      });
    }

    // =========================================================================
    // DELETE (DELETE): Eliminar un ticket por su código (?codigo=BUG-105)
    // =========================================================================
    if (method === "DELETE") {
      const { codigo } = req.query;
      // Se exige el código para evitar intentar borrar sin un criterio concreto.
      if (!codigo) {
        return res
          .status(400)
          .json({ error: "Debes indicar ?codigo=BUG-XXX en la URL" });
      }

      const eliminado = await Ticket.findOneAndDelete({
        codigo: codigo.toUpperCase(),
      });
      // findOneAndDelete devuelve null cuando no existe ningún documento coincidente.
      if (!eliminado) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      return res.status(200).json({
        mensaje: "Ticket eliminado permanentemente",
        ticketEliminado: eliminado,
      });
    }

    // 405 (Method Not Allowed) indica que la ruta existe, pero no admite
    // el método HTTP que ha enviado el cliente.
    return res.status(405).json({ error: `Método ${method} no permitido` });
  } catch (error) {
    // Convierte los errores de conexión, validación u operación en una respuesta
    // JSON; el detalle se incluye para facilitar el diagnóstico durante la práctica.
    return res.status(400).json({
      error: "Error en la operación CRUD",
      detalle: error.message,
    });
  }
}
