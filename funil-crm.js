/**
 * PACOTE FUNIL + CRM — R$ 37/mês
 * 
 * Arquivo 100% aditivo. Não altera nada do site existente.
 * 
 * Funcionalidades:
 * - Checkout do pacote (POST fc-checkout-funil)
 * - Login do pacote (solicitar código + verificar código)
 * - Área logada do pacote
 */

(function () {
    'use strict';

    /* ============================================
       CONSTANTES
       ============================================ */
    const API_CHECKOUT_FUNIL = 'https://legisalimentos.app.n8n.cloud/webhook/fc-checkout-funil';
    const API_VERIFICAR_FUNIL = 'https://legisalimentos.app.n8n.cloud/webhook/fc-verificar-acesso-funil';
    const API_SOLICITAR_CODIGO = 'https://legisalimentos.app.n8n.cloud/webhook/fc-solicitar-codigo';

    /* ============================================
       ESTADO
       ============================================ */
    let funilEmailAtual = '';
    let funilSessao = null;

    /* ============================================
       UTILITÁRIOS
       ============================================ */
    function $(id) { return document.getElementById(id); }

    function mostrarMsgFunil(tipo, mensagem) {
        const sucesso = $('funilStatusSucesso');
        const alerta = $('funilStatusAlerta');
        const info = $('funilStatusInfo');
        if (!sucesso || !alerta || !info) return;

        sucesso.classList.remove('show');
        alerta.classList.remove('show');
        info.classList.remove('show');

        if (tipo === 'sucesso') {
            $('funilMsgSucesso').textContent = mensagem;
            sucesso.classList.add('show');
        } else if (tipo === 'alerta') {
            $('funilMsgAlerta').textContent = mensagem;
            alerta.classList.add('show');
        } else {
            $('funilMsgInfo').textContent = mensagem;
            info.classList.add('show');
        }
    }

    /* ============================================
       CHECKOUT — ASSINAR PACOTE FUNIL + CRM
       ============================================ */
    async function assinarFunil() {
        // Pedir nome e e-mail
        const nome = prompt('Digite seu nome completo:');
        if (!nome || nome.trim().length < 2) {
            alert('Informe seu nome para continuar.');
            return;
        }

        let email = localStorage.getItem('fc_email') || '';
        if (!email) {
            email = prompt('Digite seu e-mail:') || '';
        }
        email = email.trim().toLowerCase();

        if (!email || email.indexOf('@') < 0) {
            alert('Informe um e-mail válido para continuar.');
            return;
        }

        // Desabilitar botões
        const btns = document.querySelectorAll('[data-assinar-funil]');
        btns.forEach(function (b) {
            b.disabled = true;
            b.dataset.txt = b.innerHTML;
            b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando pagamento...';
        });

        try {
            const resp = await fetch(API_CHECKOUT_FUNIL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nome.trim(), email: email })
            });
            const data = await resp.json();

            // A resposta pode ter o link em diferentes campos
            const link = data.init_point || data.checkout_url || data.url || data.link || data.payment_url;

            if (data.success && link) {
                window.location.href = link;
            } else {
                alert((data && data.mensagem) || 'Não foi possível iniciar o pagamento. Tente novamente.');
                btns.forEach(function (b) {
                    b.disabled = false;
                    b.innerHTML = b.dataset.txt || 'Assinar Pacote Funil + CRM';
                });
            }
        } catch (e) {
            alert('Erro de conexão ao iniciar o pagamento. Tente novamente.');
            btns.forEach(function (b) {
                b.disabled = false;
                b.innerHTML = b.dataset.txt || 'Assinar Pacote Funil + CRM';
            });
        }
    }

    /* ============================================
       LOGIN FUNIL — PASSO 1: SOLICITAR CÓDIGO
       ============================================ */
    async function funilSolicitarCodigo(e) {
        e.preventDefault();
        const email = $('funil-email').value.trim();

        if (!email || email.indexOf('@') < 0) {
            mostrarMsgFunil('alerta', 'Por favor, digite um e-mail válido.');
            return;
        }

        funilEmailAtual = email;
        const btn = $('btnFunilSolicitar');
        btn.disabled = true;
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const resp = await fetch(API_SOLICITAR_CODIGO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await resp.json();

            if (data.success) {
                mostrarMsgFunil('sucesso', data.mensagem || 'Código enviado! Verifique seu e-mail.');
                funilIrPasso2(email);
            } else {
                mostrarMsgFunil('alerta', data.mensagem || 'Não foi possível enviar o código.');
            }
        } catch (err) {
            mostrarMsgFunil('alerta', 'Erro de conexão. Tente novamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = txtOriginal;
        }
    }

    function funilIrPasso2(email) {
        $('funilPasso1').style.display = 'none';
        $('funilPasso2').style.display = 'block';
        $('funilEmailDisplay').textContent = email;
        $('funil-codigo').value = '';
        $('funil-codigo').focus();
    }

    /* ============================================
       LOGIN FUNIL — PASSO 2: VERIFICAR CÓDIGO
       ============================================ */
    async function funilVerificarCodigo(e) {
        e.preventDefault();
        const codigo = $('funil-codigo').value.trim();

        if (!/^\d{6}$/.test(codigo)) {
            mostrarMsgFunil('alerta', 'O código deve ter exatamente 6 dígitos.');
            return;
        }

        const btn = $('btnFunilVerificar');
        btn.disabled = true;
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        try {
            const resp = await fetch(API_VERIFICAR_FUNIL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: funilEmailAtual, codigo: codigo })
            });
            const data = await resp.json();

            if (data.acesso_liberado) {
                // Salvar sessão
                const sessao = {
                    email: funilEmailAtual,
                    cliente_id: data.cliente_id,
                    status: data.status,
                    dias_restantes: data.dias_restantes,
                    validade: data.validade,
                    plano: data.plano,
                    timestamp: Date.now()
                };
                localStorage.setItem('fc_funil_sessao', JSON.stringify(sessao));
                funilSessao = sessao;

                mostrarMsgFunil('sucesso', data.mensagem || 'Acesso liberado!');
                revelarAreaFunil(sessao);
            } else {
                mostrarMsgFunil('alerta', data.mensagem || 'Código inválido ou expirado.');

                // Se expirado, mostrar botão de renovar
                if (data.status === 'expirado') {
                    const btnRenovar = $('btnFunilRenovar');
                    if (btnRenovar) btnRenovar.style.display = 'inline-flex';
                }
            }
        } catch (err) {
            mostrarMsgFunil('alerta', 'Erro de conexão. Verifique sua internet.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = txtOriginal;
        }
    }

    /* ============================================
       ÁREA LOGADA FUNIL + CRM
       ============================================ */
    function revelarAreaFunil(dados) {
        // Esconder card de login
        const cardLogin = $('cardLoginFunil');
        if (cardLogin) cardLogin.style.display = 'none';

        // Mostrar área logada
        const areaLogada = $('areaLogadaFunil');
        if (areaLogada) areaLogada.style.display = 'block';

        // Preencher dados
        const nomeEl = $('funilNomeUsuario');
        const statusEl = $('funilStatusUsuario');
        const avatarEl = $('funilAvatarInicial');

        if (nomeEl) nomeEl.textContent = dados.email;
        if (avatarEl) avatarEl.textContent = dados.email.charAt(0).toUpperCase();

        let statusTexto = 'Assinante ativo';
        if (dados.status === 'teste') {
            statusTexto = 'Período de teste — ' + dados.dias_restantes + ' dia(s) restante(s)';
        } else if (dados.status === 'expirado') {
            statusTexto = 'Assinatura expirada';
        }
        if (statusEl) statusEl.textContent = statusTexto;

        // Mostrar mensagem do servidor
        const msgEl = $('funilMensagemServidor');
        if (msgEl && dados.mensagem) {
            msgEl.textContent = dados.mensagem;
            msgEl.style.display = 'block';
        }

        // Mostrar botão renovar se expirado ou teste
        const btnRenovar = $('btnFunilRenovarArea');
        if (btnRenovar) {
            if (dados.status === 'expirado' || dados.status === 'teste' || (dados.dias_restantes !== undefined && dados.dias_restantes <= 3)) {
                btnRenovar.style.display = 'inline-flex';
            }
        }

        // Scroll suave
        setTimeout(function () {
            if (areaLogada) areaLogada.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    /* ============================================
       LOGOUT FUNIL
       ============================================ */
    function funilSair() {
        localStorage.removeItem('fc_funil_sessao');
        funilSessao = null;
        funilEmailAtual = '';

        const cardLogin = $('cardLoginFunil');
        const areaLogada = $('areaLogadaFunil');

        if (areaLogada) areaLogada.style.display = 'none';
        if (cardLogin) cardLogin.style.display = 'block';

        // Resetar passos
        $('funilPasso1').style.display = 'block';
        $('funilPasso2').style.display = 'none';
        $('funil-email').value = '';
        $('funil-codigo').value = '';

        // Esconder mensagens
        const sucesso = $('funilStatusSucesso');
        const alerta = $('funilStatusAlerta');
        const info = $('funilStatusInfo');
        if (sucesso) sucesso.classList.remove('show');
        if (alerta) alerta.classList.remove('show');
        if (info) info.classList.remove('show');

        // Scroll para login
        setTimeout(function () {
            const secao = $('acesso-funil');
            if (secao) secao.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    /* ============================================
       VERIFICAR SESSÃO SALVA
       ============================================ */
    function verificarSessaoFunil() {
        const raw = localStorage.getItem('fc_funil_sessao');
        if (!raw) return;

        try {
            const dados = JSON.parse(raw);
            const agora = Date.now();
            const trintaDias = 30 * 24 * 60 * 60 * 1000;

            if (dados.timestamp && (agora - dados.timestamp) > trintaDias) {
                localStorage.removeItem('fc_funil_sessao');
                return;
            }

            funilSessao = dados;
            funilEmailAtual = dados.email;
            revelarAreaFunil(dados);
        } catch (e) {
            localStorage.removeItem('fc_funil_sessao');
        }
    }

    /* ============================================
       TROCAR E-MAIL / REENVIAR
       ============================================ */
    function funilTrocarEmail() {
        $('funilPasso2').style.display = 'none';
        $('funilPasso1').style.display = 'block';
        $('funil-email').value = '';
        $('funil-codigo').value = '';
        funilEmailAtual = '';

        const sucesso = $('funilStatusSucesso');
        const alerta = $('funilStatusAlerta');
        const info = $('funilStatusInfo');
        if (sucesso) sucesso.classList.remove('show');
        if (alerta) alerta.classList.remove('show');
        if (info) info.classList.remove('show');
    }

    async function funilReenviarCodigo() {
        if (!funilEmailAtual) return;

        const btn = $('btnFunilReenviar');
        btn.disabled = true;
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reenviando...';

        try {
            const resp = await fetch(API_SOLICITAR_CODIGO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: funilEmailAtual })
            });
            const data = await resp.json();

            if (data.success) {
                mostrarMsgFunil('info', data.mensagem || 'Novo código enviado!');
                $('funil-codigo').value = '';
                $('funil-codigo').focus();
            } else {
                mostrarMsgFunil('alerta', data.mensagem || 'Não foi possível reenviar.');
            }
        } catch (err) {
            mostrarMsgFunil('alerta', 'Erro de conexão. Tente novamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = txtOriginal;
        }
    }

    /* ============================================
       INICIALIZAÇÃO
       ============================================ */
    document.addEventListener('DOMContentLoaded', function () {
        // Verificar sessão salva
        verificarSessaoFunil();

        // Form solicitar código
        const formSolicitar = $('formFunilSolicitarCodigo');
        if (formSolicitar) {
            formSolicitar.addEventListener('submit', funilSolicitarCodigo);
        }

        // Form verificar código
        const formVerificar = $('formFunilVerificarCodigo');
        if (formVerificar) {
            formVerificar.addEventListener('submit', funilVerificarCodigo);
        }

        // Botão reenviar
        const btnReenviar = $('btnFunilReenviar');
        if (btnReenviar) {
            btnReenviar.addEventListener('click', funilReenviarCodigo);
        }

        // Botão trocar email
        const btnTrocar = $('btnFunilTrocarEmail');
        if (btnTrocar) {
            btnTrocar.addEventListener('click', funilTrocarEmail);
        }

        // Botão sair
        const btnSair = $('btnFunilSair');
        if (btnSair) {
            btnSair.addEventListener('click', funilSair);
        }

        // Expor função global para os botões de assinar
        window.assinarFunil = assinarFunil;
    });

})();
