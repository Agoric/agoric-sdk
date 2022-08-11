import { makeNotifierKit } from '@agoric/notifier';

export const getIssuerService = signSpendAction => {
  const suggestions = new Map();
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = () => updater.updateState([...suggestions.values()]);

  const deleteSuggestion = boardId => {
    assert(
      suggestions.has(boardId),
      `Tried to delete undefined issuer suggestion ${boardId}`,
    );
    suggestions.delete(boardId);
    broadcastUpdates();
  };

  const addSuggestion = (petname, boardId) => {
    suggestions.set(boardId, {
      boardId,
      petname,
      actions: {
        delete: () => deleteSuggestion(boardId),
        accept: async suggestedPetname => {
          const action = JSON.stringify({
            type: 'suggestIssuer',
            data: { boardId, petname: suggestedPetname },
          });
          try {
            await signSpendAction(action);
            deleteSuggestion(boardId);
          } catch (e) {
            console.error('Sign spend action failed', action);
          }
        },
      },
    });
    broadcastUpdates();
  };

  return {
    notifier,
    addSuggestion,
  };
};
