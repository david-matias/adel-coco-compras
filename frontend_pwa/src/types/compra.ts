
export type TipoCoco = 'Coco Verde' | 'Coco Seco';
export type ModalidadeLogistica = 'FROTA' | 'TERCEIRO';
export type StatusCarga = 'PREVISTO' | 'CANCELADO';

export interface CompradorPayload {
  email: string;
  codigo_fornecedor: string;
  fornecedor: string;
  previsao_entrega: string;
  quantidade_prevista: number;
  valor_unitario: number;
  valor_total: number;
  logistica: ModalidadeLogistica;
  observacao?: string;
}

export interface CargaPayload {
  id_carga: string;
  tipo_coco: TipoCoco;
  comprador: CompradorPayload;
  status: StatusCarga;
  timestamps: {
    criacao: string;
  };
}

export interface Fornecedor {
  codigo: string;
  nome: string;
  cidade: string;
  fornece_coco_seco: 'SIM' | 'NÃO';
  fornece_coco_verde: 'SIM' | 'NÃO';
  status: 'ATIVO' | 'INATIVO';
}

export interface FornecedoresCache {
  atualizado_em: string;
  fornecedores: Fornecedor[];
}
