# Unit Tests
> Написание качественных unit-тестов

Напиши unit-тесты следуя лучшим практикам тестирования:

## Фреймворк и инструменты
- Jest как test runner
- @testing-library (React Testing Library, Vue Testing Library и т.д.)
- jest-dom для DOM assertions
- MSW (Mock Service Worker) для API mocking
- faker.js для генерации тестовых данных

## Структура теста (AAA Pattern)
```typescript
describe('ComponentName', () => {
  it('should do something specific', () => {
    // Arrange - подготовка
    const input = createTestData();
    
    // Act - действие
    const result = functionUnderTest(input);
    
    // Assert - проверка
    expect(result).toBe(expectedValue);
  });
});
```

## Naming Convention
- Описательные названия тестов
- Используй "should" в начале: "should render correctly"
- Группируй связанные тесты в describe блоки
- Один assert на тест (когда возможно)

## Что тестировать

### Компоненты
- Рендеринг с различными props
- User interactions (click, input, submit)
- Conditional rendering
- State changes
- Side effects
- Error states
- Loading states
- Edge cases

### Функции
- Happy path (основной сценарий)
- Edge cases (граничные случаи)
- Error handling
- Различные типы входных данных
- Null/undefined handling

## Coverage
- Стремись к 80%+ code coverage
- 100% для критической бизнес-логики
- Не гонись за 100% везде - quality over quantity

## Mocking
```typescript
// Mock функции
const mockFn = jest.fn();

// Mock модуля
jest.mock('./module', () => ({
  function: jest.fn()
}));

// Mock API calls
beforeEach(() => {
  server.use(
    rest.get('/api/data', (req, res, ctx) => {
      return res(ctx.json({ data: 'mocked' }));
    })
  );
});
```

## Best Practices

### DO ✅
- Тестируй поведение, не реализацию
- Используй data-testid для элементов
- Cleanup после каждого теста
- Изолируй тесты (независимость)
- Mock внешние зависимости
- Тестируй асинхронный код правильно

### DON'T ❌
- Не тестируй implementation details
- Не дублируй логику в тестах
- Не используй snapshot тесты для всего
- Не пропускай error cases
- Не делай слишком сложные тесты

## Асинхронное тестирование
```typescript
// Async/await
it('should fetch data', async () => {
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});

// findBy (async query)
it('should show data', async () => {
  render(<Component />);
  
  const element = await screen.findByText('Data');
  expect(element).toBeInTheDocument();
});
```

## Testing Library queries приоритет
1. `getByRole` - самый доступный
2. `getByLabelText` - для форм
3. `getByPlaceholderText`
4. `getByText`
5. `getByDisplayValue`
6. `getByAltText`
7. `getByTitle`
8. `getByTestId` - последний resort

## Матчеры
```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);

// Arrays/Objects
expect(array).toContain(item);
expect(obj).toHaveProperty('key');

// DOM (jest-dom)
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent('text');
```

## Организация тестов
```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx  ← рядом с компонентом
      Button.styles.ts
```

## Setup и Teardown
```typescript
beforeAll(() => {
  // Один раз перед всеми тестами
});

beforeEach(() => {
  // Перед каждым тестом
});

afterEach(() => {
  // После каждого теста
  cleanup();
});

afterAll(() => {
  // Один раз после всех тестов
});
```

## Примеры комментариев
Добавь комментарии с примерами использования:
```typescript
/**
 * Example:
 * 
 * import { add } from './math';
 * 
 * const result = add(2, 3);
 * // result === 5
 */
```

## Performance Testing
Для производительности используй:
```typescript
it('should render efficiently', () => {
  const start = performance.now();
  render(<HeavyComponent />);
  const end = performance.now();
  
  expect(end - start).toBeLessThan(100); // ms
});
```

## Документация
- Комментарии для сложных test cases
- Explain "why" в комментариях, не "what"
- README с инструкциями по запуску тестов
