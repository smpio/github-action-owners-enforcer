import {expect, test} from '@jest/globals'
import {Owners} from '../src/owners'

test('empty file always fails', () => {
  const owners = Owners.parse('');
  expect(owners.isOwner('@me', 'a')).toBe(false);
});

test('asterisk matches everything', () => {
  const owners = Owners.parse('* @me');
  expect(owners.isOwner('@me', 'a')).toBe(true);
  expect(owners.isOwner('@me', 'a/b')).toBe(true);
  expect(owners.isOwner('@me', 'a/c.js')).toBe(true);
  expect(owners.isOwner('@you', 'a')).toBe(false);
  expect(owners.isOwner('@you', 'a/b')).toBe(false);
  expect(owners.isOwner('@you', 'a/c.js')).toBe(false);
});

test('file matching', () => {
  const owners = Owners.parse(`
    f1 @me
    f2 @you
  `);
  expect(owners.isOwner('@me', 'f1')).toBe(true);
  expect(owners.isOwner('@me', 'f2')).toBe(false);
  expect(owners.isOwner('@you', 'f1')).toBe(false);
  expect(owners.isOwner('@you', 'f2')).toBe(true);
});

test('dir matching', () => {
  const owners = Owners.parse(`
    mydir1/     @me
    mydir2/*    @me
    myfile      @me
    yourdir1/   @you
    yourdit2/*  @you
    yourfile    @you
  `);
  expect(owners.isOwner('@me', 'mydir1/f')).toBe(true);
  expect(owners.isOwner('@me', 'mydir2/f')).toBe(true);
  expect(owners.isOwner('@me', 'myfile/f')).toBe(false);
  expect(owners.isOwner('@me', 'yourdir1/f')).toBe(false);
  expect(owners.isOwner('@me', 'yourdit2/f')).toBe(false);
  expect(owners.isOwner('@me', 'yourfile/f')).toBe(false);
  expect(owners.isOwner('@you', 'mydir1/f')).toBe(false);
  expect(owners.isOwner('@you', 'mydir2/f')).toBe(false);
  expect(owners.isOwner('@you', 'myfile/f')).toBe(false);
  expect(owners.isOwner('@you', 'yourdir1/f')).toBe(true);
  expect(owners.isOwner('@you', 'yourdit2/f')).toBe(true);
  expect(owners.isOwner('@you', 'yourfile/f')).toBe(false);
});

test('globs', () => {
  const owners = Owners.parse(`
    *.js    @me
    d/*.js  @you
  `);

  expect(owners.isOwner('@me', '1.js')).toBe(true);
  expect(owners.isOwner('@me', 'd/1.js')).toBe(true);
  expect(owners.isOwner('@you', '1.js')).toBe(false);
  expect(owners.isOwner('@you', 'd/1.js')).toBe(true);

  expect(owners.isOwner('@me', '1.txt')).toBe(false);
  expect(owners.isOwner('@me', 'd/1.txt')).toBe(false);
  expect(owners.isOwner('@you', '1.txt')).toBe(false);
  expect(owners.isOwner('@you', 'd/1.txt')).toBe(false);
});

test('multiple owners per entry', () => {
  const owners = Owners.parse(`
    a @u1 @u2
  `);

  expect(owners.isOwner('@u1', 'a')).toBe(true);
  expect(owners.isOwner('@u2', 'a')).toBe(true);
  expect(owners.isOwner('@u3', 'a')).toBe(false);
});

test('empty owners entry does\'n break things', () => {
  const owners = Owners.parse(`
    a @u1
    b
  `);

  expect(owners.isOwner('@u1', 'a')).toBe(true);
  expect(owners.isOwner('@u1', 'b')).toBe(false);
});

test('empty lines and comments', () => {
  const owners = Owners.parse(`
    f1 @me

    # comment here

    f2 @you
  `);
  expect(owners.isOwner('@me', 'f1')).toBe(true);
  expect(owners.isOwner('@me', 'f2')).toBe(false);
  expect(owners.isOwner('@you', 'f1')).toBe(false);
  expect(owners.isOwner('@you', 'f2')).toBe(true);
  expect(owners.isOwner('comment', '#')).toBe(false);
});
