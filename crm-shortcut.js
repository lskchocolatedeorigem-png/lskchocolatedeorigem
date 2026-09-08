/**
 * ATALHO SECRETO — PAINEL CRM
 * 
 * Aciona: ALT + SHIFT + C
 * Ação: Abre crm.html em nova aba
 * 
 * Arquivo aditivo — não altera nada do site existente.
 * Nenhum link/botão visível é criado; o acesso ao CRM continua
 * protegido pela chave solicitada na página crm.html.
 */

(function () {
    'use strict';

    document.addEventListener('keydown', function (event) {
        // Detecta ALT + SHIFT + C (maiúsculo ou minúsculo)
        if (event.altKey && event.shiftKey && (event.key === 'C' || event.key === 'c')) {
            event.preventDefault();
            window.open('crm.html', '_blank');
        }
    });

})();
