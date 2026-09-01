// Fase 7 — Provider de OCR (leitura de chassi/placa nas fotos).
// Interface plugável: troque o mock por Google Vision, AWS Textract etc.

export interface OcrResult {
  ok: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

export interface OcrProvider {
  name: string;
  readText(imageUrl: string): Promise<OcrResult>;
}

export const MockOcrProvider: OcrProvider = {
  name: "mock",
  async readText(): Promise<OcrResult> {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: false, error: "OCR real não configurado (mock)" };
  },
};

export function getOcrProvider(): OcrProvider {
  return MockOcrProvider;
}
