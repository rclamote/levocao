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

## Google Places no formulário de sugestão

Na Vercel, definir `GOOGLE_MAPS_BROWSER_KEY` antes de publicar e fazer novo deploy depois de alterar a variável. O navegador recebe a chave no redirecionamento de `/maps-sdk.js`. Sem a variável, a pesquisa automática fica indisponível e o formulário continua a aceitar preenchimento manual.

Antes de ativar restrições numa chave existente, verificar nas métricas do Google Maps Platform que aplicações e APIs a usam. Para o site, selecionar **Websites (HTTP referrers)** e permitir `https://levocao.pt/*`. Acrescentar `https://www.levocao.pt/*` apenas se esse endereço servir a aplicação. Em **API restrictions**, permitir **Maps JavaScript API** e **Places API (New)**, usadas pelo autocomplete e pelos detalhes do local. Para Preview, usar uma chave própria restrita ao endereço de teste. Evitar permissões globais como `*.vercel.app`.

Antes do merge, testar a pesquisa e a seleção de um estabelecimento em português e em inglês no Preview. Rever as quotas por API e configurar alertas de consumo no projeto Google Cloud.
