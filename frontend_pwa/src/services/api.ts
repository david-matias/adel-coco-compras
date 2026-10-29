
/** Configuração e cliente único da API de compras. */
const API_URL = (import.meta.env.VITE_GAS_API_URL || '').trim();

export function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      'API não configurada. Defina VITE_GAS_API_URL no arquivo .env.local.'
    );
  }

  return API_URL;
}

export async function apiGet<T>(
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(getApiUrl());

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao consultar a API.`);
  }

  const body = await response.json() as T & {
    status?: string;
    error?: { message?: string };
  };

  if (body.status === 'error') {
    throw new Error(
      body.error?.message || 'A API rejeitou a consulta.'
    );
  }

  return body;
}

export async function apiPost<T>(
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao gravar na API.`);
  }

  const body = await response.json() as T & {
    status?: string;
    error?: { message?: string };
  };

  if (body.status !== 'success') {
    throw new Error(
      body.error?.message || 'A API não confirmou a gravação.'
    );
  }

  return body;
}
