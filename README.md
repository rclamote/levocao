# levocao
# Exploradores do Levo o Cão

O branch `agent/dog-explorers-preview` inclui o primeiro registo real de exploradores:

- entrada sem palavra-passe através de email (OTP ou magic link, conforme o template do Supabase);
- sessão persistente no navegador;
- vários cães associados à mesma conta;
- fotografia, nome e pequena apresentação;
- escolha do cão ativo para atribuir descobertas e confirmações;
- 5 pontos por local aprovado e 1 ponto por nova confirmação positiva;
- separação entre contas públicas e o administrador existente.

Antes de testar o registo, aplicar a migração:

`supabase/migrations/20261110150000_add_dog_explorers.sql`

Para enviar códigos de seis algarismos, o template **Magic Link** do Supabase deve incluir `{{ .Token }}`. Se mantiver `{{ .ConfirmationURL }}`, o mesmo formulário envia um link de acesso. Para utilização pública, configurar SMTP próprio no Supabase; o fornecedor de email predefinido pode estar limitado aos membros da organização.
