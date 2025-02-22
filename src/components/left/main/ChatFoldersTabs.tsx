import type { FC, RefObject, TeactNode } from '../../../lib/teact/teact';
import React, { memo, useEffect, useMemo, useRef } from '../../../lib/teact/teact';
import { getActions, getGlobal, withGlobal } from '../../../global';

import { ApiChatFolder, ApiChatlistExportedInvite, ApiMessageEntityTypes } from '../../../api/types';
import type { ISettings } from '../../../types';
import type { MenuItemContextAction } from '../../ui/ListItem';
import type { TabWithProperties } from '../../ui/TabList';
import TabList from '../../ui/TabList';

import { ALL_FOLDER_ID } from '../../../config';
import { selectCanShareFolder, selectTabState } from '../../../global/selectors';
import { selectCurrentLimit } from '../../../global/selectors/limits';
import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { captureEvents, SwipeDirection } from '../../../util/captureEvents';
import { IS_TOUCH_ENV } from '../../../util/windowEnvironment';
import { renderTextWithEntities } from '../../common/helpers/renderTextWithEntities';

import { useDisplayedFolders, useFolderManagerForUnreadCounters } from '../../../hooks/useFolderManager';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useShowTransition from '../../../hooks/useShowTransition';
import FolderIcon from '../../ui/FolderIcon';
import './ChatFoldersTabs.scss';

type OwnProps = {
  shouldHideFolderTabs?: boolean;
  isForumPanelOpen?: boolean;
  transitionRef?: RefObject<HTMLDivElement>;
  foldersTabsView: ISettings['foldersTabsView'];
};

type StateProps = {
  chatFoldersById: Record<number, ApiChatFolder>;
  folderInvitesById: Record<number, ApiChatlistExportedInvite[]>;
  orderedFolderIds?: number[];
  activeChatFolder: number;
  currentUserId?: string;
  maxFolders: number;
  maxChatLists: number;
  maxFolderInvites: number;
};

const SAVED_MESSAGES_HOTKEY = '0';
const FIRST_FOLDER_INDEX = 0;

const ChatFoldersTabs: FC<OwnProps & StateProps> = ({
  chatFoldersById,
  orderedFolderIds,
  activeChatFolder,
  currentUserId,
  isForumPanelOpen,
  maxFolders,
  maxChatLists,
  shouldHideFolderTabs,
  folderInvitesById,
  maxFolderInvites,
  foldersTabsView,
  transitionRef,
}) => {
  const {
    loadChatFolders,
    setActiveChatFolder,
    openChat,
    openShareChatFolderModal,
    openDeleteChatFolderModal,
    openEditChatFolder,
    openLimitReachedModal,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const lang = useLang();

  useEffect(() => {
    loadChatFolders();
  }, []);

  const {
    ref,
  } = useShowTransition({
    isOpen: true,
    className: false,
    withShouldRender: true,
  });

  const displayedFolders = useDisplayedFolders();

  const isInFirstFolder = FIRST_FOLDER_INDEX === activeChatFolder;

  const folderCountersById = useFolderManagerForUnreadCounters();
  const folderTabs = useMemo(() => {
    if (!displayedFolders || !displayedFolders.length) {
      return [];
    }

    return displayedFolders.map((folder, i) => {
      const { id, title } = folder;
      const isBlocked = id !== ALL_FOLDER_ID && i > maxFolders - 1;
      const canShareFolder = selectCanShareFolder(getGlobal(), id);
      const contextActions: MenuItemContextAction[] = [];

      if (canShareFolder) {
        contextActions.push({
          title: lang('FilterShare'),
          icon: 'link',
          handler: () => {
            const chatListCount = Object.values(chatFoldersById).reduce((acc, el) => acc + (el.isChatList ? 1 : 0), 0);
            if (chatListCount >= maxChatLists && !folder.isChatList) {
              openLimitReachedModal({
                limit: 'chatlistJoined',
              });
              return;
            }

            // Greater amount can be after premium downgrade
            if (folderInvitesById[id]?.length >= maxFolderInvites) {
              openLimitReachedModal({
                limit: 'chatlistInvites',
              });
              return;
            }

            openShareChatFolderModal({
              folderId: id,
            });
          },
        });
      }

      if (id !== ALL_FOLDER_ID) {
        contextActions.push({
          title: lang('FilterEdit'),
          icon: 'edit',
          handler: () => {
            openEditChatFolder({ folderId: id });
          },
        });

        contextActions.push({
          title: lang('FilterDelete'),
          icon: 'delete',
          destructive: true,
          handler: () => {
            openDeleteChatFolderModal({ folderId: id });
          },
        });
      }

      let emoticon: TeactNode;
      let textWithoutCustomEmoji = title.text;

      if (title.entities?.length === 1 && title.entities[0].type === ApiMessageEntityTypes.CustomEmoji) {
        emoticon = renderTextWithEntities({
          text: title.text,
          entities: title.entities,
          isSimple: true,
          emojiSize: 32,
        });
        if (Array.isArray(emoticon)) {
          emoticon = emoticon[0];
        }
        textWithoutCustomEmoji = textWithoutCustomEmoji.slice(2);
      } else {
        emoticon = <FolderIcon folderId={folder.id} emoticon={folder.emoticon} />;
      }

      return {
        id,
        title: renderTextWithEntities({
          text: textWithoutCustomEmoji,
          entities: [],
        }),
        badgeCount: folderCountersById[id]?.chatsCount,
        isBadgeActive: Boolean(folderCountersById[id]?.notificationsCount),
        emoticon,
        isBlocked,
        contextActions: contextActions?.length ? contextActions : undefined,
      } satisfies TabWithProperties;
    });
  }, [
    displayedFolders, maxFolders, folderCountersById, lang, chatFoldersById, maxChatLists, folderInvitesById,
    maxFolderInvites,
  ]);

  const handleSwitchTab = useLastCallback((index: number) => {
    setActiveChatFolder({ activeChatFolder: index }, { forceOnHeavyAnimation: true });
  });

  // Prevent `activeTab` pointing at non-existing folder after update
  useEffect(() => {
    if (!folderTabs?.length) {
      return;
    }

    if (activeChatFolder >= folderTabs.length) {
      setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX });
    }
  }, [activeChatFolder, folderTabs, setActiveChatFolder]);

  useEffect(() => {
    if (!IS_TOUCH_ENV || !folderTabs?.length || isForumPanelOpen || !transitionRef) {
      return undefined;
    }

    return captureEvents(transitionRef.current!, {
      selectorToPreventScroll: '.chat-list',
      onSwipe: ((e, direction) => {
        if (direction === SwipeDirection.Left) {
          setActiveChatFolder(
            { activeChatFolder: Math.min(activeChatFolder + 1, folderTabs.length - 1) },
            { forceOnHeavyAnimation: true },
          );
          return true;
        } else if (direction === SwipeDirection.Right) {
          setActiveChatFolder({ activeChatFolder: Math.max(0, activeChatFolder - 1) }, { forceOnHeavyAnimation: true });
          return true;
        }

        return false;
      }),
    });
  }, [transitionRef, activeChatFolder, folderTabs, isForumPanelOpen, setActiveChatFolder]);

  const isNotInFirstFolderRef = useRef();
  isNotInFirstFolderRef.current = !isInFirstFolder;
  useEffect(() => (isNotInFirstFolderRef.current ? captureEscKeyListener(() => {
    if (isNotInFirstFolderRef.current) {
      setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX });
    }
  }) : undefined), [activeChatFolder, setActiveChatFolder]);

  useHistoryBack({
    isActive: !isInFirstFolder,
    onBack: () => setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX }, { forceOnHeavyAnimation: true }),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code.startsWith('Digit') && folderTabs.length) {
        const [, digit] = e.code.match(/Digit(\d)/) || [];
        if (!digit) return;

        if (digit === SAVED_MESSAGES_HOTKEY) {
          openChat({ id: currentUserId, shouldReplaceHistory: true });
          return;
        }

        const folder = Number(digit) - 1;
        if (folder > folderTabs.length - 1) return;

        setActiveChatFolder({ activeChatFolder: folder }, { forceOnHeavyAnimation: true });
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentUserId, folderTabs, openChat, setActiveChatFolder]);

  const {
    ref: placeholderRef,
    shouldRender: shouldRenderPlaceholder,
  } = useShowTransition({
    isOpen: !orderedFolderIds,
    noMountTransition: true,
    withShouldRender: true,
  });

  const shouldRenderFolders = folderTabs && folderTabs.length > 1;

  return (
    <div
      ref={ref}
      className={buildClassName(
        'ChatFoldersTabs',
        shouldRenderFolders && shouldHideFolderTabs && 'ChatFoldersTabs--tabs-hidden',
        `ChatFoldersTabs--view-${foldersTabsView}`,
      )}
    >
      {shouldRenderFolders ? (
        <TabList
          className={buildClassName(
            `TabList--view-${foldersTabsView}`,
          )}
          contextRootElementSelector="#LeftColumn"
          tabs={folderTabs}
          activeTab={activeChatFolder}
          onSwitchTab={handleSwitchTab}
          tabHeight={foldersTabsView === 'left' ? 72 : undefined}
        />
      ) : shouldRenderPlaceholder ? (
        <div ref={placeholderRef} className="tabs-placeholder" />
      ) : undefined}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const {
      chatFolders: {
        byId: chatFoldersById,
        orderedIds: orderedFolderIds,
        invites: folderInvitesById,
      },
      currentUserId,
    } = global;
    const { activeChatFolder } = selectTabState(global);

    return {
      activeChatFolder,
      chatFoldersById,
      folderInvitesById,
      orderedFolderIds,
      currentUserId,
      maxFolders: selectCurrentLimit(global, 'dialogFilters'),
      maxFolderInvites: selectCurrentLimit(global, 'chatlistInvites'),
      maxChatLists: selectCurrentLimit(global, 'chatlistJoined'),
    };
  },
)(ChatFoldersTabs));
