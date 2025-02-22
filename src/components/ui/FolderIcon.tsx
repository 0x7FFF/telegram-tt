import type { FC, TeactNode } from '../../lib/teact/teact';
import React, { memo } from '../../lib/teact/teact';

import { ALL_FOLDER_ID } from '../../config';
import renderText from '../common/helpers/renderText';
import { EMOTICON_TO_SVG } from './FolderIconEmojis';

type OwnProps = {
  folderId?: number;
  emoticon?: string | TeactNode;
};

const FolderIcon: FC<OwnProps> = ({
  folderId,
  emoticon,
}) => {
  if (emoticon && typeof emoticon !== 'string') {
    return emoticon;
  }

  let emoticonDef = folderId === ALL_FOLDER_ID ? '💬' : emoticon;

  if (!emoticonDef) {
    emoticonDef = '📁';
  }

  const FolderIconSvg = EMOTICON_TO_SVG[emoticonDef || '📁'];

  if (!FolderIconSvg) {
    return renderText(emoticonDef);
  }

  return <FolderIconSvg />;
};

export default memo(FolderIcon);
