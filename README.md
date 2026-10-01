# Calendário econômico público

Feed de eventos econômicos para um widget Scriptable no iPhone. Este repositório
contém somente o contrato público, o JSON econômico e o código genérico do widget.
Não contém agenda pessoal, contatos, notícias de assinaturas ou credenciais.

O produtor cloud publica os eventos reais verificados em `events.json`. Antes da
primeira publicação, o widget mostra que a agenda ainda está pendente. Nenhum
evento fictício ou lista vazia simulando coleta bem-sucedida é fornecido aqui.

Feed estável:

```text
https://raw.githubusercontent.com/eduardocunhagit/calendario-economico-feed/main/events.json
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
precisam ser conferidos. A publicação dos eventos cabe ao produtor cloud.

## Contrato do produtor

O contrato canônico atual é [PUBLIC-FEED-SCHEMA.json](PUBLIC-FEED-SCHEMA.json),
com `schema_version: 2`. [schema.json](schema.json) é o contrato histórico v1,
mantido para referência; não deve validar o feed atual.

O envelope v2 contém `timezone`, `updated_at`, `coverage_start`, `coverage_end`,
`economic_coverage`, `polls` e `events`. Eventos econômicos têm `kind: "economic"`,
horário ISO 8601 com offset, data em Brasília e `time_status: "exact"`. Pesquisas
presidenciais nacionais têm `kind: "poll"`, `starts_at: null`,
`time_status: "unknown"`, instituto, registro e data permitida para divulgação.
Essa data não confirma que a pesquisa foi ou será publicada naquele dia; não
inventar um horário para ela. IDs permanecem estáveis e únicos.

O widget seleciona Brasil em todos os níveis de importância, EUA em importância
alta e pesquisas presidenciais nacionais. A seleção econômica do feed é mais
ampla e está descrita em [EXPORTER-README.md](EXPORTER-README.md), junto dos
contratos de cobertura, validade das fontes e estado pendente das pesquisas.

O exportador não está neste repositório público. O código e seu contrato de
entrada ficam no repositório privado `rotinas`, em
`modules/calendar-widget/export_feed.py` e `modules/calendar-widget/INPUT-CONTRACT.md`.
O acesso ao produtor exige autorização separada; ler o feed e usar o widget não
exigem esse acesso. [EXPORTER-README.md](EXPORTER-README.md) indica o comando a
executar a partir da raiz do checkout privado.

O produtor deve revisar a projeção econômica, validar o esquema e substituir
`events.json` com um commit normal em `main`. Falha de coleta não deve publicar
lista vazia como sucesso. O repositório não instala agendamentos ou GitHub Actions.
