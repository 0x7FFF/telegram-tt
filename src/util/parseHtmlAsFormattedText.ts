import type { ApiFormattedText, ApiMessageEntity } from '../api/types';
import { ApiMessageEntityTypes } from '../api/types';

import { RE_LINK_TEMPLATE } from '../config';
import { IS_EMOJI_SUPPORTED } from './windowEnvironment';

interface MarkdownNode {
  type: 'text' | 'bold' | 'italic' | 'code' | 'pre' | 'strike' | 'underline' | 'blockquote' | 'link' | 'customEmoji';
  content: string;
  children?: MarkdownNode[];
  meta?: {
    language?: string;
    url?: string;
    documentId?: string;
  };
}
interface MarkdownMatch {
  type: string;
  match: RegExpMatchArray;
  index: number;
}

export const ENTITY_CLASS_BY_NODE_NAME: Record<string, ApiMessageEntityTypes> = {
  B: ApiMessageEntityTypes.Bold,
  STRONG: ApiMessageEntityTypes.Bold,
  I: ApiMessageEntityTypes.Italic,
  EM: ApiMessageEntityTypes.Italic,
  INS: ApiMessageEntityTypes.Underline,
  U: ApiMessageEntityTypes.Underline,
  S: ApiMessageEntityTypes.Strike,
  STRIKE: ApiMessageEntityTypes.Strike,
  DEL: ApiMessageEntityTypes.Strike,
  CODE: ApiMessageEntityTypes.Code,
  PRE: ApiMessageEntityTypes.Pre,
  BLOCKQUOTE: ApiMessageEntityTypes.Blockquote,
};

const MAX_TAG_DEEPNESS = 3;

function parseMarkdownToAst(text: string): MarkdownNode[] {
  const ast: MarkdownNode[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    // Define explicit types for matches
    const patterns: Record<string, RegExp> = {
      bold: /\*\*(.+?)\*\*/,
      italic: /__(.+?)__/,
      code: /`([^`]+)`/,
      pre: /```(\w*)\n?([\s\S]+?)```/,
      strike: /~~(.+?)~~/,
      link: /\[([^\]]+)]\(([^)]+)\)/,
      customEmoji: /\[([^\]]+)]\(customEmoji:(\d+)\)/
    };

    // Find all matches with their positions
    const matches: MarkdownMatch[] = Object.entries(patterns)
      .map(([type, pattern]) => {
        const match = text.slice(currentPos).match(pattern);
        if (match && match.index !== undefined) {
          return {
            type,
            match,
            index: match.index
          };
        }
        return null;
      })
      .filter((match): match is MarkdownMatch => match !== null);

    // Find earliest match
    const earliestMatch = matches.reduce<MarkdownMatch | null>((earliest, current) => {
      if (!earliest || current.index < earliest.index) {
        return current;
      }
      return earliest;
    }, null);

    if (earliestMatch) {
      // Add text before the match if any
      if (earliestMatch.index > 0) {
        ast.push({
          type: 'text',
          content: text.slice(currentPos, currentPos + earliestMatch.index)
        });
      }

      // Process the match based on type
      const {type, match} = earliestMatch;
      switch (type) {
        case 'pre':
          ast.push({
            type: 'pre',
            content: match[2],
            meta: {
              language: match[1] || ''
            }
          });
          break;

        case 'link':
          ast.push({
            type: 'link',
            content: match[1],
            meta: {
              url: match[2]
            }
          });
          break;

        case 'customEmoji':
          ast.push({
            type: 'customEmoji',
            content: match[1],
            meta: {
              documentId: match[2]
            }
          });
          break;

        default:
          ast.push({
            type: type as MarkdownNode['type'],
            content: match[1]
          });
      }

      currentPos += earliestMatch.index + match[0].length;
    } else {
      // No more matches, add remaining text
      ast.push({
        type: 'text',
        content: text.slice(currentPos)
      });
      break;
    }
  }

  return ast;
}

function renderAstToHtml(ast: MarkdownNode[]): string {
  return ast.map(node => {
    switch (node.type) {
      case 'text':
        return node.content;
      case 'bold':
        return `<b>${node.content}</b>`;
      case 'italic':
        return `<i>${node.content}</i>`;
      case 'code':
        return `<code>${node.content}</code>`;
      case 'pre':
        return `<pre${node.meta?.language ? ` data-language="${node.meta.language}"` : ''}>${node.content}</pre>`;
      case 'strike':
        return `<s>${node.content}</s>`;
      case 'link':
        return `<a href="${node.meta?.url}">${node.content}</a>`;
      case 'customEmoji':
        return `<img alt="${node.content}" data-document-id="${node.meta?.documentId}">`;
      default:
        return node.content;
    }
  }).join('');
}

export default function parseHtmlAsFormattedText(
  html: string, withMarkdownLinks = false, skipMarkdown = false,
): ApiFormattedText {
  if (!skipMarkdown) {
    const ast = parseMarkdownToAst(html);
    html = renderAstToHtml(ast);
  }

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  fixImageContent(fragment);
  const text = fragment.innerText.trim().replace(/\u200b+/g, '');
  const trimShift = fragment.innerText.indexOf(text[0]);
  let textIndex = -trimShift;
  let recursionDeepness = 0;
  const entities: ApiMessageEntity[] = [];

  function addEntity(node: ChildNode) {
    if (node.nodeType === Node.COMMENT_NODE) return;
    const { index, entity } = getEntityDataFromNode(node, text, textIndex);

    if (entity) {
      textIndex = index;
      entities.push(entity);
    } else if (node.textContent) {
      // Skip newlines on the beginning
      if (index === 0 && node.textContent.trim() === '') {
        return;
      }
      textIndex += node.textContent.length;
    }

    if (node.hasChildNodes() && recursionDeepness <= MAX_TAG_DEEPNESS) {
      recursionDeepness += 1;
      Array.from(node.childNodes).forEach(addEntity);
    }
  }

  Array.from(fragment.childNodes).forEach((node) => {
    recursionDeepness = 1;
    addEntity(node);
  });

  return {
    text,
    entities: entities.length ? entities : undefined,
  };
}

export function fixImageContent(fragment: HTMLDivElement) {
  fragment.querySelectorAll('img').forEach((node) => {
    if (node.dataset.documentId) { // Custom Emoji
      node.textContent = (node as HTMLImageElement).alt || '';
    } else { // Regular emoji with image fallback
      node.replaceWith(node.alt || '');
    }
  });
}

function getEntityDataFromNode(
  node: ChildNode,
  rawText: string,
  textIndex: number,
): { index: number; entity?: ApiMessageEntity } {
  const type = getEntityTypeFromNode(node);

  if (!type || !node.textContent) {
    return {
      index: textIndex,
      entity: undefined,
    };
  }

  const rawIndex = rawText.indexOf(node.textContent, textIndex);
  // In some cases, last text entity ends with a newline (which gets trimmed from `rawText`).
  // In this case, `rawIndex` would return `-1`, so we use `textIndex` instead.
  const index = rawIndex >= 0 ? rawIndex : textIndex;
  const offset = rawText.substring(0, index).length;
  const { length } = rawText.substring(index, index + node.textContent.length);

  if (type === ApiMessageEntityTypes.TextUrl) {
    return {
      index,
      entity: {
        type,
        offset,
        length,
        url: (node as HTMLAnchorElement).href,
      },
    };
  }
  if (type === ApiMessageEntityTypes.MentionName) {
    return {
      index,
      entity: {
        type,
        offset,
        length,
        userId: (node as HTMLAnchorElement).dataset.userId!,
      },
    };
  }

  if (type === ApiMessageEntityTypes.Pre) {
    return {
      index,
      entity: {
        type,
        offset,
        length,
        language: (node as HTMLPreElement).dataset.language,
      },
    };
  }

  if (type === ApiMessageEntityTypes.CustomEmoji) {
    return {
      index,
      entity: {
        type,
        offset,
        length,
        documentId: (node as HTMLImageElement).dataset.documentId!,
      },
    };
  }

  return {
    index,
    entity: {
      type,
      offset,
      length,
    },
  };
}

function getEntityTypeFromNode(node: ChildNode): ApiMessageEntityTypes | undefined {
  if (node instanceof HTMLElement && node.dataset.entityType) {
    return node.dataset.entityType as ApiMessageEntityTypes;
  }

  if (ENTITY_CLASS_BY_NODE_NAME[node.nodeName]) {
    return ENTITY_CLASS_BY_NODE_NAME[node.nodeName];
  }

  if (node.nodeName === 'A') {
    const anchor = node as HTMLAnchorElement;
    if (anchor.dataset.entityType === ApiMessageEntityTypes.MentionName) {
      return ApiMessageEntityTypes.MentionName;
    }
    if (anchor.dataset.entityType === ApiMessageEntityTypes.Url) {
      return ApiMessageEntityTypes.Url;
    }
    if (anchor.href.startsWith('mailto:')) {
      return ApiMessageEntityTypes.Email;
    }
    if (anchor.href.startsWith('tel:')) {
      return ApiMessageEntityTypes.Phone;
    }
    if (anchor.href !== anchor.textContent) {
      return ApiMessageEntityTypes.TextUrl;
    }

    return ApiMessageEntityTypes.Url;
  }

  if (node.nodeName === 'SPAN') {
    return (node as HTMLElement).dataset.entityType as any;
  }

  if (node.nodeName === 'IMG') {
    if ((node as HTMLImageElement).dataset.documentId) {
      return ApiMessageEntityTypes.CustomEmoji;
    }
  }

  return undefined;
}
