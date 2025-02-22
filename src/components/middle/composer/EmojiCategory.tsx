import type { FC, TeactNode } from '../../../lib/teact/teact';
import React, { memo, useRef } from '../../../lib/teact/teact';

import type { ObserveFn } from '../../../hooks/useIntersectionObserver';

import { EMOJI_SIZE_PICKER, RECENT_SYMBOL_SET_ID } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import windowSize from '../../../util/windowSize';
import { REM } from '../../common/helpers/mediaDimensions';

import useAppLayout from '../../../hooks/useAppLayout';
import { useOnIntersect } from '../../../hooks/useIntersectionObserver';
import useMediaTransitionDeprecated from '../../../hooks/useMediaTransitionDeprecated';
import useOldLang from '../../../hooks/useOldLang';

import EmojiButton from './EmojiButton';
import { AllEmojis } from '../../../@types/global';

type EmojiCategoryData = { id: string; name: string; emojis: TeactNode[]; showTitle?: boolean };

const EMOJIS_PER_ROW_ON_DESKTOP = 8;
const EMOJI_MARGIN = 0.625 * REM;
const EMOJI_VERTICAL_MARGIN = 0.25 * REM;
const EMOJI_VERTICAL_MARGIN_MOBILE = 0.5 * REM;
const MOBILE_CONTAINER_PADDING = 0.5 * REM;

type OwnProps = {
  category: EmojiCategoryData;
  showTitle?: boolean;
  index: number;
  allEmojis: AllEmojis;
  observeIntersection: ObserveFn;
  shouldRender: boolean;
  onEmojiSelect: (emoji: string, name: string) => void;
};

const EmojiCategory: FC<OwnProps> = ({
  category,
  index,
  allEmojis,
  observeIntersection,
  shouldRender,
  onEmojiSelect,
}) => {
  // eslint-disable-next-line no-null/no-null
  const ref = useRef<HTMLDivElement>(null);

  useOnIntersect(ref, observeIntersection);

  const transitionClassNames = useMediaTransitionDeprecated(shouldRender);

  const lang = useOldLang();
  const { isMobile } = useAppLayout();

  const emojisPerRow = isMobile
    ? Math.floor(
      (windowSize.get().width - MOBILE_CONTAINER_PADDING + EMOJI_MARGIN) / (EMOJI_SIZE_PICKER + EMOJI_MARGIN),
    )
    : EMOJIS_PER_ROW_ON_DESKTOP;
  const height = Math.ceil(category.emojis.length / emojisPerRow)
    * (EMOJI_SIZE_PICKER + (isMobile ? EMOJI_VERTICAL_MARGIN_MOBILE : EMOJI_VERTICAL_MARGIN));

  let categoryName;
  const showTitle = category.showTitle !== false;

  if (showTitle) {
    if (category.id === RECENT_SYMBOL_SET_ID) {
      categoryName = lang('RecentStickers');
    } else {
      categoryName = category.name;
    }
  }

  return (
    <div
      ref={ref}
      key={category.id}
      id={`emoji-category-${index}`}
      className="symbol-set"
    >
      {showTitle !== false && (
        <div className="symbol-set-header">
          <p className="symbol-set-name" dir="auto">
            {categoryName}
          </p>
        </div>
      )}
      <div
        className={buildClassName('symbol-set-container', transitionClassNames)}
        style={`height: ${height}px;`}
        dir={lang.isRtl ? 'rtl' : undefined}
      >
        {shouldRender && category.emojis.map((node: TeactNode) => {
          let emoji;
          let displayedEmoji;

          if (typeof node === 'string') {
            emoji = allEmojis[node];
            // Recent emojis may contain emoticons that are no longer in the list
          } else {
            // extract emoji from title
            try {
              const emojiChar = node.children.find((c) => c.tag === 'title').children[0].value;
              emoji = {
                id: emojiChar,
                names: emojiChar,
                native: emojiChar,
                image: emojiChar,
              };
            } catch (err) {
              return undefined;
            }
          }

          if (!emoji) {
            return undefined;
          }
          // Some emojis have multiple skins and are represented as an Object with emojis for all skins.
          // For now, we select only the first emoji with 'neutral' skin.
          displayedEmoji = 'id' in emoji ? emoji : emoji[1];
          return (
            <EmojiButton
              key={displayedEmoji.id}
              emoji={displayedEmoji}
              overrideImg={typeof node !== 'string' ? node : undefined}
              onClick={onEmojiSelect}
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(EmojiCategory);
