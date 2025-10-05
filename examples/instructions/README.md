# Примеры инструкций для TaskFlow

Эта папка содержит примеры кастомных инструкций, которые можно использовать с TaskFlow для настройки генерации кода через GitHub Copilot.

## Как использовать

### Вариант 1: Копирование в проект
```bash
# Скопируйте нужные инструкции в ваш проект
cp examples/instructions/*.md .github/.task_flow/.instructions/
```

### Вариант 2: Через UI
1. Откройте раздел "Инструкции" в TaskFlow
2. Нажмите "+" для создания новой инструкции
3. Скопируйте содержимое из примера
4. Сохраните

## Доступные примеры

### 1. REST API разработка (`rest_api.md`)
**Для чего**: Создание RESTful API endpoints

**Включает**:
- Express.js conventions
- Валидация и безопасность
- Обработка ошибок с правильными HTTP кодами
- Структура ответа API
- Логирование через Winston
- Документация и тестирование

**Используйте для задач**:
- "Создать endpoint /api/users"
- "Добавить authentication middleware"
- "Реализовать CRUD для продуктов"

### 2. React компоненты (`react_component.md`)
**Для чего**: Создание React компонентов с TypeScript

**Включает**:
- Функциональные компоненты с Hooks
- TypeScript типизация
- Styled Components или CSS Modules
- Performance оптимизации (memo, useCallback, useMemo)
- Accessibility (a11y)
- Тестирование

**Используйте для задач**:
- "Создать компонент UserCard"
- "Реализовать форму с валидацией"
- "Добавить модальное окно"

### 3. Unit тесты (`unit_tests.md`)
**Для чего**: Написание качественных unit-тестов

**Включает**:
- Jest и Testing Library
- AAA Pattern (Arrange-Act-Assert)
- Mocking и fixtures
- Асинхронное тестирование
- Best practices
- Coverage guidelines

**Используйте для задач**:
- "Написать тесты для AuthService"
- "Добавить тесты для компонента Button"
- "Создать integration тесты"

## Создание собственных инструкций

### Формат файла
```markdown
# Название инструкции
> Краткое описание

Основное содержимое инструкции для Copilot.

## Раздел 1
Детали...

## Раздел 2
Детали...
```

### Советы по созданию

1. **Будьте конкретны**
   - Укажите конкретные технологии и инструменты
   - Приведите примеры кода
   - Определите структуру файлов

2. **Добавьте правила**
   - Naming conventions
   - Code style
   - Best practices
   - Что делать и чего избегать

3. **Включите требования**
   - Обработка ошибок
   - Логирование
   - Тестирование
   - Документация

4. **Примеры**
   - Структура кода
   - Примеры использования
   - Edge cases

## Популярные инструкции

### Backend
- ✅ REST API (есть в примерах)
- GraphQL API
- Database migrations
- Background jobs
- WebSocket servers

### Frontend
- ✅ React components (есть в примерах)
- Vue components
- Angular components
- Redux/Vuex store
- Form validation

### Testing
- ✅ Unit tests (есть в примерах)
- Integration tests
- E2E tests
- Performance tests
- Security tests

### DevOps
- Docker containers
- CI/CD pipelines
- Infrastructure as Code
- Kubernetes manifests
- Monitoring setup

### Documentation
- API documentation
- README files
- Architecture diagrams
- User guides
- Release notes

## Организация инструкций

### По технологии
```
.instructions/
  backend/
    express_api.md
    graphql_schema.md
  frontend/
    react_component.md
    vue_component.md
  testing/
    unit_tests.md
    e2e_tests.md
```

### По типу задачи
```
.instructions/
  create/
    new_feature.md
    new_component.md
  fix/
    bug_fix.md
    refactoring.md
  test/
    unit_test.md
    integration_test.md
```

## Best Practices

### DO ✅
- Создавайте инструкции для часто повторяющихся задач
- Обновляйте инструкции когда меняются стандарты команды
- Версионируйте инструкции в Git
- Документируйте каждую инструкцию
- Делитесь инструкциями с командой

### DON'T ❌
- Не создавайте слишком общие инструкции
- Не дублируйте информацию между инструкциями
- Не забывайте обновлять устаревшие инструкции
- Не включайте секретные данные в инструкции
- Не делайте инструкции слишком длинными (>500 строк)

## Шаблон инструкции

```markdown
# [Название инструкции]
> [Краткое описание - одна строка]

[Вступление - для чего эта инструкция]

## Технологии
- [Список используемых технологий]

## Требования
- [Что должно быть реализовано]

## Структура
[Структура кода/файлов]

## Правила
[Conventions и best practices]

## Примеры
[Примеры кода]

## Избегай
[Что НЕ нужно делать]

## Тестирование
[Как тестировать]

## Документация
[Какая документация нужна]
```

## Вклад

Если вы создали полезную инструкцию, которая может помочь другим:
1. Отправьте Pull Request с новой инструкцией
2. Добавьте описание в этот README
3. Приведите примеры использования

## Ресурсы

- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [TaskFlow Documentation](../../docs/README.md)
- [Custom Instructions Feature](../../docs/CUSTOM_INSTRUCTIONS_FEATURE.md)

---

**Примечание**: Эти инструкции являются примерами. Адаптируйте их под свои нужды и стандарты команды.
