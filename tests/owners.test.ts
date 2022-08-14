import {Owners} from '../src/owners'
import {expect, test} from '@jest/globals'

test('empty file always fails', () => {
  const owners = Owners.parse('');
  expect(owners.isOwner('me', 'a')).toBe(false);
});
