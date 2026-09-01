// Fase 4 — Provider de consulta veicular.
// Interface plugável: troque MockVehicleQueryProvider por um provider real
// (Infosimples, Checktudo, etc.) sem alterar o worker nem a UI.

export interface VehicleQueryResult {
  ok: boolean;
  data?: {
    placa: string;
    chassi: string;
    marca: string;
    modelo: string;
    ano_fabricacao: string;
    ano_modelo: string;
    cor: string;
    municipio: string;
    uf: string;
    situacao: string;
    restricoes: string[];
    historico: { data: string; evento: string }[];
  };
  error?: string;
}

export interface VehicleQueryProvider {
  name: string;
  query(placa: string): Promise<VehicleQueryResult>;
}

// Mock: simula latência real e ~30% de falha transitória (webservice instável),
// exatamente o cenário do gargalo da Fase 4 — para exercitar o retry.
export const MockVehicleQueryProvider: VehicleQueryProvider = {
  name: "mock",
  async query(placa: string): Promise<VehicleQueryResult> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
    if (Math.random() < 0.3) {
      return { ok: false, error: "Timeout no webservice externo (simulado)" };
    }
    const seed = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return {
      ok: true,
      data: {
        placa: seed,
        chassi: `9BW${seed.padEnd(6, "X").slice(0, 6)}J1234567`.slice(0, 17),
        marca: "VOLKSWAGEN",
        modelo: "GOL 1.6 MSI",
        ano_fabricacao: "2021",
        ano_modelo: "2022",
        cor: "PRATA",
        municipio: "FORTALEZA",
        uf: "CE",
        situacao: "SEM RESTRICAO",
        restricoes: [],
        historico: [
          { data: "2022-01-15", evento: "Primeiro emplacamento" },
          { data: "2024-06-10", evento: "Transferência de propriedade" },
        ],
      },
    };
  },
};

export function getVehicleQueryProvider(): VehicleQueryProvider {
  return MockVehicleQueryProvider;
}
