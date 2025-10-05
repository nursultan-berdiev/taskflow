# React Component

> Создание React компонентов с TypeScript и лучшими практиками

Создай React компонент следуя современным практикам разработки:

## Основные технологии

- React 18+ с функциональными компонентами
- TypeScript для типизации
- React Hooks (useState, useEffect, useCallback, useMemo и т.д.)
- Composition API pattern

## Структура компонента

```typescript
interface ComponentProps {
  // Props с JSDoc комментариями
}

export const ComponentName: React.FC<ComponentProps> = ({ props }) => {
  // Component logic
  return (
    // JSX
  );
};
```

## Типизация

- Создай интерфейс Props с подробными JSDoc комментариями
- Используй строгую типизацию для всех переменных и функций
- Экспортируй типы для переиспользования
- Используй generic types где необходимо

## Стилизация

- Styled Components или CSS Modules
- Мобильная адаптивность (responsive design)
- Темизация (поддержка светлой/тёмной темы)
- Accessibility (a11y) - ARIA атрибуты

## Хуки и логика

- Используй кастомные хуки для переиспользуемой логики
- useCallback для оптимизации callback функций
- useMemo для тяжёлых вычислений
- useEffect для side effects (правильные dependencies)
- Избегай useEffect где можно обойтись без него

## Производительность

- React.memo для предотвращения лишних рендеров
- Lazy loading для больших компонентов
- Code splitting где уместно
- Виртуализация для длинных списков (react-window)

## Обработка ошибок

- Error Boundaries для graceful error handling
- Fallback UI при ошибках загрузки
- Валидация props с PropTypes или TypeScript

## Доступность (Accessibility)

- Семантические HTML теги
- ARIA атрибуты для интерактивных элементов
- Keyboard navigation
- Screen reader friendly
- Color contrast соответствие WCAG

## Тестирование

- Unit тесты с React Testing Library
- Тестирование user interactions
- Snapshot тесты для UI
- Тестирование edge cases

## Документация

- JSDoc для компонента и всех props
- Примеры использования в комментариях
- Storybook stories (если уместно)

## Паттерны

- Container/Presentational pattern
- Render Props или Custom Hooks для sharing logic
- Composition over inheritance
- Controlled vs Uncontrolled components (правильный выбор)

## Организация кода

```typescript
// 1. Imports
import React, { useState, useEffect } from "react";

// 2. Types/Interfaces
interface Props {}

// 3. Styled components (если используются)
const StyledDiv = styled.div``;

// 4. Component
export const Component: React.FC<Props> = () => {
  // 4.1. Hooks
  const [state, setState] = useState();

  // 4.2. Handlers
  const handleClick = useCallback(() => {}, []);

  // 4.3. Effects
  useEffect(() => {}, []);

  // 4.4. Render
  return <div></div>;
};

// 5. Default props (если нужно)
Component.defaultProps = {};
```

## Избегай

- Прямые мутации state
- Inline functions в JSX (используй useCallback)
- Nested ternary operators
- Магические числа (используй constants)
- Слишком большие компоненты (разбивай на подкомпоненты)
