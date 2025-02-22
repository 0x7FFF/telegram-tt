import type { FC, TeactNode } from '../../../lib/teact/teact';
import React, { memo } from '../../../lib/teact/teact';

import { BASE_URL, IS_PACKAGED_ELECTRON } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import { handleEmojiLoad, LOADED_EMOJIS } from '../../../util/emoji/emoji';
import { IS_EMOJI_SUPPORTED } from '../../../util/windowEnvironment';

import useLastCallback from '../../../hooks/useLastCallback';

import './EmojiButton.scss';
import type { Emoji } from '../../../@types/global';

type OwnProps = {
  emoji: Emoji;
  overrideImg?: TeactNode;
  focus?: boolean;
  onClick: (emoji: string, name: string) => void;
};

const EmojiButton: FC<OwnProps> = ({
  emoji,
  overrideImg,
  focus,
  onClick,
}) => {
  const handleClick = useLastCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Preventing safari from losing focus on Composer MessageInput
    e.preventDefault();

    onClick(emoji.native, emoji.id);
  });

  const className = buildClassName(
    'EmojiButton',
    focus && 'focus',
  );

  let src;
  let isLoaded;

  if (!overrideImg) {
    src = `${IS_PACKAGED_ELECTRON ? BASE_URL : '.'}/img-apple-64/${emoji.image}.png`;
    isLoaded = LOADED_EMOJIS.has(src);
  }

  return (
    <div
      className={className}
      onMouseDown={handleClick}
      title={`:${emoji.names[0]}:`}
    >
      {overrideImg
        ? (
          <span
            className={!isLoaded ? 'opacity-transition shown' : undefined}
            title={emoji.native}
          >
            {overrideImg}
          </span>
        )
        : (IS_EMOJI_SUPPORTED ? emoji.native : (
          <img
            src={src}
            className={!isLoaded ? 'opacity-transition shown' : undefined}
            alt={emoji.native}
            loading="lazy"
            data-path={src}
            onLoad={!isLoaded ? handleEmojiLoad : undefined}
            draggable={false}
          />
        ))
      }
    </div>
  );
};

export default memo(EmojiButton);
