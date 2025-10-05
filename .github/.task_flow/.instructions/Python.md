# Python

> Инструкция по написанию профессионального чистого кода на Python

## Принципы чистого кода

### 1. Читаемость и понятность

- Код должен быть легко читаемым и самодокументируемым
- Используйте понятные и описательные имена для переменных, функций и классов
- Избегайте сокращений и аббревиатур, если они не общепринятые
- Один уровень абстракции на функцию
- Следуйте PEP 8 - официальному руководству по стилю Python

### 2. Структура и организация

- Следуйте принципу единственной ответственности (Single Responsibility Principle)
- Функции должны быть короткими и выполнять одну задачу
- Классы должны быть компактными и фокусироваться на одной концепции
- Логически группируйте связанный код
- Используйте модули для организации кода

### 3. Именование

- **Переменные и функции**: используйте snake_case (`user_name`, `calculate_total`)
- **Классы**: используйте PascalCase (`TaskManager`, `UserService`)
- **Константы**: используйте UPPERCASE_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Приватные методы/атрибуты**: префикс с одним подчеркиванием (`_internal_method`)
- **Булевы переменные**: начинайте с `is_`, `has_`, `can_` (`is_active`, `has_permission`)

### 4. Типизация

- **Обязательно** используйте аннотации типов для всех функций и методов
- Указывайте типы параметров и возвращаемых значений
- Используйте типы из модуля `typing` для сложных структур
- Применяйте `Optional`, `Union`, `List`, `Dict` где необходимо

```python
from typing import Optional, List, Dict
from decimal import Decimal

def process_payment(
    amount: Decimal,
    user_id: int,
    method: str,
    metadata: Optional[Dict[str, str]] = None
) -> PaymentResult:
    """Process payment transaction."""
    ...
```

### 5. Документация (Docstrings)

- **Обязательно** добавляйте docstring для всех публичных функций, методов и классов
- Используйте формат docstring с описанием параметров и возвращаемого значения
- Описывайте назначение, параметры, возвращаемые значения и возможные исключения

```python
def calculate_commission(
    amount: Decimal,
    rate: Decimal,
    user_tier: str
) -> Decimal:
    """
    Calculate commission based on amount and user tier.
    
    :param amount: Transaction amount in system currency
    :param rate: Commission rate as decimal (e.g., 0.015 for 1.5%)
    :param user_tier: User tier identifier (basic, premium, vip)
    :return: Calculated commission amount
    :raises ValueError: If rate is negative or user_tier is invalid
    """
    ...
```

### 6. Комментарии

- Код должен объяснять "что" и "как", комментарии - "почему"
- Избегайте очевидных комментариев
- Docstring на английском, описания разрешений на русском (согласно инструкции проекта)
- Обновляйте комментарии при изменении кода

### 7. Обработка ошибок

- Используйте специфичные типы исключений
- Не используйте голые `except:`, всегда указывайте тип исключения
- Логируйте ошибки с контекстом (используйте `logging`, не `print`)
- Создавайте собственные исключения для бизнес-логики

```python
import logging

try:
    result = perform_operation()
except ValueError as e:
    logging.error(f"Invalid value provided: {e}", exc_info=True)
    raise
except DatabaseError as e:
    logging.exception(f"Database error: {e}", exc_info=True)
    raise
```

### 8. Django специфика

- Используйте `select_related()` и `prefetch_related()` для избежания N+1 запросов
- Применяйте индексы для часто запрашиваемых полей
- Используйте транзакции для связанных операций
- Кешируйте результаты тяжелых запросов где уместно
- Валидация данных через сериализаторы DRF

```python
# ❌ Плохо - N+1 запросы
users = User.objects.all()
for user in users:
    print(user.profile.bio)

# ✅ Хорошо
users = User.objects.select_related('profile').all()
for user in users:
    print(user.profile.bio)
```

### 9. Форматирование

- Поищите в проекте линтеры и форматтеры (например ruff, black) и следуйте их рекомендациям.
- Соблюдайте единый стиль форматирования (PEP 8)

### 10. Производительность

- Используйте генераторы для больших наборов данных
- Избегайте создания объектов в циклах
- Используйте `tuple` для read-only коллекций вместо `list`
- Применяйте list comprehensions вместо циклов где уместно
- Избегайте преждевременной оптимизации

```python
# ❌ Плохо
result = []
for item in items:
    if item.is_active:
        result.append(item.name)

# ✅ Хорошо
result = [item.name for item in items if item.is_active]

# ✅ Еще лучше для read-only
result = tuple(item.name for item in items if item.is_active)
```

### 11. DRY (Don't Repeat Yourself)

- Избегайте дублирования кода
- Выносите повторяющуюся логику в отдельные функции или классы
- Используйте утилиты и хелперы
- Создавайте базовые классы для общей функциональности

### 12. Константы и магические числа

- Выносите магические числа и строки в константы
- Группируйте связанные константы в классы или модули
- Используйте `Enum` для наборов связанных констант

```python
from enum import Enum

class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

# Константы в верхней части модуля
MAX_RETRY_COUNT = 3
DEFAULT_TIMEOUT = 30
API_VERSION = "v1"
```

### 13. Тестирование

- Пишите тесты для критической бизнес-логики
- Используйте говорящие имена для тестов
- Следуйте паттерну Arrange-Act-Assert
- Используйте фикстуры для подготовки данных

```python
def test_calculate_commission_for_premium_user():
    # Arrange
    amount = Decimal("1000.00")
    rate = Decimal("0.015")
    user_tier = "premium"
    
    # Act
    commission = calculate_commission(amount, rate, user_tier)
    
    # Assert
    assert commission == Decimal("15.00")
```

### 14. Безопасность

- Никогда не храните пароли и секреты в коде
- Используйте переменные окружения для конфиденциальных данных
- Валидируйте все входящие данные
- Используйте параметризованные запросы для SQL
- Применяйте CSRF защиту в Django

### 15. Чистота кода

- Удаляйте неиспользуемый код и импорты
- Не создавайте временные файлы в корне проекта
- Временные скрипты размещайте только в `scripts/`
- Не коммитьте закомментированный код
- Удаляйте debug statements (`print`, `breakpoint`)
