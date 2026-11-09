import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

// Este handler recibe una petición HTTP (req) y construye una respuesta (res).
// El método HTTP y los datos de la petición determinan la operación CRUD.
export default async function handler(req, res) {
  try {
    // En entornos como funciones serverless, reutiliza una conexión ya abierta
    // y crea una nueva solo cuando Mongoose indica que está desconectado.
    // readyState === 0 significa "desconectado"; await espera a que la conexión
    // termine antes de intentar consultar o modificar la colección.
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // El método HTTP indica la operación CRUD que solicita el cliente.
    const { method } = req;

    // En los if de abajo, algunos cuerpos tienen una sola instrucción y por eso
    // se omiten las llaves: en JavaScript son opcionales en ese caso. No cambia
    // la lógica; se usa la forma corta para asignaciones simples. Si se agregan
    // más instrucciones, deben añadirse llaves (y también ayudan a evitar
    // errores al editar), como se hace en los bloques GET, POST y PATCH.
    //
    // Cada return envía la respuesta y termina el handler en ese punto, evitando
    // que el código continúe y trate de responder dos veces a la misma petición.

    // =========================================================================
    // GET (READ): Consultar con soporte para operadores ($regex, $exists, filtros)
    // =========================================================================
    if (method === "GET") {
      // req.query contiene los parámetros de la URL, por ejemplo:
      // /api/tickets?estado=abierto. El filtro empieza vacío, así que si no
      // llega ningún parámetro, Ticket.find({}) devuelve todos los tickets.
      const { prioridad, estado, buscar, sinAsignar } = req.query;
      const filtro = {};

      // Solo se añade cada condición si su parámetro está presente.
      // Estas asignaciones son ejemplos de if de una sola instrucción:
      // la instrucción inmediatamente posterior al if es la única condicionada.
      if (prioridad) filtro.prioridad = prioridad;
      if (estado) filtro.estado = estado;
      if (buscar) {
        // $regex busca el texto dentro del título y la opción "i" ignora
        // diferencias entre mayúsculas y minúsculas.
        filtro.titulo = { $regex: buscar, $options: "i" };
      }
      if (sinAsignar === "true") {
        // Los parámetros de query llegan como texto. Se compara con "true"
        // y $exists: false selecciona documentos sin ese campo guardado.
        filtro.agenteAsignado = { $exists: false };
      }

      // sort({ createdAt: -1 }) ordena de más reciente a más antiguo.
      // Se devuelve tanto el total encontrado como los documentos.
      const tickets = await Ticket.find(filtro).sort({ createdAt: -1 });
      return res.status(200).json({ total: tickets.length, datos: tickets });
    }

    // =========================================================================
    // POST (CREATE): Crear un nuevo ticket
    // =========================================================================
    if (method === "POST") {
      // req.body contiene los datos enviados por el cliente (normalmente JSON).
      // create valida y guarda el nuevo documento usando el Schema de Mongoose.
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
      // PATCH modifica parte del recurso, a diferencia de reemplazarlo entero.
      // El identificador se recibe en la URL y los cambios, en req.body.
      const { codigo } = req.query;
      const { estado, agenteAsignado, sumarHoras, nuevaEtiqueta } = req.body;

      // Sin código no se puede saber qué ticket actualizar.
      if (!codigo) {
        return res
          .status(400)
          .json({ error: "Debes indicar ?codigo=BUG-XXX en la URL" });
      }

      // Los operadores de actualización expresan qué cambios hacer sin sustituir
      // el documento entero: $set asigna campos, $inc suma y $push agrega al array.
      // Se inicializa $set y se incorporan solo los cambios que se solicitaron.
      const actualizacion = { $set: {} };

      // Aquí se omiten las llaves porque cada if controla una única asignación.
      // La condición usa truthiness: si el valor es vacío/ausente, no se añade.
      if (estado) actualizacion.$set.estado = estado;
      if (agenteAsignado) actualizacion.$set.agenteAsignado = agenteAsignado;

      // sumarHoras llega desde el cuerpo de la petición; Number lo convierte
      // antes de usar $inc, que incrementa el valor existente en la base de datos.
      if (sumarHoras)
        actualizacion.$inc = { horasInvertidas: Number(sumarHoras) };

      // $push añade un elemento al final del array etiquetas.
      if (nuevaEtiqueta) actualizacion.$push = { etiquetas: nuevaEtiqueta };

      const ticketModificado = await Ticket.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        actualizacion,
        // new devuelve el documento actualizado; runValidators vuelve a aplicar
        // las validaciones del Schema a los valores modificados.
        { new: true, runValidators: true },
      );

      // Se normaliza el código para que la búsqueda no dependa de mayúsculas.
      // Si no hay coincidencia, findOneAndUpdate devuelve null.
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

      // Se exige un identificador concreto; sin él no se realiza la eliminación.
      if (!codigo) {
        return res
          .status(400)
          .json({ error: "Debes indicar ?codigo=BUG-XXX en la URL" });
      }

      // Busca por código y elimina el documento coincidente en una sola operación.
      const eliminado = await Ticket.findOneAndDelete({
        codigo: codigo.toUpperCase(),
      });

      // findOneAndDelete devuelve null si no encontró ningún ticket con ese código.
      if (!eliminado) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      return res.status(200).json({
        mensaje: "Ticket eliminado permanentemente",
        ticketEliminado: eliminado,
      });
    }

    // Si method no coincide con GET, POST, PATCH o DELETE, la ruta no admite
    // esa operación. 405 significa "Method Not Allowed".
    return res.status(405).json({ error: `Método ${method} no permitido` });
  } catch (error) {
    // Los errores de conexión, validación o consulta llegan aquí. Se responde
    // con JSON; detalle ayuda a diagnosticar el problema durante la práctica.
    return res.status(400).json({
      error: "Error en la operación CRUD",
      detalle: error.message,
    });
  }
}
