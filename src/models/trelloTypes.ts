/**
 * Типы данных для интеграции с Trello API
 */

/**
 * Метка (Label) в Trello
 */
export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

/**
 * Элемент чеклиста в Trello
 */
export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  pos: number;
}

/**
 * Чеклист в Trello
 */
export interface TrelloChecklist {
  id: string;
  name: string;
  idCard: string;
  checkItems: TrelloCheckItem[];
}

/**
 * Карточка (Card) в Trello
 */
export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  labels: TrelloLabel[];
  due?: string | null;
  dueComplete: boolean;
  dateLastActivity: string;
  checklists?: TrelloChecklist[];
  url: string;
  closed: boolean;
}

/**
 * Список (List) в Trello
 */
export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
  closed: boolean;
  pos: number;
}

/**
 * Доска (Board) в Trello
 */
export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
}

/**
 * Конфигурация подключения к Trello
 */
export interface TrelloConfig {
  apiKey: string;
  token: string;
  boardId?: string;
  listIds?: string[];
}

/**
 * Результат валидации конфигурации Trello
 */
export interface TrelloConfigValidation {
  isValid: boolean;
  error?: string;
}
