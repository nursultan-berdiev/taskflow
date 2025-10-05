# REST API разработка
> Создание RESTful API endpoints с лучшими практиками

Пожалуйста, помоги мне создать REST API endpoint следуя этим правилам и лучшим практикам:

## Технологии
- Используй Express.js framework
- TypeScript для типизации
- Async/await для асинхронных операций

## Валидация и безопасность
- Добавь валидацию входных данных через Joi или class-validator
- Санитизация входных данных для предотвращения XSS и SQL injection
- Используй helmet для безопасности заголовков
- Rate limiting для защиты от DDoS

## Обработка ошибок
- Реализуй централизованную обработку ошибок
- Используй правильные HTTP статус коды:
  - 200 OK - успешный GET/PUT/PATCH
  - 201 Created - успешный POST
  - 204 No Content - успешный DELETE
  - 400 Bad Request - ошибка валидации
  - 401 Unauthorized - требуется аутентификация
  - 403 Forbidden - доступ запрещён
  - 404 Not Found - ресурс не найден
  - 500 Internal Server Error - серверная ошибка
- Добавь понятные сообщения об ошибках

## Документация
- JSDoc комментарии для каждого endpoint
- Swagger/OpenAPI документация
- Примеры запросов и ответов

## RESTful conventions
- GET /api/users - получить список
- GET /api/users/:id - получить один объект
- POST /api/users - создать новый
- PUT /api/users/:id - полное обновление
- PATCH /api/users/:id - частичное обновление
- DELETE /api/users/:id - удалить

## Структура ответа
Используй стандартную структуру для всех ответов:

**Успешный ответ:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

**Ответ с ошибкой:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [...]
  }
}
```

## Логирование
- Используй winston для логирования
- Логируй все входящие запросы
- Логируй все ошибки с stack trace
- Не логируй чувствительные данные (пароли, токены)

## Тестирование
- Добавь комментарий с примерами для тестирования через curl или Postman
- Предложи unit тесты для бизнес-логики
- Предложи integration тесты для endpoints

## Производительность
- Используй пагинацию для списков (limit, offset)
- Кэширование для часто запрашиваемых данных
- Compression middleware для gzip
- Оптимизация запросов к БД (избегай N+1 проблему)
