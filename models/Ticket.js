import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, "El código del ticket es obligatorio"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
      minlength: [5, "El título debe tener al menos 5 caracteres"],
    },
    prioridad: {
      type: String,
      required: true,
      enum: {
        values: ["Baja", "Media", "Alta", "Crítica"],
        message: "{VALUE} no es una prioridad válida",
      },
      default: "Media",
    },
    estado: {
      type: String,
      required: true,
      enum: ["Abierto", "En Progreso", "Resuelto", "Cerrado"],
      default: "Abierto",
    },
    agenteAsignado: {
      type: String,
      trim: true,
      // Es opcional: un ticket recién creado puede no tener agente aún
    },
    horasInvertidas: {
      type: Number,
      default: 0,
      min: [0, "Las horas no pueden ser negativas"],
    },
    etiquetas: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

export default Ticket;
