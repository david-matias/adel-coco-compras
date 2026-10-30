import type { CargaPayload } from '../types/compra';

const moeda = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const numero = (valor: number): string =>
  valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/**
 * Gera uma mensagem de compra para compartilhamento manual no WhatsApp.
 * O link não seleciona automaticamente um grupo existente; o usuário escolhe
 * a conversa no WhatsApp e confirma o envio.
 */
export function gerarMensagemCompraWhatsApp(carga: CargaPayload): string {
  const verde = carga.tipo_coco === 'Coco Verde';
  const unidade = verde ? 'frutos' : 'kg';
  const unidadePreco = verde ? 'litro de água estimado' : 'kg';
  const comprador = carga.comprador;

  return [
    '*NOVA COMPRA DE COCO — ADEL COCO*',
    '',
    `*Tipo:* ${carga.tipo_coco}`,
    `*Fornecedor:* ${comprador.fornecedor}`,
    `*Quantidade prevista:* ${numero(comprador.quantidade_prevista)} ${unidade}`,
    `*Preço unitário:* ${moeda(comprador.valor_unitario)} / ${unidadePreco}`,
    `*Valor total previsto:* ${moeda(comprador.valor_total)}`,
    `*Entrega prevista:* ${comprador.previsao_entrega}`,
    `*Logística:* ${comprador.logistica === 'FROTA' ? 'Frota Adel Coco' : 'Terceiro'}`,
    `*Comprador:* ${comprador.email}`,
    `*Lançamento:* ${carga.id_carga}`,
    comprador.observacao?.trim() ? `*Observação:* ${comprador.observacao.trim()}` : ''
  ].filter(Boolean).join('\n');
}

/** Abre o WhatsApp com o texto preenchido; não envia automaticamente. */
export function abrirWhatsAppComMensagem(mensagem: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
