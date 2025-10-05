# TaskFlow Extension Makefile
# Загрузка переменных окружения из .env файла
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Переменные
PACKAGE_NAME = taskflow
VSIX_FILE = $(shell ls -t *.vsix 2>/dev/null | head -n1)

# Цвета для вывода
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help install compile watch package publish clean test lint version-patch version-minor version-major

# Показать справку по командам
help:
	@echo "$(GREEN)TaskFlow Extension - Доступные команды:$(NC)"
	@echo ""
	@echo "  $(YELLOW)make install$(NC)          - Установить зависимости"
	@echo "  $(YELLOW)make compile$(NC)          - Скомпилировать TypeScript"
	@echo "  $(YELLOW)make watch$(NC)            - Запустить watch режим"
	@echo "  $(YELLOW)make test$(NC)             - Запустить тесты"
	@echo "  $(YELLOW)make lint$(NC)             - Проверить код линтером"
	@echo ""
	@echo "  $(YELLOW)make package$(NC)          - Создать .vsix пакет"
	@echo "  $(YELLOW)make publish$(NC)          - Опубликовать на Marketplace"
	@echo "  $(YELLOW)make publish-force$(NC)    - Опубликовать без проверок"
	@echo ""
	@echo "  $(YELLOW)make version-patch$(NC)    - Увеличить patch версию (2.2.1 -> 2.2.2)"
	@echo "  $(YELLOW)make version-minor$(NC)    - Увеличить minor версию (2.2.1 -> 2.3.0)"
	@echo "  $(YELLOW)make version-major$(NC)    - Увеличить major версию (2.2.1 -> 3.0.0)"
	@echo ""
	@echo "  $(YELLOW)make clean$(NC)            - Удалить временные файлы"
	@echo "  $(YELLOW)make help$(NC)             - Показать эту справку"
	@echo ""

# Установить зависимости
install:
	@echo "$(GREEN)Установка зависимостей...$(NC)"
	npm install

# Скомпилировать TypeScript
compile:
	@echo "$(GREEN)Компиляция TypeScript...$(NC)"
	npm run compile

# Запустить watch режим
watch:
	@echo "$(GREEN)Запуск watch режима...$(NC)"
	npm run watch

# Запустить тесты
test:
	@echo "$(GREEN)Запуск тестов...$(NC)"
	npm test

# Проверить код линтером
lint:
	@echo "$(GREEN)Проверка кода линтером...$(NC)"
	npm run lint

# Создать .vsix пакет
package: compile
	@echo "$(GREEN)Создание .vsix пакета...$(NC)"
	vsce package --allow-missing-repository --baseContentUrl https://github.com/nursultan-berdiev/taskflow/raw/DEV-V2
	@echo "$(GREEN)Пакет создан: $(NC)$(shell ls -t *.vsix | head -n1)"

# Опубликовать на Marketplace (с проверками)
publish: compile
	@if [ -z "$(ACCESS_TOKEN)" ]; then \
		echo "$(RED)Ошибка: ACCESS_TOKEN не найден в .env файле$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Публикация расширения на Marketplace...$(NC)"
	vsce publish -p $(ACCESS_TOKEN) --allow-missing-repository --baseContentUrl https://github.com/nursultan-berdiev/taskflow/raw/DEV-V2
	@echo "$(GREEN)Расширение опубликовано!$(NC)"

# Опубликовать без дополнительных проверок (быстрая публикация)
publish-force:
	@if [ -z "$(ACCESS_TOKEN)" ]; then \
		echo "$(RED)Ошибка: ACCESS_TOKEN не найден в .env файле$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Быстрая публикация расширения...$(NC)"
	vsce publish -p $(ACCESS_TOKEN) --allow-missing-repository --baseContentUrl https://github.com/nursultan-berdiev/taskflow/raw/DEV-V2 --no-dependencies
	@echo "$(GREEN)Расширение опубликовано!$(NC)"

# Увеличить patch версию (2.2.1 -> 2.2.2)
version-patch:
	@echo "$(GREEN)Увеличение patch версии...$(NC)"
	npm version patch --no-git-tag-version
	@echo "$(GREEN)Новая версия:$(NC) $(shell node -p "require('./package.json').version")"

# Увеличить minor версию (2.2.1 -> 2.3.0)
version-minor:
	@echo "$(GREEN)Увеличение minor версии...$(NC)"
	npm version minor --no-git-tag-version
	@echo "$(GREEN)Новая версия:$(NC) $(shell node -p "require('./package.json').version")"

# Увеличить major версию (2.2.1 -> 3.0.0)
version-major:
	@echo "$(GREEN)Увеличение major версии...$(NC)"
	npm version major --no-git-tag-version
	@echo "$(GREEN)Новая версия:$(NC) $(shell node -p "require('./package.json').version")"

# Удалить временные файлы
clean:
	@echo "$(GREEN)Очистка временных файлов...$(NC)"
	rm -rf out/
	rm -rf node_modules/
	rm -f *.vsix
	@echo "$(GREEN)Очистка завершена!$(NC)"

# Полный цикл: версия -> пакет -> публикация
release-patch: version-patch package publish
	@echo "$(GREEN)Release patch версии завершен!$(NC)"

release-minor: version-minor package publish
	@echo "$(GREEN)Release minor версии завершен!$(NC)"

release-major: version-major package publish
	@echo "$(GREEN)Release major версии завершен!$(NC)"
