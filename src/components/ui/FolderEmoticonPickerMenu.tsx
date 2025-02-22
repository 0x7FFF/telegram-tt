import { FC, type TeactNode, useMemo } from '../../lib/teact/teact';
import React, {
  memo, useEffect, useState,
} from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { ApiSticker } from '../../api/types';
import type { MenuPositionOptions } from './Menu';

import { selectIsContextMenuTranslucent, selectTabState } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';

import useAppLayout from '../../hooks/useAppLayout';
import useLastCallback from '../../hooks/useLastCallback';
import useMouseInside from '../../hooks/useMouseInside';
import useOldLang from '../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../hooks/useShowTransitionDeprecated';

import CustomEmojiPicker from '../common/CustomEmojiPicker';
import Icon from '../common/icons/Icon';
import EmojiPickerWithExtra from '../middle/composer/EmojiPickerWithExtra';
import SymbolMenuFooter, { SymbolMenuTabs } from '../middle/composer/SymbolMenuFooter';
import Button from './Button';
import Menu from './Menu';
import Portal from './Portal';
import Transition from './Transition';
import { EMOTICON_TO_SVG } from './FolderIconEmojis';
import EmojiButton from '../middle/composer/EmojiButton';

const ANIMATION_DURATION = 350;
const STICKERS_TAB_INDEX = 2;

export type OwnProps = {
  isOpen: boolean;
  idPrefix: string;
  onLoad: () => void;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  onCustomEmojiSelect: (emoji: ApiSticker) => void;
  className?: string;
}
& MenuPositionOptions;

type StateProps = {
  isBackgroundTranslucent?: boolean;
};

let isActivated = false;

const FolderEmoticonPickerMenu: FC<OwnProps & StateProps> = ({
  isOpen,
  idPrefix,
  className,
  isBackgroundTranslucent,
  onLoad,
  onClose,
  onEmojiSelect,
  onCustomEmojiSelect,
  ...menuPositionOptions
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const { isMobile } = useAppLayout();

  const [handleMouseEnter, handleMouseLeave] = useMouseInside(isOpen, onClose, undefined, isMobile);
  const { shouldRender, transitionClassNames } = useShowTransitionDeprecated(isOpen, onClose, false, false);

  const lang = useOldLang();

  if (!isActivated && isOpen) {
    isActivated = true;
  }

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  const handleEmojiSelect = useLastCallback((emoji: string, name: string) => {
    onEmojiSelect(emoji);
  });

  const handleCustomEmojiSelect = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
  });

  const extraCategory = {
    id: 'folderIcons',
    name: 'folderIcons',
    showTitle: false,
    emojis: Object.entries(EMOTICON_TO_SVG)
      .map(([emoji, fc]) => {
        return fc({});
      }),
  };

  function renderContent(isActive: boolean, isFrom: boolean) {
    switch (activeTab) {
      case SymbolMenuTabs.Emoji:
        return (
          <EmojiPickerWithExtra
            className="picker-tab"
            onEmojiSelect={handleEmojiSelect}
            extraCategory={extraCategory}
          />
        );
      case SymbolMenuTabs.CustomEmoji:
        return (
          <CustomEmojiPicker
            className="picker-tab"
            isHidden={!isOpen || !isActive}
            idPrefix={idPrefix}
            loadAndPlay={isOpen && (isActive || isFrom)}
            isTranslucent={!isMobile && isBackgroundTranslucent}
            onCustomEmojiSelect={handleCustomEmojiSelect}
          />
        );
    }

    return undefined;
  }

  function stopPropagation(event: any) {
    event.stopPropagation();
  }

  const content = (
    <>
      <div className="SymbolMenu-main" onClick={stopPropagation}>
        {isActivated && (
          <Transition
            name="slide"
            activeKey={activeTab}
            renderCount={2} // Object.values({}).length}
          >
            {renderContent}
          </Transition>
        )}
      </div>
      {isMobile && (
        <Button
          round
          faded
          color="translucent"
          ariaLabel={lang('Close')}
          className="symbol-close-button"
          size="tiny"
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      )}
      <SymbolMenuFooter
        activeTab={activeTab}
        onSwitchTab={setActiveTab}
        canSearch={false}
        isAttachmentModal
        canSendPlainText
      />
    </>
  );

  if (isMobile) {
    if (!shouldRender) {
      return undefined;
    }

    const mobileClassName = buildClassName(
      'SymbolMenu mobile-menu',
      transitionClassNames,
      'left-column-open',
      'in-attachment-modal',
    );

    return (
      <div className={mobileClassName}>
        {content}
      </div>
    );
  }

  return (
    <Menu
      isOpen={isOpen}
      onClose={onClose}
      withPortal // ={isAttachmentModal}
      className={buildClassName('SymbolMenu', className)}
      onCloseAnimationEnd={onClose}
      onMouseEnter={!IS_TOUCH_ENV ? handleMouseEnter : undefined}
      onMouseLeave={!IS_TOUCH_ENV ? handleMouseLeave : undefined}
      noCloseOnBackdrop={!IS_TOUCH_ENV}
      noCompact
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...menuPositionOptions}
    >
      {content}
    </Menu>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    return {
      isBackgroundTranslucent: selectIsContextMenuTranslucent(global),
    };
  },
)(FolderEmoticonPickerMenu));
