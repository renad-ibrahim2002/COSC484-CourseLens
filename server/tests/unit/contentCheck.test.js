const { checkText } = require('../../src/services/contentCheck');

describe('automatic content check', () => {
  test.each(['Dr. Smith marks harshly.', 'Prof Ahmed is great', 'Avoid his section if you can.', 'Professor [name] never replies'])(
    'flags instructor mentions: %s',
    (text) => {
      expect(checkText(text)).toMatchObject({ flagged: true, reason: 'names_instructor' });
    },
  );

  test('flags offensive language', () => {
    expect(checkText('Whoever designed this is an idiot')).toMatchObject({ flagged: true, reason: 'offensive' });
  });

  test.each([
    'The group project is the whole course; start the backend early.',
    'Weekly labs map onto the project. Doctoral-level difficulty, honestly.',
    '',
  ])('passes normal course feedback: %s', (text) => {
    expect(checkText(text).flagged).toBe(false);
  });
});
