/**
 * Keys and combinations that complete certain actions.
 */
const specialKeys = {
  /** Ctrl + C */
  exit: 3,
  /** Enter */
  return: 13,
  backspace: 127,
  newline: '\r\n',
};

/**
 * Common and reusable message types.
 */
const commonMessages = {
  prompt: '> ',
  newlinePrompt: `${specialKeys.newline}> `,
};

module.exports = { specialKeys, commonMessages };
