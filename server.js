import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE_URL = process.env.CHIC_API_URL || "http://localhost:3333/api";

async function api(path, init) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Nao foi possivel falar com o backend.");
  }

  return data;
}

function text(data) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "chic-schedule-mcp",
  version: "1.0.0",
});

server.tool("listar_servicos", "Lista os servicos disponiveis no site.", {}, async () => {
  return text(await api("/services"));
});

server.tool("listar_profissionais", "Lista as profissionais cadastradas.", {}, async () => {
  return text(await api("/professionals"));
});

server.tool("listar_agendamentos", "Lista todos os agendamentos.", {}, async () => {
  return text(await api("/appointments"));
});

server.tool(
  "listar_horarios_disponiveis",
  "Mostra horarios ainda livres para uma data e profissional.",
  {
    data: z.string().describe("Data no formato yyyy-mm-dd."),
    profissionalId: z.string().optional().describe("ID da profissional, se quiser filtrar."),
  },
  async ({ data, profissionalId }) => {
    const horariosPadrao = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    const agendamentos = await api("/appointments");
    const ocupados = agendamentos
      .filter((item) => item.appointment_date === data)
      .filter((item) => !profissionalId || item.professional_id === profissionalId)
      .filter((item) => item.status !== "cancelled")
      .map((item) => item.appointment_time);

    return text({
      data,
      profissionalId: profissionalId || null,
      horarios: horariosPadrao.filter((hora) => !ocupados.includes(hora)),
    });
  }
);

server.tool(
  "criar_agendamento",
  "Cria um novo agendamento no site.",
  {
    nomeCliente: z.string(),
    telefoneCliente: z.string(),
    profissionalId: z.string().nullable().optional(),
    profissionalNome: z.string().optional(),
    data: z.string().describe("Data no formato yyyy-mm-dd."),
    horario: z.string().describe("Horario no formato HH:mm."),
    servicos: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        duration: z.number(),
      })
    ),
    observacoes: z.string().optional(),
  },
  async (input) => {
    const totalPrice = input.servicos.reduce((sum, service) => sum + service.price, 0);
    const totalDuration = input.servicos.reduce((sum, service) => sum + service.duration, 0);

    const appointment = await api("/appointments", {
      method: "POST",
      body: JSON.stringify({
        customer_name: input.nomeCliente,
        customer_phone: input.telefoneCliente,
        professional_id: input.profissionalId || null,
        professional_name: input.profissionalNome || "",
        appointment_date: input.data,
        appointment_time: input.horario,
        services: input.servicos,
        total_price: totalPrice,
        total_duration: totalDuration,
        notes: input.observacoes || "",
      }),
    });

    return text(appointment);
  }
);

server.tool(
  "atualizar_status_agendamento",
  "Atualiza o status de um agendamento.",
  {
    id: z.string(),
    status: z.enum(["pending", "confirmed", "cancelled", "done"]),
  },
  async ({ id, status }) => {
    return text(await api(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
