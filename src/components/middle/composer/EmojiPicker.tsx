import type { FC } from '../../../lib/teact/teact';
import React, {
  memo,
} from '../../../lib/teact/teact';
import { withGlobal } from '../../../global';

import type { GlobalState } from '../../../global/types';
import { pick } from '../../../util/iteratees';
import './EmojiPicker.scss';
import EmojiPickerWithExtra from './EmojiPickerWithExtra';
import { RECENT_SYMBOL_SET_ID } from '../../../config';
import useOldLang from '../../../hooks/useOldLang';

type OwnProps = {
  className?: string;
  onEmojiSelect: (emoji: string, name: string) => void;
};

type StateProps = Pick<GlobalState, 'recentEmojis'>;

const EmojiPicker: FC<OwnProps & StateProps> = ({
  className,
  recentEmojis,
  onEmojiSelect,
}) => {
  const lang = useOldLang();

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <EmojiPickerWithExtra
      className={className}
      onEmojiSelect={onEmojiSelect}
      extraCategory={{
        id: RECENT_SYMBOL_SET_ID,
        name: lang('RecentStickers'),
        emojis: recentEmojis,
        showTitle: true,
      }}
    />
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => pick(global, ['recentEmojis']),
)(EmojiPicker));
