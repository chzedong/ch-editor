import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_', 8);

const SafeIdLeadCharacter = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomCharacter() {
  return SafeIdLeadCharacter[Date.now() % SafeIdLeadCharacter.length];
}

// in query selector, should not starts with number.
export const genId = () => `${randomCharacter()}${nanoid()}`;
