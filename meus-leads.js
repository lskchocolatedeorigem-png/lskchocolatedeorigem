/**
 * MEUS LEADS — Painel do assinante
 * 
 * Arquivo 100% aditivo. Não altera nada do site existente.
 * Prefixo ml- para todas as classes e funções.
 */

(function () {
    'use strict';

    /* ============================================
       CONSTANTES
       ============================================ */
    const API_MEUS_LEADS = 'https://legisalimentos.app.n8n.cloud/webhook/fc-meus-leads';
    const URL_FORM_DIAGNOSTICO = 'https://legisalimentos.app.n8n.cloud/form/diagnostico-legis';

    /* ============================================
       ESTADO
       ============================================ */
    let mlEmailLogado = '';
    let mlDadosCarregados = false;

    /* ============================================
       UTILITÁRIOS
       ============================================ */
    function ml$(id) { return document.getElementById(id); }

    function mlObterEmailLogado() {
        // Tentar obter o e-mail da sessão do assinante (funil ou principal)
        try {
            // Sessão do funil
            const sessaoFunil = localStorage.getItem('fc_funil_sessao');
            if (sessaoFunil) {
                const dados = JSON.parse(sessaoFunil);
                if (dados.email) return dados.email;
            }

            // Sessão principal
            const sessaoPrincipal = localStorage.getItem('fc_sessao');
            if (sessaoPrincipal) {
                const dados = JSON.parse(sessaoPrincipal);
                if (dados.email) return dados.email;
            }

            // E-mail salvo
            const emailSalvo = localStorage.getItem('fc_email');
            if (emailSalvo) return emailSalvo;
        } catch (e) {
            console.error('Erro ao obter e-mail logado:', e);
        }

        return '';
    }

    function mlMostrarElemento(id, mostrar) {
        const el = ml$(id);
        if (el) el.style.display = mostrar ? 'block' : 'none';
    }

    function mlEsconderTodasMensagens() {
        mlMostrarElemento('mlLoading', false);
        mlMostrarElemento('mlDadosLeads', false);
        mlMostrarElemento('mlMsgSemAcesso', false);
        mlMostrarElemento('mlMsgVazio', false);
        mlMostrarElemento('mlMsgErro', false);
    }

    /* ============================================
       LINK DE CAPTAÇÃO
       ============================================ */
    function mlMontarLinkCaptacao() {
        mlEmailLogado = mlObterEmailLogado();
        if (!mlEmailLogado) return;

        const link = URL_FORM_DIAGNOSTICO + '?conta=' + encodeURIComponent(mlEmailLogado);
        const input = ml$('mlLinkCaptacao');
        if (input) {
            input.value = link;
        }
    }

    function mlCopiarLink() {
        const input = ml$('mlLinkCaptacao');
        if (!input) return;

        const link = input.value;
        if (!link) return;

        // Copiar para área de transferência
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(function () {
                mlMostrarCopiado();
            }).catch(function () {
                mlCopiarFallback(input);
            });
        } else {
            mlCopiarFallback(input);
        }
    }

    function mlCopiarFallback(input) {
        input.select();
        input.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            mlMostrarCopiado();
        } catch (e) {
            alert('Não foi possível copiar. Selecione o link manualmente.');
        }
    }

    function mlMostrarCopiado() {
        const btn = ml$('mlBtnCopiar');
        if (!btn) return;

        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        btn.style.background = 'linear-gradient(135deg, #16A34A, #15803D)';

        setTimeout(function () {
            btn.innerHTML = original;
            btn.style.background = 'linear-gradient(135deg, #1E9E6A, #16A34A)';
        }, 2000);
    }

    /* ============================================
       CARREGAR LEADS
       ============================================ */
    async function mlCarregarLeads() {
        mlEmailLogado = mlObterEmailLogado();

        if (!mlEmailLogado) {
            mlMostrarErro();
            return;
        }

        // Mostrar loading
        mlEsconderTodasMensagens();
        mlMostrarElemento('mlLoading', true);

        // Desabilitar botão atualizar
        const btnAtualizar = ml$('mlBtnAtualizar');
        if (btnAtualizar) {
            btnAtualizar.disabled = true;
            btnAtualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        }

        try {
            const response = await fetch(API_MEUS_LEADS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: mlEmailLogado })
            });

            const data = await response.json();

            if (data.success) {
                mlMostrarLeads(data);
            } else {
                // Sem acesso liberado
                mlMostrarSemAcesso(data.mensagem || 'Acesso não liberado.');
            }
        } catch (error) {
            console.error('Erro ao carregar leads:', error);
            mlMostrarErro();
        } finally {
            // Reabilitar botão
            if (btnAtualizar) {
                btnAtualizar.disabled = false;
                btnAtualizar.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
            }
        }
    }

    /* ============================================
       EXIBIR LEADS
       ============================================ */
    function mlMostrarLeads(data) {
        mlEsconderTodasMensagens();

        const leads = data.leads || [];
        const resumo = data.resumo || { total: 0, quentes: 0, mornos: 0, frios: 0 };

        // Atualizar cards de resumo
        mlAtualizarResumo(resumo);

        if (leads.length === 0) {
            // Mostrar mensagem de vazio
            mlMostrarElemento('mlMsgVazio', true);
            return;
        }

        // Preencher tabela
        mlPreencherTabela(leads);

        // Preencher cards mobile
        mlPreencherCards(leads);

        // Mostrar dados
        mlMostrarElemento('mlDadosLeads', true);
    }

    function mlAtualizarResumo(resumo) {
        const totalEl = ml$('mlTotal');
        const quentesEl = ml$('mlQuentes');
        const mornosEl = ml$('mlMornos');
        const friosEl = ml$('mlFrios');

        if (totalEl) totalEl.textContent = resumo.total || 0;
        if (quentesEl) quentesEl.textContent = resumo.quentes || 0;
        if (mornosEl) mornosEl.textContent = resumo.mornos || 0;
        if (friosEl) friosEl.textContent = resumo.frios || 0;
    }

    function mlPreencherTabela(leads) {
        const tbody = ml$('mlTabelaBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        leads.forEach(function (lead) {
            const tr = document.createElement('tr');

            const classificacao = (lead.classificacao || '').toLowerCase();
            const badgeClass = 'ml-badge-' + classificacao;
            const badgeIcon = classificacao === 'quente' ? 'fa-fire' :
                              classificacao === 'morno' ? 'fa-temperature-half' : 'fa-snowflake';

            const dataFormatada = mlFormatarData(lead.criado_em);

            tr.innerHTML = 
                '<td><div class="ml-lead-nome">' + mlEscapeHtml(lead.nome || '—') + '</div>' +
                '<div class="ml-lead-email">' + mlEscapeHtml(lead.email || '') + '</div></td>' +
                '<td>' + mlEscapeHtml(lead.empresa || '—') + '</td>' +
                '<td>' + mlEscapeHtml(lead.email || '—') + '</td>' +
                '<td>' + mlEscapeHtml(lead.telefone || '—') + '</td>' +
                '<td><span class="ml-badge ' + badgeClass + '"><i class="fas ' + badgeIcon + '"></i> ' + 
                    mlCapitalizar(classificacao) + '</span></td>' +
                '<td>' + mlEscapeHtml(lead.servico_recomendado || '—') + '</td>' +
                '<td>' + dataFormatada + '</td>';

            tbody.appendChild(tr);
        });
    }

    function mlPreencherCards(leads) {
        const container = ml$('mlCardsContainer');
        if (!container) return;

        container.innerHTML = '';

        leads.forEach(function (lead) {
            const card = document.createElement('div');
            card.className = 'ml-lead-card';

            const classificacao = (lead.classificacao || '').toLowerCase();
            const badgeClass = 'ml-badge-' + classificacao;
            const badgeIcon = classificacao === 'quente' ? 'fa-fire' :
                              classificacao === 'morno' ? 'fa-temperature-half' : 'fa-snowflake';

            const dataFormatada = mlFormatarData(lead.criado_em);

            card.innerHTML = 
                '<div class="ml-lead-card-header">' +
                    '<div>' +
                        '<div class="ml-lead-card-nome">' + mlEscapeHtml(lead.nome || '—') + '</div>' +
                        '<div class="ml-lead-card-empresa">' + mlEscapeHtml(lead.empresa || '') + '</div>' +
                    '</div>' +
                    '<span class="ml-badge ' + badgeClass + '"><i class="fas ' + badgeIcon + '"></i> ' + 
                        mlCapitalizar(classificacao) + '</span>' +
                '</div>' +
                '<div class="ml-lead-card-info">' +
                    '<div><i class="fas fa-envelope"></i> ' + mlEscapeHtml(lead.email || '—') + '</div>' +
                    '<div><i class="fas fa-phone"></i> ' + mlEscapeHtml(lead.telefone || '—') + '</div>' +
                    '<div><i class="fas fa-calendar"></i> ' + dataFormatada + '</div>' +
                '</div>' +
                '<div class="ml-lead-card-servico">' +
                    '<strong>Serviço recomendado:</strong> ' + mlEscapeHtml(lead.servico_recomendado || '—') +
                '</div>';

            container.appendChild(card);
        });
    }

    /* ============================================
       MENSAGENS DE ERRO / SEM ACESSO
       ============================================ */
    function mlMostrarSemAcesso(mensagem) {
        mlEsconderTodasMensagens();

        const msgEl = ml$('mlMsgSemAcessoTexto');
        if (msgEl) {
            msgEl.textContent = mensagem;
        }

        mlMostrarElemento('mlMsgSemAcesso', true);
    }

    function mlMostrarErro() {
        mlEsconderTodasMensagens();
        mlMostrarElemento('mlMsgErro', true);
    }

    /* ============================================
       UTILITÁRIOS DE FORMATAÇÃO
       ============================================ */
    function mlFormatarData(dataStr) {
        if (!dataStr) return '—';

        try {
            // Se já está no formato DD/MM/YYYY, retornar como está
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
                return dataStr;
            }

            // Tentar parsear a data
            const data = new Date(dataStr);
            if (isNaN(data.getTime())) return dataStr;

            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();

            return dia + '/' + mes + '/' + ano;
        } catch (e) {
            return dataStr;
        }
    }

    function mlCapitalizar(str) {
        if (!str) return '—';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function mlEscapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ============================================
       INICIALIZAÇÃO
       ============================================ */
    function mlInicializar() {
        // Montar link de captação
        mlMontarLinkCaptacao();

        // Observar quando a área logada ficar visível
        mlObservarAreaLogada();
    }

    function mlObservarAreaLogada() {
        // Verificar periodicamente se a área logada está visível
        const intervalo = setInterval(function () {
            const servicosSection = document.getElementById('servicos');
            const meusLeadsSection = ml$('meusLeadsSection');

            if (servicosSection && servicosSection.classList.contains('visible')) {
                // Área logada está visível
                if (meusLeadsSection) {
                    meusLeadsSection.style.display = 'block';

                    // Carregar leads automaticamente na primeira vez
                    if (!mlDadosCarregados) {
                        mlDadosCarregados = true;
                        mlCarregarLeads();
                    }
                }

                // Atualizar link de captação com o e-mail atual
                mlMontarLinkCaptacao();
            } else {
                // Área logada não está visível
                if (meusLeadsSection) {
                    meusLeadsSection.style.display = 'none';
                }
            }
        }, 1000);
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mlInicializar);
    } else {
        mlInicializar();
    }

    // Expor funções globais para os botões
    window.mlCarregarLeads = mlCarregarLeads;
    window.mlCopiarLink = mlCopiarLink;

})();
