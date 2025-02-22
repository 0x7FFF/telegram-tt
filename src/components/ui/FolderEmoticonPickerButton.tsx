import type { FC, TeactNode } from '../../lib/teact/teact';
import React, { memo, useRef, useState } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { ApiSticker } from '../../api/types';
import type { IAnchorPosition } from '../../types';

import buildClassName from '../../util/buildClassName';

import useFlag from '../../hooks/useFlag';
import useLastCallback from '../../hooks/useLastCallback';

import Icon from '../common/icons/Icon';
import Button from './Button';
import ResponsiveHoverButton from './ResponsiveHoverButton';
import Spinner from './Spinner';
import FolderEmoticonPickerMenu from './FolderEmoticonPickerMenu';
import { MenuPositionOptions } from '../../hooks/useMenuPosition';

type OwnProps = {
  isMobile?: boolean;
  isReady?: boolean;
  isSymbolMenuOpen?: boolean;
  idPrefix: string;
  forceDarkTheme?: boolean;
  openSymbolMenu: VoidFunction;
  closeSymbolMenu: VoidFunction;
  onCustomEmojiSelect: (emoji: ApiSticker) => void;
  onRemoveSymbol?: VoidFunction;
  onEmojiSelect: (emoji: string) => void;
  isSymbolMenuForced?: boolean;
  className?: string;
  icon?: TeactNode;
} & MenuPositionOptions;

const FolderEmoticonPickerButton: FC<OwnProps> = ({
  isMobile,
  isReady,
  isSymbolMenuOpen,
  idPrefix,
  isSymbolMenuForced,
  className,
  forceDarkTheme,
  openSymbolMenu,
  closeSymbolMenu,
  onCustomEmojiSelect,
  onRemoveSymbol,
  onEmojiSelect,
  icon,
  ...positionOptions
}) => {
  const {
    addRecentEmoji,
    addRecentCustomEmoji,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const triggerRef = useRef<HTMLDivElement>(null);

  const [isSymbolMenuLoaded, onSymbolMenuLoadingComplete] = useFlag();
  const [contextMenuAnchor, setContextMenuAnchor] = useState<IAnchorPosition | undefined>(undefined);

  const symbolMenuButtonClassName = buildClassName(
    'mobile-symbol-menu-button',
    !isReady && 'not-ready',
    isSymbolMenuLoaded
      ? (isSymbolMenuOpen && 'menu-opened')
      : (isSymbolMenuOpen && 'is-loading'),
  );

  const handleActivateSymbolMenu = useLastCallback(() => {
    openSymbolMenu();
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const {
      x,
      y,
    } = triggerEl.getBoundingClientRect();
    setContextMenuAnchor({
      x,
      y,
    });
  });

  const getTriggerElement = useLastCallback(() => triggerRef.current);
  const getRootElement = useLastCallback(() => triggerRef.current?.closest('.custom-scroll, .no-scrollbar'));
  const getMenuElement = useLastCallback(() => document.querySelector('#portals .SymbolMenu .bubble'));
  const getLayout = useLastCallback(() => ({ withPortal: true }));

  const iconElement = icon || <Icon name="smile"/>;

  return (
    <>
      {isMobile ? (
        <Button
          className={symbolMenuButtonClassName}
          round
          color="translucent"
          onClick={isSymbolMenuOpen ? closeSymbolMenu : openSymbolMenu}
          ariaLabel="Choose emoji, sticker or GIF"
        >
          {iconElement}
          <Icon name="keyboard"/>
          {isSymbolMenuOpen && !isSymbolMenuLoaded && <Spinner color="gray"/>}
        </Button>
      ) : (
        <ResponsiveHoverButton
          className={buildClassName('symbol-menu-button', isSymbolMenuOpen && 'activated')}
          round
          color="translucent"
          onActivate={handleActivateSymbolMenu}
          ariaLabel="Choose emoji, sticker or GIF"
        >
          <div ref={triggerRef} className="symbol-menu-trigger"/>
          {iconElement}
        </ResponsiveHoverButton>
      )}

      <FolderEmoticonPickerMenu
        isOpen={isSymbolMenuOpen || Boolean(isSymbolMenuForced)}
        idPrefix={idPrefix}
        onLoad={onSymbolMenuLoadingComplete}
        onClose={closeSymbolMenu}
        onEmojiSelect={onEmojiSelect}
        onCustomEmojiSelect={onCustomEmojiSelect}
        onRemoveSymbol={onRemoveSymbol}
        addRecentEmoji={addRecentEmoji}
        addRecentCustomEmoji={addRecentCustomEmoji}
        className={buildClassName(className, forceDarkTheme && 'component-theme-dark')}
        anchor={contextMenuAnchor}
        getTriggerElement={getTriggerElement}
        getRootElement={getRootElement}
        getMenuElement={getMenuElement}
        getLayout={getLayout}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...positionOptions}
      />
    </>
  );
};

export default memo(FolderEmoticonPickerButton);
