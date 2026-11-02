import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

export default async function handler(req, res) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const { method } = req;

    // =========================================================================
    // GET (READ): Consultar con soporte para operadores ($regex, $exists, filtros)
    // =========================================================================
    if (method === "GET") {
      const { prioridad, estado, buscar, sinAsignar } = req.query;
      const filtro = {};

      if (prioridad) filtro.prioridad = prioridad;
      if (estado) filtro.estado = estado;
      if (buscar) {
        filtro.titulo = { $regex: buscar, $options: "i" };
      }
      if (sinAsignar === "true") {
        filtro.agenteAsignado = { $exists: false };
      }

      const tickets = await Ticket.find(filtro).sort({ createdAt: -1 });
      return res.status(200).json({ total: tickets.length, datos: tickets });
    }

    // =========================================================================
    // POST (CREATE): Crear un nuevo ticket
    // =========================================================================
    if (method === "POST") {
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
      const { codigo } = req.query;
      const { estado, agenteAsignado, sumarHoras, nuevaEtiqueta } = req.body;

      if (!codigo) {
        return res
          .status(400)
          .json({ error: "Debes indicar ?codigo=BUG-XXX en la URL" });
      }

      const actualizacion = { $set: {} };
      if (estado) actualizacion.$set.estado = estado;
      if (agenteAsignado) actualizacion.$set.agenteAsignado = agenteAsignado;
      if (sumarHoras)
        actualizacion.$inc = { horasInvertidas: Number(sumarHoras) };
      if (nuevaEtiqueta) actualizacion.$push = { etiquetas: nuevaEtiqueta };

      const ticketModificado = await Ticket.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        actualizacion,
        { new: true, runValidators: true },
      );

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
      if (!codigo) {
        return res
          .status(400)
          .json({ error: "Debes indicar ?codigo=BUG-XXX en la URL" });
      }

      const eliminado = await Ticket.findOneAndDelete({
        codigo: codigo.toUpperCase(),
      });
      if (!eliminado) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      return res.status(200).json({
        mensaje: "Ticket eliminado permanentemente",
        ticketEliminado: eliminado,
      });
    }

    // Si envían otro método no soportado
    return res.status(405).json({ error: `Método ${method} no permitido` });
  } catch (error) {
    return res.status(400).json({
      error: "Error en la operación CRUD",
      detalle: error.message,
    });
  }
}
