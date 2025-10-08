# Python

> Professional Clean Code Guidelines for Python

## Clean Code Principles

### 1. Readability and Clarity

- Code should be easily readable and self-documenting
- Use clear and descriptive names for variables, functions, and classes
- Avoid abbreviations unless they are widely accepted
- One level of abstraction per function
- Follow PEP 8 - official Python style guide

### 2. Structure and Organization

- Follow the Single Responsibility Principle
- Functions should be short and perform one task
- Classes should be compact and focus on one concept
- Logically group related code
- Use modules to organize code

### 3. Naming Conventions

- **Variables and functions**: use snake_case (`user_name`, `calculate_total`)
- **Classes**: use PascalCase (`TaskManager`, `UserService`)
- **Constants**: use UPPERCASE_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Private methods/attributes**: prefix with single underscore (`_internal_method`)
- **Boolean variables**: start with `is_`, `has_`, `can_` (`is_active`, `has_permission`)

### 4. Type Hints

- **Must** use type annotations for all functions and methods
- Specify types for parameters and return values
- Use types from `typing` module for complex structures
- Use `Optional`, `Union`, `List`, `Dict` where necessary

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

### 5. Documentation (Docstrings)

- **Must** add docstrings for all public functions, methods, and classes
- Use docstring format with parameter and return value descriptions
- Describe purpose, parameters, return values, and possible exceptions

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

### 6. Comments

- Code explains "what" and "how", comments explain "why"
- Avoid obvious comments
- Update comments when code changes

### 7. Error Handling

- Use specific exception types
- Don't use bare `except:`, always specify exception type
- Log errors with context (use `logging`, not `print`)
- Create custom exceptions for business logic

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

### 8. Django Specifics

- Use `select_related()` and `prefetch_related()` to avoid N+1 queries
- Apply indexes for frequently queried fields
- Use transactions for related operations
- Cache results of heavy queries where appropriate
- Validate data through DRF serializers

```python
# ❌ Bad - N+1 queries
users = User.objects.all()
for user in users:
    print(user.profile.bio)

# ✅ Good
users = User.objects.select_related('profile').all()
for user in users:
    print(user.profile.bio)
```

### 9. Formatting

- Look for linters and formatters in the project (e.g., ruff, black) and follow their recommendations
- Follow consistent formatting style (PEP 8)

### 10. Performance

- Use generators for large datasets
- Avoid creating objects in loops
- Use `tuple` for read-only collections instead of `list`
- Use list comprehensions instead of loops where appropriate
- Avoid premature optimization

```python
# ❌ Bad
result = []
for item in items:
    if item.is_active:
        result.append(item.name)

# ✅ Good
result = [item.name for item in items if item.is_active]

# ✅ Even better for read-only
result = tuple(item.name for item in items if item.is_active)
```

### 11. DRY (Don't Repeat Yourself)

- Avoid code duplication
- Extract repeating logic into separate functions or classes
- Use utilities and helpers
- Create base classes for common functionality

### 12. Constants and Magic Numbers

- Extract magic numbers and strings into constants
- Group related constants in classes or modules
- Use `Enum` for sets of related constants

```python
from enum import Enum

class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

# Constants at the top of the module
MAX_RETRY_COUNT = 3
DEFAULT_TIMEOUT = 30
API_VERSION = "v1"
```

### 13. Testing

- Write tests for critical business logic
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Use fixtures for data preparation

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

### 14. Security

- Never store passwords and secrets in code
- Use environment variables for sensitive data
- Validate all incoming data
- Use parameterized queries for SQL
- Apply CSRF protection in Django

### 15. Code Cleanliness

- Remove unused code and imports
- Don't create temporary files in project root
- Place temporary scripts only in `scripts/`
- Don't commit commented-out code
- Remove debug statements (`print`, `breakpoint`)

### 16. Terminal and File Rules

#### 🚫 STRICTLY PROHIBITED:

1. **Creating .md files outside the `docs/` folder**

   - ✅ Create documentation ONLY in `docs/`
   - ❌ DO NOT create `.md` files in project root or other folders

2. **Creating .sh or bash scripts**

   - ✅ Run commands directly in the terminal
   - ❌ DO NOT create `.sh`, `.bash` or any shell script files

3. **Commands that just output text**

   - ❌ DO NOT use `echo "Text"` to display messages
   - ✅ Use real commands to perform tasks

4. **Complex commands with &&**

   - ❌ DO NOT: `command1 && command2 && command3`
   - ✅ Run commands sequentially, waiting for each to complete

5. **Using sudo**
   - ❌ NEVER use `sudo` in commands
   - ✅ Work only as the current user
