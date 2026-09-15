# Prompt cookbook

Бібліотека перевірених промптів команди. Кожен промпт — окремий файл за
структурою [`_template.md`](./_template.md), перевірений на реальній задачі
(ціль за замовчуванням — `app/`).

## Індекс

| Промпт | Що робить | Перевірено на |
|---|---|---|
| [`review-pr.md`](./review-pr.md) | Рев'ю дифу перед мержем (наданий приклад-планка, не рахується в 6) | `app/src/quote.ts` |
| [`add-tests.md`](./add-tests.md) | Тести на крайові випадки + фікс дефекту, який вони виявляють | `app/src/quote.ts` — знайшов і виправив дефект округлення в `splitInstallments` |
| [`debug-quote.md`](./debug-quote.md) | Дебаг за баг-репортом: repro → root cause → фікс + реґрес-тест | `app/src/quote.ts` — двічі: crash на невалідному/надмірному `parts` і дробовому `totalCents` (два діалекти, markdown + XML) |
| [`refactor-quote.md`](./refactor-quote.md) | Структурний рефакторинг без зміни поведінки | `app/src/quote.ts` — виніс `distributeRemainderCents`, тести не зачеплені |
| [`write-docs.md`](./write-docs.md) | Генерація README для модуля з перевіреними прикладами | `app/src/quote.ts` → `app/README.md` |
| [`review-changes.md`](./review-changes.md) | Рев'ю кумулятивного дифу перед PR (звірка код/тести/документація) | `git diff` цього репо — знайшов 2 реальні розбіжності, закриті `debug-quote.md` |
| [`integration-brief.md`](./integration-brief.md) | Чернетка брифу інтеграції із зовнішнім сервісом за тезами | синтетичний кейс "CRM lead sync" — повний вивід у [`integration-brief.sample-output.md`](./integration-brief.sample-output.md) |

> Мінімум — 6 штук (без шаблону й наданого прикладу `review-pr.md`), що
> покривають тести, рев'ю, документацію, рефакторинг, дебаг і одну задачу
> агенції. Шість промптів без шаблону й `review-pr.md` — усі перевірені;
> `review-pr.md` у цю шістку не входить (наданий приклад-планка, не наш).
>
> **Слабкий baseline** (`materials/weak-prompt.md`) також прогнано окремо:
> у цьому репо є `AGENTS.md`, тож агент не почав хаотично редагувати код —
> він прочитав контекст і зупинився на самому звіті, нічого не полагодивши.
> Це саме та проблема, яку слабкий промпт демонструє: без acceptance
> criteria агент сам вирішує межі задачі й критерій «готово» — в цьому
> випадку він вирішив зупинитись надто рано. Деталі — в нотатках
> `add-tests.md`.

## Task D (bonus): промпт → команда

2 промпти з цього cookbook піднято до slash-команд — генералізовані через
`$ARGUMENTS` (не хардкоджать `app/src/quote.ts`, працюють на будь-якому
файлі/дифі):

| Команда | З якого промпту | Перевірено на |
|---|---|---|
| [`.claude/commands/add-tests.md`](../.claude/commands/add-tests.md) | `add-tests.md` | `app/src/quote.ts` — [збережений прогін](../docs/command-test-evidence/add-tests-run.md) |
| [`.claude/commands/review-changes.md`](../.claude/commands/review-changes.md) | `review-changes.md` | `git diff` на `docs/`/`AGENTS.md` — [збережений прогін](../docs/command-test-evidence/review-changes-run.md), знайшов і закрив 4 реальні знахідки |

## Правила цієї бібліотеки

1. Один промпт — одна задача. Якщо в описі є «і ще», це два промпти.
2. Кожен промпт має **acceptance criteria**, які можна перевірити «так/ні».
3. Кожен промпт має **stop-правило** — де агент зупиняється.
4. Промпт без перевірки на реальній задачі у бібліотеку не потрапляє.
5. Змінюєте промпт — піднімайте `version` і пишіть, що саме змінилось.
