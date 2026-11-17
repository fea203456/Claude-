import '@helpers/peerIdPolyfill';
import {AppMessagesManager} from '@appManagers/appMessagesManager';
import {AppUsersManager} from '@appManagers/appUsersManager';
import deferredPromise from '@helpers/cancellablePromise';
import {logger, LogTypes} from '@lib/logger';
import {TGMOD_SETTINGS_INIT, TgModSettings} from '@/mod/settings';

// TgMod ghost mode: with a switch on, the matching request never reaches the server,
// while the chat is still read on this side.

function stateManager(tgmod: Partial<TgModSettings>) {
  return {state: {settings: {tgmod: {...TGMOD_SETTINGS_INIT, ...tgmod}}}, getState: () => Promise.resolve({})};
}

function setupMessages(tgmod: Partial<TgModSettings>) {
  const manager = new AppMessagesManager();
  const invokeApi = vi.fn(() => deferredPromise<any>());
  const processLocalUpdate = vi.fn();
  Object.assign(manager as any, {
    log: logger('MESSAGES', LogTypes.None),
    apiManager: {invokeApi},
    apiUpdatesManager: {processLocalUpdate},
    appStateManager: stateManager(tgmod),
    appPeersManager: {
      isChannel: () => false,
      isMonoforum: () => false,
      getInputPeerById: (peerId: PeerId) => ({_: 'inputPeer', peerId}),
      getOutputPeer: (peerId: PeerId) => ({_: 'peer', peerId}),
      getPeerString: (peerId: PeerId) => '' + peerId
    },
    rootScope: {dispatchEvent: vi.fn()}
  });
  vi.spyOn(manager, 'getHistoryStorage').mockReturnValue({} as any);
  vi.spyOn(manager, 'getReadMaxIdIfUnread').mockReturnValue(1);
  vi.spyOn(manager, 'getMessageByPeer').mockReturnValue(undefined);
  return {manager, invokeApi, processLocalUpdate};
}

describe('TgMod ghost mode', () => {
  const peerId = (42 as UserId).toPeerId(false);

  test('read receipts are sent while ghost mode is off', () => {
    const {manager, invokeApi} = setupMessages({ghostRead: false});
    void manager.readHistory({peerId, maxId: 100, force: true});
    expect(invokeApi.mock.calls.map(([method]) => method)).toEqual(['messages.readHistory']);
  });

  test('read receipts stay on this side while it hides them', () => {
    const {manager, invokeApi, processLocalUpdate} = setupMessages({ghostRead: true});
    void manager.readHistory({peerId, maxId: 100, force: true});
    expect(invokeApi).not.toHaveBeenCalled();
    expect(processLocalUpdate).toHaveBeenCalledWith(expect.objectContaining({_: 'updateReadHistoryInbox'}));
  });

  test('typing is not sent while it hides typing', async() => {
    const {manager, invokeApi} = setupMessages({ghostTyping: true});
    await expect(manager.setTyping(peerId, {_: 'sendMessageTypingAction'})).resolves.toBe(false);
    expect(invokeApi).not.toHaveBeenCalled();
  });

  test('the online status is always sent as offline while it hides it', () => {
    const manager = new AppUsersManager();
    const invokeApiSingle = vi.fn(() => Promise.resolve(true));
    Object.assign(manager as any, {
      apiManager: {invokeApiSingle},
      appStateManager: stateManager({ghostOnline: true})
    });
    vi.spyOn(manager, 'getSelf').mockReturnValue(undefined);
    void manager.updateMyOnlineStatus(false);
    expect(invokeApiSingle).toHaveBeenCalledWith('account.updateStatus', {offline: true});
  });
});
