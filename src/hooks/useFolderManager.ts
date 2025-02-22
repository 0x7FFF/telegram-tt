import { useEffect, useMemo } from '../lib/teact/teact';

import {
  addChatsCountCallback,
  addOrderedIdsCallback,
  addUnreadCountersCallback,
  getChatsCount,
  getOrderedIds,
  getUnreadCounters,
} from '../util/folderManager';

import useForceUpdate from './useForceUpdate';
import { ALL_FOLDER_ID } from '../config';
import { getGlobal, withGlobal } from '../global';
import type { ApiChatFolder } from '../api/types';
import { MEMO_EMPTY_ARRAY } from '../util/memo';
import useLang from './useLang';

export function useFolderManagerForOrderedIds(folderId: number) {
  const forceUpdate = useForceUpdate();

  useEffect(() => addOrderedIdsCallback(folderId, forceUpdate), [folderId, forceUpdate]);

  return getOrderedIds(folderId);
}

export function useFolderManagerForUnreadCounters() {
  const forceUpdate = useForceUpdate();

  useEffect(() => addUnreadCountersCallback(forceUpdate), [forceUpdate]);

  return getUnreadCounters();
}

export function useFolderManagerForChatsCount() {
  const forceUpdate = useForceUpdate();

  useEffect(() => addChatsCountCallback(forceUpdate), [forceUpdate]);

  return getChatsCount();
}

export function useDisplayedFolders() {
  const global = getGlobal();
  const lang = useLang();

  const {
    chatFolders: {
      byId: chatFoldersById,
      orderedIds: orderedFolderIds,
    },
  } = global;

  const { foldersTabsView } = global.settings.byKey;

  const allChatsFolder: ApiChatFolder = useMemo(() => {
    return {
      id: ALL_FOLDER_ID,
      title: {
        text: orderedFolderIds?.[0] === ALL_FOLDER_ID && foldersTabsView === 'top' ? lang('FilterAllChatsShort') : lang('FilterAllChats'),
      },
      includedChatIds: MEMO_EMPTY_ARRAY,
      excludedChatIds: MEMO_EMPTY_ARRAY,
    } satisfies ApiChatFolder;
  }, [foldersTabsView, orderedFolderIds, lang]);

  return useMemo(() => {
    return orderedFolderIds
      ? orderedFolderIds.map((id) => {
        if (id === ALL_FOLDER_ID) {
          return allChatsFolder;
        }

        return chatFoldersById[id] || {};
      }).filter(Boolean)
      : undefined;
  }, [chatFoldersById, allChatsFolder, orderedFolderIds]);
};
