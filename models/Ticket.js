import mongoose from "mongoose";

// Un Schema describe la forma de los documentos Ticket y las reglas que
// Mongoose debe aplicar al crear o actualizar sus campos.
const ticketSchema = new mongoose.Schema(
  {
    // Identificador legible obligatorio. trim quita espacios de los extremos
    // y uppercase lo convierte a mayúsculas al guardar.
    // unique solicita un índice único en MongoDB (no es un validador de Mongoose).
    codigo: {
      type: String,
      required: [true, "El código del ticket es obligatorio"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Título obligatorio, sin espacios en los extremos y con longitud mínima.
    // minlength es una validación: un valor que no la cumpla no se guarda.
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
      minlength: [5, "El título debe tener al menos 5 caracteres"],
    },
    // enum restringe los valores aceptados; default se usa cuando no se indica
    // una prioridad al crear el documento. required impide omitir el campo.
    prioridad: {
      type: String,
      required: true,
      enum: {
        values: ["Baja", "Media", "Alta", "Crítica"],
        message: "{VALUE} no es una prioridad válida",
      },
      default: "Media",
    },
    // Estado del ciclo de vida del ticket, limitado a las opciones permitidas.
    // Su valor inicial es "Abierto" si quien crea el ticket no especifica otro.
    estado: {
      type: String,
      required: true,
      enum: ["Abierto", "En Progreso", "Resuelto", "Cerrado"],
      default: "Abierto",
    },
    agenteAsignado: {
      type: String,
      trim: true,
      // Es opcional: un ticket recién creado puede no tener agente aún.
    },
    // Si no se especifican horas, empieza en cero; min impide valores negativos.
    horasInvertidas: {
      type: Number,
      default: 0,
      min: [0, "Las horas no pueden ser negativas"],
    },
    // Array de etiquetas de texto; cada documento empieza con una lista vacía.
    etiquetas: {
      type: [String],
      default: [],
    },
  },
  {
    // Mongoose añade y mantiene createdAt y updatedAt automáticamente.
    // El Schema se pasa como primer argumento; las opciones generales van en
    // el segundo argumento, separadas por una coma.
    timestamps: true,
  },
);

// En servidores que recargan módulos, reutiliza el modelo ya registrado para
// evitar el error de intentar compilar dos veces el mismo modelo.
const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

// Exporta el modelo para que la API y el laboratorio puedan consultar y modificar
// documentos de la colección asociada a Ticket.
export default Ticket;
