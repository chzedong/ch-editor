import { genId } from '../utils/get-id';

export const createEmptyDoc = () => ({
  blocks: [
    {
      id: genId(),
      type: 'text',
      text: [{ insert: '' }]
    }
  ]
});
