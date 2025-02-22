import type {
    ChangeEvent, FormEvent, RefObject,
  } from 'react';
  import { FC, TeactNode, useCallback } from '../../../../lib/teact/teact';
  import React from '../../../../lib/teact/teact';
  
  import buildClassName from '../../../../util/buildClassName';
  
  import useOldLang from '../../../../hooks/useOldLang';
  
  import './FolderNameInput.scss';
  import SymbolMenuButton from '../../../middle/composer/SymbolMenuButton';
  import useFlag from '../../../../hooks/useFlag';
  import type { ApiSticker } from '../../../../api/types';
  import useAppLayout from '../../../../hooks/useAppLayout';
  import FolderIcon from '../../../ui/FolderIcon';
  import useLastCallback from '../../../../hooks/useLastCallback';
  import FolderEmoticonPickerButton from '../../../ui/FolderEmoticonPickerButton';
  
  type OwnProps = {
    ref?: RefObject<HTMLInputElement>;
    id?: string;
    className?: string;
    value?: string;
    emoticon?: TeactNode;
    label?: string;
    error?: string;
    success?: string;
    disabled?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    autoComplete?: string;
    maxLength?: number;
    tabIndex?: number;
    teactExperimentControlled?: boolean;
    inputMode?: 'text' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onEmoticonChange: (e: string | ApiSticker) => void;
    onInput?: (e: FormEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  };
  
  const FolderNameInput: FC<OwnProps> = ({
    ref,
    id,
    className,
    value,
    emoticon,
    label,
    error,
    success,
    disabled,
    readOnly,
    placeholder,
    autoComplete,
    inputMode,
    maxLength,
    tabIndex,
    teactExperimentControlled,
    onChange,
    onEmoticonChange,
    onInput,
    onKeyPress,
    onKeyDown,
    onBlur,
    onPaste,
  }) => {
    const [isSymbolMenuOpen, openSymbolMenu, closeSymbolMenu] = useFlag();
    const lang = useOldLang();
    const labelText = error || success || label;
    const fullClassName = buildClassName(
      'input-group',
      value && 'touched',
      error ? 'error' : success && 'success',
      disabled && 'disabled',
      readOnly && 'disabled',
      labelText && 'with-label',
      className,
    );
    const { isMobile } = useAppLayout();
  
    const onEmojiSelect = useCallback((e) => {
      closeSymbolMenu();
      onEmoticonChange(e);
    }, [onEmoticonChange]);
  
    const getEmojiBubbleLayout = useLastCallback(() => {
      return {
        withPortal: true,
        topShiftY: -64,
        extraTopPadding: 40,
      };
    });
  
    return (
      <div
        className={buildClassName('FolderNameInput', fullClassName)}
        dir={lang.isRtl ? 'rtl' : undefined}
      >
        <input
          ref={ref}
          className="form-control"
          type="text"
          id={id}
          dir="auto"
          value={value || ''}
          tabIndex={tabIndex}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          readOnly={readOnly}
          onChange={onChange}
          onInput={onInput}
          onKeyPress={onKeyPress}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onPaste={onPaste}
          aria-label={labelText}
          teactExperimentControlled={teactExperimentControlled}
        />
        {labelText && (
          <label htmlFor={id}>{labelText}</label>
        )}
  
        <FolderEmoticonPickerButton
          isMobile={isMobile}
          isReady
          isSymbolMenuOpen={isSymbolMenuOpen}
          openSymbolMenu={openSymbolMenu}
          closeSymbolMenu={closeSymbolMenu}
          onCustomEmojiSelect={onEmojiSelect}
          onEmojiSelect={onEmojiSelect}
          positionY="top"
          positionX="right"
          isAttachmentModal={!isMobile}
          canSendPlainText
          idPrefix="folderEmoticon"
          forceDarkTheme={false}
          icon={<FolderIcon emoticon={emoticon} />}
          getLayout={getEmojiBubbleLayout}
        />
      </div>
    );
  };
  
  export default FolderNameInput;
  