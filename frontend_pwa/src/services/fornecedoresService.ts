
import { apiGet } from './api';
import type {
  Fornecedor,
  FornecedoresCache,
  TipoCoco
} from '../types/compra';

const STORAGE_KEY = 'adel_fornecedores_cache';

interface FornecedoresResponse {
  status: string;
  total: number;
  fornecedores: Fornecedor[];
}

export class FornecedoresService {
  static obterCache(): FornecedoresCache | null {
    const dados = localStorage.getItem(STORAGE_KEY);

    if (!dados) return null;

    try {
      const cache = JSON.parse(dados) as FornecedoresCache;

      if (
        !cache.atualizado_em ||
        !Array.isArray(cache.fornecedores)
      ) {
        return null;
      }

      return cache;
    } catch (error) {
      console.error('Cache de fornecedores inválido.', error);
      return null;
    }
  }

  static salvarCache(fornecedores: Fornecedor[]): void {
    const cache: FornecedoresCache = {
      atualizado_em: new Date().toISOString(),
      fornecedores
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }

  static filtrarPorTipo(
    fornecedores: Fornecedor[],
    tipo: TipoCoco
  ): Fornecedor[] {
    return fornecedores.filter(fornecedor => {
      if (fornecedor.status !== 'ATIVO') return false;

      return tipo === 'Coco Verde'
        ? fornecedor.fornece_coco_verde === 'SIM'
        : fornecedor.fornece_coco_seco === 'SIM';
    });
  }

  static async atualizar(): Promise<Fornecedor[]> {
    const resposta = await apiGet<FornecedoresResponse>({
      action: 'LIST_SUPPLIERS'
    });

    if (
      resposta.status !== 'success' ||
      !Array.isArray(resposta.fornecedores)
    ) {
      throw new Error('Resposta inválida ao consultar fornecedores.');
    }

    this.salvarCache(resposta.fornecedores);

    return resposta.fornecedores;
  }

  static async carregar(): Promise<{
    fornecedores: Fornecedor[];
    origem: 'online' | 'cache' | 'vazio';
    atualizado_em: string | null;
  }> {
    try {
      const fornecedores = await this.atualizar();

      return {
        fornecedores,
        origem: 'online',
        atualizado_em: this.obterCache()?.atualizado_em || null
      };
    } catch (error) {
      console.warn(
        'Não foi possível atualizar fornecedores. Tentando cache local.',
        error
      );

      const cache = this.obterCache();

      if (cache) {
        return {
          fornecedores: cache.fornecedores,
          origem: 'cache',
          atualizado_em: cache.atualizado_em
        };
      }

      return {
        fornecedores: [],
        origem: 'vazio',
        atualizado_em: null
      };
    }
  }
}
