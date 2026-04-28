# Plano de Implementação: jss-claude-listener

Monitor semanal de ranking de marca via Claude API. Executa o prompt fixo *"best javascript spreadsheet 2026"* em duas variantes (com e sem `web_search`), extrai a lista ranqueada de produtos com empresa/URL/justificativa, persiste em Vercel Blob e expõe um dashboard com bump chart destacando o Jspreadsheet.

## Visão Geral

Aplicação Next.js 15 (App Router, TypeScript, Tailwind) hospedada em Vercel Hobby. Um Vercel Cron semanal aciona um endpoint que dispara duas chamadas paralelas à Claude (Sonnet 4.6) — uma com `web_search` ativo, outra sem — força saída estruturada via *tool use*, e grava o resultado completo (raw + parsed) em Vercel Blob como JSON. O dashboard é protegido por middleware de senha simples (`APP_PASSWORD` em env), lista as runs históricas, mostra cada execução em detalhe (raw + justificativas lado a lado) e renderiza um bump chart (`@nivo/bump`) com a posição de cada produto ao longo do tempo, com Jspreadsheet destacado.

## Análise do Estado Atual

- Diretório de trabalho **vazio** — projeto greenfield. Sem código, dependências ou config para herdar.
- Plataforma alvo: **Vercel Hobby**, com as seguintes restrições:
  - Filesystem read-only em runtime → persistência obrigatória via storage externo. Decisão: **Vercel Blob** (free tier, semântica de "salvar JSON em arquivo").
  - `maxDuration` máximo de 60s para Serverless Functions. Mitigação: as duas chamadas Claude rodam **em paralelo** dentro do handler.
  - Vercel Cron: até 1x/dia. Semanal cabe. Cron envia `Authorization: Bearer ${CRON_SECRET}` automaticamente quando a env existe.
  - Sem password protection nativa → auth via **middleware** customizado com cookie de sessão e `APP_PASSWORD`.

## Estado Final Desejado

Um repositório Next.js fazendo deploy na Vercel com:

1. Cron semanal disparando `/api/cron/run` toda segunda às 09:00 UTC (configurável via `vercel.json`).
2. Cada execução grava `runs/<isoTimestamp>.json` em Vercel Blob, contendo metadata + ambas as variantes (com e sem web search), incluindo raw response, lista parseada, uso de tokens e duração.
3. Dashboard em `/` (atrás de auth) com:
   - Lista cronológica das runs.
   - Botão **Rodar agora** (re-usa o mesmo endpoint, autorizado pela sessão).
   - Página de detalhe `/runs/[id]` mostrando ambas as variantes lado a lado (rank + nome + empresa + url + justificativa) e a raw response da Claude.
   - Página `/chart` com bump chart (uma série por variante) mostrando a evolução do ranking ao longo das semanas. **Jspreadsheet** é destacado (cor primária, linha mais espessa) — alvo lido de `HIGHLIGHTED_BRAND` em env.
4. Login em `/login` com campo único de senha; sessão via cookie httpOnly assinado.

### Verificação do estado final
- `vercel deploy --prod` sobe sem erros, `vercel logs` mostra cron executando no schedule.
- Após primeira execução, o blob `runs/<timestamp>.json` existe e parseia para o schema `RunRecord`.
- Acesso a `/` sem cookie redireciona para `/login`; com senha correta entra; cookie inválido redireciona.
- `/chart` renderiza bump chart com pelo menos 1 ponto após primeira run.

### Descobertas-chave
- **Vercel Blob** é a única opção razoável que preserva a semântica de "JSON em disco" sem virar um banco. SDK oficial: `@vercel/blob` com `put()`, `list()`, `head()` e `del()`. Token `BLOB_READ_WRITE_TOKEN` é injetado automaticamente quando a Storage é provisionada.
- **Web search** na Claude é uma *server-side tool* que o modelo decide invocar sozinho. Para combinar web search com saída estruturada, registramos **dois tools** na request: o `web_search` nativo e um custom `save_ranking`. Instruímos o modelo no system prompt a primeiro pesquisar e depois chamar `save_ranking`. Para a variante *sem* web search, registramos só o `save_ranking` com `tool_choice: { type: "tool", name: "save_ranking" }` (forçando a saída estruturada direto).
- **Bump chart**: `@nivo/bump` (MIT) é a opção pronta — eixo X discreto (semanas ISO), Y é rank (lower is better, lib inverte automaticamente). Aceita `lineWidth` por série, então o destaque do Jspreadsheet é trivial.
- **Função timeout de 60s**: chamadas Claude com web_search podem demorar 30-50s. Rodar as duas variantes em paralelo (`Promise.all`) cabe. Caso estoure, fallback é separar em dois endpoints e o cron chamar ambos.

---

## Fases de Implementação

### Fase 1: Scaffold + serviço Claude

**Objetivo**: Projeto Next.js inicializado, dependências instaladas, módulo `lib/claude.ts` capaz de rodar o prompt nas duas variantes e retornar `RunResult` parseado.

**Mudanças**:

1. `package.json` — Next.js 15, React 19, TypeScript, Tailwind, `@anthropic-ai/sdk`, `@vercel/blob`, `@nivo/bump @nivo/core`, `zod` (validação do schema da tool), `iron-session` (cookie assinado para auth).

2. `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs` — config padrão do `create-next-app` com App Router.

3. `lib/types.ts` — schemas Zod e tipos:
   ```ts
   export const ProductSchema = z.object({
     rank: z.number().int().positive(),
     name: z.string(),
     company: z.string().optional(),
     url: z.string().url().optional(),
     justification: z.string(),
   });
   export const RankingSchema = z.object({ products: z.array(ProductSchema) });
   export type VariantResult = {
     variant: "with_web_search" | "without_web_search";
     model: string;
     rawResponse: unknown;        // ContentBlock[] da Anthropic
     parsed: z.infer<typeof RankingSchema> | null;
     parseError?: string;
     usage: { inputTokens: number; outputTokens: number };
     durationMs: number;
   };
   export type RunRecord = {
     id: string;                  // ISO timestamp
     runAt: string;
     weekIso: string;             // ex: "2026-W18"
     prompt: string;
     trigger: "cron" | "manual";
     variants: { with_web_search: VariantResult; without_web_search: VariantResult };
   };
   ```

4. `lib/claude.ts` — função `runRanking(prompt: string): Promise<RunRecord["variants"]>`:
   - Define a tool customizada `save_ranking` com input_schema espelhando `RankingSchema`.
   - Variante **with_web_search**: `tools: [webSearchTool, saveRankingTool]`, `tool_choice: { type: "auto" }`, system prompt: *"Search the web for current information about JavaScript spreadsheet libraries in 2026, then call save_ranking with the ranked list."* Após receber a resposta, encontra o `tool_use` com `name === "save_ranking"` e parseia `input` com Zod.
   - Variante **without_web_search**: só `tools: [saveRankingTool]`, `tool_choice: { type: "tool", name: "save_ranking" }`, sem instrução de busca.
   - Ambas em `Promise.all`. Cada uma cronometra `durationMs` e captura `usage`.
   - Em caso de erro de parse, salva `parseError` e mantém `parsed: null` (não derruba a run inteira).
   - Modelo: `claude-sonnet-4-6` (env override via `CLAUDE_MODEL`).
   - **Nota**: o nome canônico da tool de web search da Anthropic deve ser confirmado nos docs vigentes em 2026 (atual em `web_search_<YYYYMMDD>`). Centralizar em const `WEB_SEARCH_TOOL_TYPE` no topo do arquivo.

5. `lib/week.ts` — utilitário `toIsoWeek(date: Date): string` retornando `"YYYY-Www"` (ISO 8601, semana começando segunda).

**Critérios de Sucesso**:

Automatizados:
- [x] `npm run build` passa sem erros de tipo.
- [x] `npx tsc --noEmit` limpo.
- [x] Teste manual via script `scripts/test-claude.ts` (executável com `tsx`) imprime ambas as variantes parseadas com pelo menos 5 produtos cada.

Manuais:
- [x] A variante com web_search inclui produtos atuais (verificar contra busca manual no Google).
- [x] A variante sem web_search retorna lista plausível mesmo sem internet (baseada no treinamento do modelo).
- [x] Tokens e durationMs aparecem preenchidos.

---

### Fase 2: Persistência (Vercel Blob) + endpoint de cron

**Objetivo**: Cron semanal grava o resultado em Blob storage; mesmo endpoint serve trigger manual.

**Mudanças**:

1. `lib/storage.ts` — wrapper sobre `@vercel/blob`:
   - `saveRun(record: RunRecord): Promise<{ url: string; pathname: string }>` — `put('runs/' + record.id + '.json', JSON.stringify(record), { access: 'public', addRandomSuffix: false, contentType: 'application/json' })`.
   - `listRuns(): Promise<RunRecord[]>` — `list({ prefix: 'runs/' })`, fetch + parse de cada blob, ordenar desc por `runAt`.
   - `getRun(id: string): Promise<RunRecord | null>` — `list({ prefix: 'runs/' + id + '.json' })` + fetch.
   - **Adaptação 1**: `@vercel/blob` 0.27 só aceita `access: 'public'` (modo `'private'` não foi liberado para o tier free). URLs são longas/aleatórias por loja, e o dashboard fica atrás de auth — risco de descoberta é baixo.
   - **Adaptação 2 (DX)**: quando `BLOB_READ_WRITE_TOKEN` está vazio (dev local sem Vercel link), o módulo cai em fallback de filesystem (`./data/runs/<id-sanitizado>.json`). `data/` está no `.gitignore`. Em produção (token presente) o comportamento é Blob, sem branch.

2. `app/api/cron/run/route.ts` — handler `GET` e `POST` (Vercel Cron envia GET; UI manda POST/GET com cookie):
   - Autorização: aceita `Authorization: Bearer ${CRON_SECRET}` (vindo da Vercel Cron) **OU** sessão autenticada via cookie (trigger manual da UI — implementado na Fase 3).
   - Constrói prompt: `process.env.RANKING_PROMPT ?? "best javascript spreadsheet 2026"`.
   - Chama `runRanking(prompt)`, monta `RunRecord` com `id = new Date().toISOString()`, `trigger` ("cron" ou "manual" baseado em qual auth passou).
   - `saveRun(record)`. Retorna `{ id, url, pathname }`.
   - `export const maxDuration = 60;`
   - `export const runtime = 'nodejs';`

3. `vercel.json`:
   ```json
   {
     "crons": [
       { "path": "/api/cron/run", "schedule": "0 9 * * 1" }
     ]
   }
   ```
   (Segundas-feiras, 09:00 UTC.)

4. `.env.example` — `ANTHROPIC_API_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `APP_PASSWORD`, `SESSION_SECRET`, `HIGHLIGHTED_BRAND=Jspreadsheet`, `RANKING_PROMPT`, `CLAUDE_MODEL=claude-sonnet-4-6`.

**Critérios de Sucesso**:

Automatizados:
- [ ] `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/run` em ambiente de preview cria um blob `runs/<timestamp>.json` válido.
- [ ] `listRuns()` chamado em REPL retorna a run criada.
- [x] `npm run build` passa.

Manuais:
- [ ] Confirmar no painel Vercel → Storage → Blob que o arquivo aparece.
- [ ] Confirmar no painel Vercel → Crons que o job está agendado para `0 9 * * 1`.
- [ ] Request sem `Authorization` correta retorna 401.

---

### Fase 3: Auth via middleware

**Objetivo**: Páginas e o trigger manual ficam atrás de senha única.

**Mudanças**:

1. `lib/session.ts` — config do `iron-session` (cookie `jss_session`, `password: SESSION_SECRET`, `cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60*60*24*30 }`). Helper `getSession()` para uso em route handlers e server components.

2. `middleware.ts` (raiz do projeto):
   - Matcher: `['/((?!login|api/cron/run|_next|favicon).*)']` — protege tudo exceto `/login`, o endpoint de cron (que tem auth própria via Bearer) e assets estáticos.
   - Lê o cookie `jss_session`, valida via `iron-session`. Se inválido/ausente, redireciona para `/login?next=<path>`.

3. `app/login/page.tsx` — form simples (server component + server action) com campo `password`. Submit chama action que compara com `APP_PASSWORD` (timing-safe), grava `session.authenticated = true`, redireciona para `next` ou `/`.

4. `app/api/auth/logout/route.ts` — `POST` destrói a sessão e redireciona para `/login`.

5. Endpoint `/api/cron/run` é atualizado para também aceitar sessão autenticada (já mencionado na Fase 2, implementação real fica aqui).

**Critérios de Sucesso**:

Automatizados:
- [ ] `curl /` sem cookie → 307 para `/login`.
- [ ] `curl /api/cron/run` sem nada → 401.
- [ ] `curl /api/cron/run` com Bearer correto → 200.
- [x] `npm run build` passa.

Manuais:
- [ ] Login com senha errada mostra erro inline, não cria sessão.
- [ ] Login com senha correta entra no `/` (ou no `next`).
- [ ] Logout invalida o cookie e bloqueia acesso seguinte.

---

### Fase 4: Dashboard (lista + detalhe + run-now)

**Objetivo**: UI funcional para inspecionar runs e disparar manualmente.

**Mudanças**:

1. `app/layout.tsx` — shell com header (logo, nav: *Runs* / *Chart* / *Logout*), Tailwind aplicado.

2. `app/page.tsx` (Runs list) — server component que chama `listRuns()`, renderiza tabela:
   - Colunas: data/hora, semana ISO, trigger, # produtos (por variante), link "ver detalhe".
   - Botão **Rodar agora** (form + server action que chama o endpoint `/api/cron/run` com fetch interno passando cookie). Loading state + toast de sucesso/erro.

3. `app/runs/[id]/page.tsx` — server component:
   - Carrega `getRun(params.id)`.
   - Layout 2 colunas (md+): variante com web search à esquerda, sem web search à direita.
   - Cada coluna: tabela rank/produto/empresa/url, accordion "Justificativas" (uma por produto), `<details>` "Raw response" com JSON formatado.
   - Header com `runAt`, `weekIso`, `trigger`, modelo, total de tokens.

4. `app/api/runs/route.ts` — `GET` retornando `listRuns()` em JSON (uso interno do bump chart, não exposto publicamente além da auth).

5. `components/RunNowButton.tsx` (client component) — botão com `useTransition`, dispara server action, atualiza lista via `router.refresh()`.

**Critérios de Sucesso**:

Automatizados:
- [x] `npm run build` passa.
- [ ] ~~`npm run lint` limpo.~~ — Adaptação: `next lint` foi deprecado no Next 15 (será removido no 16) e exige migração interativa para ESLint CLI flat config. TypeScript strict + build cobrem o essencial nesta fase; lint pode ser configurado depois.

Manuais:
- [ ] Lista mostra runs em ordem decrescente.
- [ ] **Rodar agora** cria nova run em ~30-50s e ela aparece no topo após refresh.
- [ ] Detalhe renderiza ambas as variantes; raw response abre/fecha; URLs dos produtos são clicáveis.
- [ ] Mobile: layout colapsa para coluna única sem quebrar.

---

### Fase 5: Bump chart

**Objetivo**: Visualização da evolução do ranking ao longo das semanas, com Jspreadsheet em destaque.

**Mudanças**:

1. `lib/chart.ts` — função `buildBumpData(runs: RunRecord[], variant: "with_web_search" | "without_web_search"): BumpDatum[]`:
   - Para cada `weekIso` (eixo X), pega a run **mais recente** daquela semana (manual ou cron).
   - Une todos os produtos vistos em qualquer semana → cada um vira uma série (`id`).
   - Para cada série em cada semana, `y = rank` se o produto aparece, ou `null` se não aparece (Nivo Bump suporta gaps).
   - Normaliza `id` por nome lowercase para colapsar variações ("Jspreadsheet" vs "jSpreadsheet").

2. `app/chart/page.tsx` — server component carrega runs, calcula dados das duas variantes, passa para client component.

3. `components/BumpChart.tsx` (client) — duas instâncias de `<ResponsiveBump />` empilhadas (ou tabs):
   - `lineWidth`: 4 para Jspreadsheet (`process.env.NEXT_PUBLIC_HIGHLIGHTED_BRAND` exposto via Next config), 2 para os demais.
   - `colors`: callback que retorna cor primária (ex.: `#f97316`) se `id.toLowerCase() === highlight.toLowerCase()`, paleta default caso contrário.
   - `pointSize` maior para a marca destacada.
   - Tooltip customizado mostrando rank e justificativa daquela semana.
   - Título acima de cada chart: "Com web search" / "Sem web search".

4. `next.config.ts` — expor `HIGHLIGHTED_BRAND` para o cliente como `NEXT_PUBLIC_HIGHLIGHTED_BRAND`.

**Critérios de Sucesso**:

Automatizados:
- [ ] `npm run build` passa, sem warnings de SSR/hydration.
- [ ] `buildBumpData` testada com fixture de 3 runs sintéticas → output corresponde ao snapshot esperado.

Manuais:
- [ ] Com 1 run só, chart renderiza ponto único por produto sem crashar.
- [ ] Com 4+ runs, linhas conectam corretamente entre semanas.
- [ ] Jspreadsheet destacado visualmente (cor + espessura) em ambos os charts.
- [ ] Hover mostra tooltip com justificativa daquela semana.
- [ ] Produtos que somem em alguma semana mostram gap, não interpolação fantasma.

---

## Notas de Implementação

- **Ordem recomendada de execução**: Fases 1 → 2 → 3 → 4 → 5. Fase 5 depende de ter pelo menos 2 runs persistidas para validar visualmente; se quiser testar antes, popular Blob com fixtures.
- **Custos**: Sonnet 4.6 com web search ~ $0.005-0.02 por chamada. 2 chamadas/semana × 52 semanas ≈ $1-2/ano. Vercel Blob free tier (1GB store, 10GB bandwidth) sobra muito para JSONs de poucos KB.
- **Determinismo**: cada run captura snapshot **daquela** semana — re-rodar manualmente uma semana já registrada cria nova run com novo `id` (timestamp); o bump chart usa a mais recente da semana. Não há mutação de runs antigas.
- **Riscos conhecidos**:
  - Modelo pode retornar nomes de produtos com grafias variáveis ("Jspreadsheet" vs "JSpreadsheet" vs "jSpreadsheet CE"). Mitigação: normalização lowercase em `buildBumpData`. Se virar problema, adicionar mapeamento manual em env (`PRODUCT_ALIASES`).
  - Se a tool `web_search` for renomeada/versionada, a Fase 1 quebra silenciosamente (modelo ignora a tool desconhecida). Mitigação: log explícito quando a variante "with_web_search" não tem nenhum `tool_use` de web_search no raw response, e alerta visual no detalhe.
  - Sessão `iron-session` num cookie único — se o `SESSION_SECRET` vazar, qualquer um pode forjar. Rotacionar é trivial (mudar env → invalida todas as sessões).
- **Não-objetivos** (explicitamente fora de escopo):
  - Multi-usuário, RBAC, audit log de quem disparou trigger manual.
  - Comparação entre modelos diferentes (Opus vs Sonnet vs Haiku) na mesma run.
  - Alertas (email/Slack) quando Jspreadsheet sai do top N.
  - Edição do prompt pela UI — mudança requer alterar env var e redeploy (intencional, prompt é parte do "experimento").
