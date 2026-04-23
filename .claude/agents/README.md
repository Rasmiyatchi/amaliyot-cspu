# Subagents

Loyihaga xos subagentlar shu joyda saqlanadi. Har biri `.md` fayl, frontmatter bilan:

```markdown
---
name: agent-name
description: Qachon chaqirish kerakligi
tools: Read, Grep, Bash, Edit, Write
model: sonnet
---

Agent uchun instructions...
```

## Rejalashtirilgan agentlar

- **db-designer** — yangi model qo'shganda migration + schema + seed fayllarni sinxron qiladi
- **api-reviewer** — yangi endpoint'da konvensiya (URL, error format, auth) tekshiradi
- **uz-translator** — UI matnlarini uz/ru/en uchun i18n fayllarga qo'shadi
- **test-writer** — yangi service'ga pytest testlari yozadi

Hali yaratilmagan — avval asosiy skelet yozilsin, keyin qo'shamiz.
