# Calendário econômico público

Feed de eventos econômicos para um widget Scriptable no iPhone. Este repositório
contém somente o contrato público, o JSON econômico e o código genérico do widget.
Não contém agenda pessoal, contatos, notícias de assinaturas ou credenciais.

**Situação inicial:** `calendar.json` está em `status: "pending"`, com lista vazia
e `updated_at: null`. Isso significa **primeira publicação pendente**, não ausência
de eventos econômicos. Nenhum evento foi inventado. O produtor cloud publicará os
eventos reais verificados e mudará o estado para `ready`.

Feed estável:

```text
https://raw.githubusercontent.com/eduardocunhagit/calendario-economico-feed/main/calendar.json
```

## iPhone

1. Copie o conteúdo de `CalendarioEconomico.js` para um novo script no Scriptable.
2. Execute uma vez para ver a prévia.
3. Adicione um widget Scriptable à tela inicial e selecione esse script.

O widget seleciona os eventos do dia em `America/Sao_Paulo`, mostra os horários
de Brasília, preserva uma cópia local do último feed válido e identifica uso de
cache ou atualização antiga. Toque num evento para abrir sua fonte, quando o
tamanho do widget permitir links individuais. O script não acessa o calendário
pessoal do iPhone e não requer token GitHub.

O intervalo de atualização é uma sugestão ao iOS, que controla quando executar o
widget; não é uma promessa de atualização exata. Referências oficiais:
[Request](https://docs.scriptable.app/request/),
[ListWidget](https://docs.scriptable.app/listwidget/),
[FileManager](https://docs.scriptable.app/filemanager/).

O código foi verificado localmente; a execução e o layout em um iPhone real ainda
precisam ser conferidos. O feed inicial pendente é intencional.

## Contrato do produtor

`schema.json` define o JSON público. Cada evento tem somente `id`, `title`,
`country`, `datetime`, `timezone`, `importance`, `source_url` e `updated_at`.
Datas usam ISO 8601 com offset explícito; fuso `America/Sao_Paulo`; importância
`low`, `medium` ou `high`. IDs devem ser estáveis e únicos. Não publicar horário
estimado como confirmado: itens sem horário verificado aguardam o produtor.

O produtor deve revisar a projeção econômica, validar o esquema e substituir
`calendar.json` com um commit normal em `main`. Falha de coleta não deve publicar
`ready` com lista vazia. O repositório não instala agendamentos ou GitHub Actions.
